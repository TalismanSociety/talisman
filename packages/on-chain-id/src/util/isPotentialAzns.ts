/** dot separated string with `azero` or `tzero` suffix e.g. `fontbois.tzero` or `talisman.tzero` */
export const isPotentialAzns = (name?: string) =>
  typeof name === "string" && /^.+\.[ta]zero$/.test(name)
