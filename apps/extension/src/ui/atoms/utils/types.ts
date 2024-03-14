import { Atom } from "jotai"
import { AtomFamily } from "jotai/vanilla/utils/atomFamily"

// TODO fix this so V is properly inferred
export type KeyValueAtomFamily<
  Obj,
  Key = keyof Obj,
  Value = Key extends keyof Obj ? Obj[Key] : never
> = AtomFamily<Key, Atom<Value | Promise<Value>>>
