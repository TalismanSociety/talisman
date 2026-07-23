export const bytesToBase64 = (data: ArrayBuffer | Uint8Array): string => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  // build the binary string one char at a time, spreading into String.fromCharCode
  // would blow the stack on large inputs
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export const base64ToBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export const bytesToBase64Url = (data: ArrayBuffer | Uint8Array): string =>
  bytesToBase64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

export const base64UrlToBytes = (base64Url: string): Uint8Array<ArrayBuffer> => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  return base64ToBytes(base64 + "=".repeat((4 - (base64.length % 4)) % 4))
}
