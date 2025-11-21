/** dot separated string e.g. `ens.eth` or `hello.lol` */
export const isPotentialEns = (name?: string) => typeof name === "string" && /^.+\..+$/.test(name)
