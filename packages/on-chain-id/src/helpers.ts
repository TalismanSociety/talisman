export const isPotentialEns = (name?: string) => typeof name === "string" && /^.+\..+$/.test(name)
