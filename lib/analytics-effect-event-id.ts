/** Creates an effect-local id cache. Replays for one mounted view share an id;
 * a new component instance receives a new generator for the next visit. */
export function createEffectEventIdGenerator() {
  let previous: { key: string; eventId: string } | undefined;
  return (key: string) => {
    if (previous?.key !== key) previous = { key, eventId: crypto.randomUUID() };
    return previous.eventId;
  };
}
