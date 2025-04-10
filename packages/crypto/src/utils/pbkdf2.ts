export const pbkdf2 = async (
  hash: "SHA-256" | "SHA-512",
  entropy: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  outputLenBytes: number,
) => {
  // NOTE: react-native-quick-crypto (our `global.crypto` polyfill on Talisman Mobile) doesn't support `crypto.subtle.deriveKey`.
  // But, we can work around this by using `crypto.subtle.deriveBits` and `crypto.subtle.importKey`, which when used together
  // can provide the same functionality as `crypto.subtle.deriveKey`.
  const keyMaterial = await crypto.subtle.importKey("raw", entropy, "PBKDF2", false, ["deriveBits"])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash },
    keyMaterial,
    outputLenBytes * 8,
  )
  return new Uint8Array(derivedBits)
}
