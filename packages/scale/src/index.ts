// TODO: Get the DX of this lib as close as possible to the DX of `const jsonResult = '{"someKey":"someValue"}'; JSON.decode(jsonResult)`

import { suppressPortableRegistryConsoleWarnings } from "./suppressPortableRegistryConsoleWarnings"

export * from "./capi"
export { transformMetadata as transformMetadataV14 } from "./capi/frame_metadata/raw/v14"
export * from "./util"

suppressPortableRegistryConsoleWarnings()
