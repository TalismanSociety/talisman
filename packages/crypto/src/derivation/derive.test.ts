import type { KeypairCurve } from "../types"
import { deriveKeypair } from "."
import { addressEncodingFromCurve, addressFromPublicKey } from "../address"
import { entropyToSeed, mnemonicToEntropy } from "../mnemonic"

const ETH_MNEMONIC = "test test test test test test test test test test test junk"
const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0"
const ETH_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

const POLKADOT_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk"
const POLKADOT_ALICE_DP = "//Alice"
const POLKADOT_ALICE_ADDRESS_SR25519 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const POLKADOT_ALICE_ADDRESS_ED25519 = "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu"
const POLKADOT_ALICE_ADDRESS_ECDSA = "5C7C2Z5sWbytvHpuLTvzKunnnRwQxft1jiqrLD5rhucQ5S9X"

const SOLANA_MNEMONIC = "test test test test test test test test test test test junk"
const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'"
const SOLANA_ADDRESS = "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96"

const checkDerivedAddress = async (
  mnemonic: string,
  derivationPath: string,
  curve: KeypairCurve,
  address: string,
) => {
  const entropy = mnemonicToEntropy(mnemonic)
  const seed = await entropyToSeed(entropy, curve)
  const secret = deriveKeypair(seed, derivationPath, curve)
  const format = addressEncodingFromCurve(curve)
  expect(address).toEqual(addressFromPublicKey(secret.publicKey, format))
}

describe("deriveKeyPair", () => {
  it("ethereum", () => {
    checkDerivedAddress(ETH_MNEMONIC, ETH_DERIVATION_PATH, "ethereum", ETH_ADDRESS)
  })

  it("sr25519", () => {
    checkDerivedAddress(
      POLKADOT_MNEMONIC,
      POLKADOT_ALICE_DP,
      "sr25519",
      POLKADOT_ALICE_ADDRESS_SR25519,
    )
  })

  it("ed25519", () => {
    checkDerivedAddress(
      POLKADOT_MNEMONIC,
      POLKADOT_ALICE_DP,
      "ed25519",
      POLKADOT_ALICE_ADDRESS_ED25519,
    )
  })

  it("ecdsa", () => {
    checkDerivedAddress(POLKADOT_MNEMONIC, POLKADOT_ALICE_DP, "ecdsa", POLKADOT_ALICE_ADDRESS_ECDSA)
  })

  it("solana", () => {
    checkDerivedAddress(SOLANA_MNEMONIC, SOLANA_DERIVATION_PATH, "solana", SOLANA_ADDRESS)
  })
})
