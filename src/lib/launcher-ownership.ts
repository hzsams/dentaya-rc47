/** Mounted launchers elect one owner; an existing follower takes over on unmount. */
export function createLauncherRegistry() {
  const mounted = new Set<string>();
  const listeners = new Set<() => void>();
  const owner = () => mounted.values().next().value ?? null;
  return {
    owner,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    register(id: string) {
      mounted.add(id); listeners.forEach(fn => fn());
      return () => { if (mounted.delete(id)) listeners.forEach(fn => fn()); };
    },
  };
}
export const launcherRegistry = createLauncherRegistry();
