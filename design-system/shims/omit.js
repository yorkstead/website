// Drops props a plain DOM element would reject (Next-only options the stand-ins ignore).
export function omit(props, keys) {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !keys.includes(key)));
}
