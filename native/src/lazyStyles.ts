/** A lazy style map must support enumeration as well as direct property access. */
export function lazyStyles<T extends object>(build: () => T, revision: () => number): T {
  let cache: T | undefined;
  let built = -1;
  const current = (): T => {
    const next = revision();
    if (cache === undefined || built !== next) {
      cache = build();
      built = next;
    }
    return cache;
  };
  return new Proxy({} as T, {
    get(_target, prop) { return Reflect.get(current(), prop); },
    ownKeys() { return Reflect.ownKeys(current()); },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(current(), prop);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
    has(_target, prop) { return Reflect.has(current(), prop); },
  });
}
