import { Keypair } from "@solana/web3.js"
import { getPublicKeyFromSecret } from "@talismn/crypto"

export const getKeypair = (secretKey: Uint8Array): Keypair => {
  const publicKey = getPublicKeyFromSecret(secretKey, "solana")
  const fullScretKey = new Uint8Array([...secretKey, ...publicKey])
  return Keypair.fromSecretKey(fullScretKey)
}
