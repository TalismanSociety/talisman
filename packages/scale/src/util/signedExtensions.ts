import type { UnifiedMetadata } from "../papito"

const SIGNED_TRANSACTION_EXTENSION_VERSION = 0

export const getSignedExtensions = (metadata: UnifiedMetadata) =>
  metadata.extrinsic.extensionsByVersion[SIGNED_TRANSACTION_EXTENSION_VERSION] ?? []

export const hasSignedExtension = (metadata: UnifiedMetadata, identifier: string) =>
  getSignedExtensions(metadata).some((extension) => extension.identifier === identifier)
