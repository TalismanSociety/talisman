export const decodeMetadataRpc = (encoded: string) =>
  Buffer.from(encoded, "base64").toString("hex") as `0x${string}`
