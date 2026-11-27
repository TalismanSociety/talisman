import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

export const fixtureHex = (name: string) =>
  `0x${gunzipSync(readFileSync(path.join(import.meta.dirname, name))).toString("hex")}` as const
