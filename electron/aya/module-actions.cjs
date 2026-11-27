'use strict';

const workflows = require('./module-workflows.json');
const AYA_NEW_APPOINTMENT_DRAFT = 'new-appointment-draft';
const AYA_MODULE_ACTION_IDS = Object.freeze(['workspace', 'design', ...Object.keys(workflows), AYA_NEW_APPOINTMENT_DRAFT]);
const allowed = new Set(AYA_MODULE_ACTION_IDS);
const prefix = '[[AYA_OPEN_MODULE:';
const actionLine = /^\[\[AYA_OPEN_MODULE:([a-z][a-z0-9-]*)\]\]$/;

function isAyaModuleActionId(value) {
    return typeof value === 'string' && allowed.has(value);
}

function allowsAyaModuleActions(input) {
    return input?.allowModuleActions === true && input.agent !== true && input.task === undefined && !input.cadContext;
}

function parseModuleActionReply(output) {
    if (!output.includes(prefix)) return { output };
    const lines = output.trimEnd().split(/\r?\n/);
    const taggedLines = lines.filter(line => line.trimStart().startsWith(prefix));
    if (!taggedLines.length) return { output };

    const destination = actionLine.exec(lines.at(-1))?.[1];
    const visible = lines.filter(line => !line.trimStart().startsWith(prefix)).join('\n').trimEnd();
    if (visible.trim() && taggedLines.length === 1 && isAyaModuleActionId(destination)) {
        return { output: visible, openModuleId: destination };
    }
    return { output: visible };
}

function moduleActionStreamText(output) {
    const boundary = output.lastIndexOf('\n');
    const line = output.slice(boundary + 1).trimStart();
    if (line && (line.startsWith(prefix) || prefix.startsWith(line))) {
        return parseModuleActionReply(output.slice(0, Math.max(0, boundary))).output.trimEnd();
    }
    return parseModuleActionReply(output).output;
}

module.exports = { AYA_MODULE_ACTION_IDS, AYA_NEW_APPOINTMENT_DRAFT, isAyaModuleActionId, allowsAyaModuleActions, parseModuleActionReply, moduleActionStreamText };
