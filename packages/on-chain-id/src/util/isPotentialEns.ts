import { isPotentialAzns } from "./isPotentialAzns"

/** dot separated string e.g. `ens.eth` or `hello.lol`, but not ending with `.azero` nor `.tzero` */
export const isPotentialEns = (name?: string) =>
  typeof name === "string" && /^.+\..+$/.test(name) && !isPotentialAzns(name)
