import assert from 'node:assert/strict';
import {spawn, execFile} from 'node:child_process';
import * as fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';

const exec = promisify(execFile);

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const {port} = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

export function desktopSmokeEnvironment(profile, source = process.env) {
  const env = {...source, APPDATA: path.join(profile, 'appdata'), LOCALAPPDATA: path.join(profile, 'localappdata')};
  for (const key of Object.keys(env)) {
    if (/^(ELECTRON_RUN_AS_NODE|DENTAYA_URL|AYA_.*|OLLAMA_.*)$/i.test(key)) delete env[key];
  }
  return env;
}

export class CdpClient {
  constructor(socket, timeoutMs = 15000) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.nextId = 0;
    this.pending = new Map();
    this.exceptions = [];
    this.documents = [];
    socket.addEventListener('message', event => {
      let message;
      try {message = JSON.parse(String(event.data));} catch {return;}
      if (message.method === 'Runtime.exceptionThrown') {
        const detail = message.params?.exceptionDetails;
        this.exceptions.push(detail?.exception?.description || detail?.text || 'Renderer exception');
      }
      if (message.method === 'Network.responseReceived' && message.params?.type === 'Document') {
        const {response, loaderId} = message.params;
        this.documents.push({url: response.url, status: response.status, loaderId});
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`CDP ${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result || {});
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {clearTimeout(pending.timer); pending.reject(new Error('Desktop debugging connection closed.'));}
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {socket.close(); reject(new Error('Desktop debugging connection timed out.'));}, 15000);
      socket.addEventListener('open', () => {clearTimeout(timer); resolve();}, {once: true});
      socket.addEventListener('error', () => {clearTimeout(timer); reject(new Error('Desktop debugging connection failed.'));}, {once: true});
    });
    return new CdpClient(socket);
  }

  call(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {this.pending.delete(id); reject(new Error(`CDP ${method} timed out.`));}, this.timeoutMs);
      this.pending.set(id, {resolve, reject, timer, method});
      this.socket.send(JSON.stringify({id, method, params}));
    });
  }

  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }

  close() {this.socket.close();}
}

export function validateRouteSnapshot(route, snapshot) {
  assert.equal(snapshot.origin, 'http://127.0.0.1:3210', `${route}: packaged loopback origin`);
  assert.equal(snapshot.ready, 'complete', `${route}: document completed loading`);
  assert.equal(snapshot.bridge, true, `${route}: real preload bridge exists`);
  assert.equal(snapshot.hasNode, false, `${route}: Node.js remains isolated from the renderer`);
  assert.equal(snapshot.hasAuthSession, false, `${route}: no account session was injected`);
  assert.equal(snapshot.bodyLength > 80, true, `${route}: rendered application content exists`);
  assert.equal(snapshot.loading, false, `${route}: loading overlay has finished`);
  if (route === '/workspace') {
    assert.equal(snapshot.pathname, route);
    assert.equal(snapshot.hasCadLink && snapshot.hasAyaLink, true, 'Guest workspace exposes CAD and AYA');
  } else if (route === '/ai') {
    assert.equal(snapshot.pathname, route);
    assert.equal(snapshot.hasAyaComposer, true, 'Guest can access the local AYA composer');
  } else if (route === '/settings') {
    assert.equal(snapshot.pathname, route, 'Guest settings remains accessible without an account');
    assert.equal(snapshot.hasSettingsContent, true, 'Guest local settings rendered its controls');
  } else throw new Error(`Unsupported smoke route: ${route}`);
}

const snapshotExpression = `(() => ({
  origin: location.origin, pathname: location.pathname, ready: document.readyState,
  bridge: typeof window.dentayaDesktop?.localAyaStatus === 'function' && typeof window.dentayaDesktop?.localAyaChat === 'function',
  hasNode: typeof window.require !== 'undefined' || typeof window.process !== 'undefined',
  hasAuthSession: Object.keys(localStorage).some(key => /^sb-.*-auth-token$/.test(key) && localStorage.getItem(key) && localStorage.getItem(key) !== 'null'),
  bodyLength: document.body?.innerText.trim().length || 0,
  loading: !!document.querySelector('[data-loading-reading], [data-loading-pending="true"], .dy-loading-surface'),
  hasCadLink: !!document.querySelector('.desktop-content a[href="/design"]'),
  hasAyaLink: !!document.querySelector('.desktop-content a[href="/ai"]'),
  hasAyaComposer: !!document.querySelector('#aya-local-message'),
  hasSettingsContent: document.querySelectorAll('.guest-local-settings [role="tab"]').length === 4 && !!document.querySelector('.guest-local-settings [role="tabpanel"]')
}))()`;

export async function smokeWindowsDesktop({executable, platform = process.platform, timeoutMs = 150000} = {}) {
  assert.equal(platform, 'win32', 'Packaged desktop smoke must run on Windows.');
  assert.equal(typeof WebSocket, 'function', 'Node.js 24 built-in WebSocket is required.');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'dentaya-desktop-smoke-'));
  const userData = path.join(profile, 'user-data');
  await fs.mkdir(userData);
  const debuggingPort = await freePort();
  // The packaged app uses a fixed loopback port. Reject an unrelated listener.
  const probe = net.createServer();
  await new Promise((resolve, reject) => {probe.once('error', reject); probe.listen(3210, '127.0.0.1', resolve);});
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(executable, [`--remote-debugging-port=${debuggingPort}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${userData}`, '--no-first-run'], {
    cwd: path.dirname(executable), env: desktopSmokeEnvironment(profile), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let client, processError, processExit, logTail = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {logTail = (logTail + data).slice(-12000);});
  child.once('error', error => {processError = error;});
  child.once('exit', (code, signal) => {processExit = {code, signal};});
  const deadline = Date.now() + timeoutMs;
  try {
    let target;
    while (Date.now() < deadline) {
      if (processError) throw processError;
      if (processExit) throw new Error(`Packaged desktop exited before ready: ${JSON.stringify(processExit)} ${logTail}`);
      try {
        const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`, {signal: AbortSignal.timeout(1500)});
        const targets = await response.json();
        target = targets.find(item => item.type === 'page' && item.url.startsWith('http://127.0.0.1:3210/'));
        if (target?.webSocketDebuggerUrl) break;
      } catch { /* Electron and its packaged server are still starting. */ }
      await delay(250);
    }
    assert.ok(target?.webSocketDebuggerUrl, `Packaged Electron did not expose its application page. ${logTail}`);
    client = await CdpClient.connect(target.webSocketDebuggerUrl);
    await client.call('Page.enable');
    await client.call('Runtime.enable');
    await client.call('Network.enable');
    const routes = [];
    for (const route of ['/workspace', '/ai', '/settings']) {
      client.documents = [];
      const navigation = await client.call('Page.navigate', {url: `http://127.0.0.1:3210${route}`});
      assert.equal(navigation.errorText, undefined, `${route}: navigation succeeds`);
      let snapshot, validationError;
      const routeDeadline = Math.min(deadline, Date.now() + 45000);
      while (Date.now() < routeDeadline) {
        try {
          assert.ok(client.documents.some(item => item.loaderId === navigation.loaderId && new URL(item.url).pathname === route && item.status === 200), `${route}: packaged server returned the requested document`);
          snapshot = await client.evaluate(snapshotExpression);
          validateRouteSnapshot(route, snapshot);
          validationError = null;
          break;
        }
        catch (error) {validationError = error;}
        await delay(250);
      }
      if (validationError) throw validationError;
      assert.ok(snapshot, `${route}: application route became ready`);
      const ipc = await client.evaluate(`window.dentayaDesktop.localAyaStatus().then(value => ({received: !!value && typeof value.ok === 'boolean' && Array.isArray(value.models), managedInstalled: value?.managed?.installed === true, modelCount: value?.models?.length, error: typeof value?.error === 'string' ? value.error : null}))`);
      assert.equal(ipc?.received, true, `${route}: real main-process IPC answered`);
      assert.equal(ipc.managedInstalled, false, `${route}: fresh profile has no bundled model runtime`);
      assert.equal(ipc.modelCount, 0, `${route}: fresh smoke does not claim model inference`);
      routes.push({requested: route, final: snapshot.pathname, documentReady: true, bridge: true, ipc: true, unauthenticated: true});
    }
    assert.deepEqual(client.exceptions, [], 'Packaged renderer has no uncaught JavaScript exceptions.');
    // The main process explicitly honors --user-data-dir; its server writes here.
    await fs.stat(path.join(userData, 'dentaya-server.log'));
    return {schemaVersion: 1, pass: true, platform: 'win32', freshProfile: true, packagedServer: true, bridgeIpc: true, modelInferenceTested: false, routes, rendererExceptions: 0};
  } finally {
    client?.close();
    if (child.pid && !processExit) {
      await exec('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {windowsHide: true, shell: false, timeout: 15000}).catch(() => child.kill());
    }
    await fs.rm(profile, {recursive: true, force: true, maxRetries: 6, retryDelay: 500});
  }
}
