// TODO: Get the DX of this lib as close as possible to the DX of `const jsonResult = '{"someKey":"someValue"}'; JSON.decode(jsonResult)`

import { suppressPortableRegistryConsoleWarnings } from "./suppressPortableRegistryConsoleWarnings"

export * from "./capi"
export * from "./metadata"
export * from "./storage"

suppressPortableRegistryConsoleWarnings()
