import { log } from "@common/log"
import type { DotNetwork } from "@talismn/chaindata-provider"
import {
  entropyToSeed,
  getPublicKeyFromSecret,
  mnemonicToEntropy,
  signSubstrate,
} from "@talismn/crypto"
import { assert, hexToU8a, u8aConcat, u8aToU8a } from "@talismn/util"

import { appStore } from "../../domains/app/store.app"
import { passwordStore } from "../../domains/app/store.password"
import { keyringStore } from "../../domains/keyring/store"
import { getMetadataRpcFromDef } from "../../domains/metadata/helpers"
import type { SignerPayloadGenesisHash } from "../../domains/signing/types"
import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import {
  fetchMetadataDefFromChain,
  getChainAndGenesisHashFromIdOrHash,
  getLegacyMetadataRpc,
} from "../../util/getMetadataDef"
import { getRuntimeVersion } from "../../util/getRuntimeVersion"
import { $addNetworkSpecsPayload, $networkSpecs, $updateNetworkMetadataPayload } from "./codecs"

const getEncryptionForChain = (chain: DotNetwork) => {
  // Ed25519=0, Sr25519=1, Ecdsa=2, ethereum=3
  switch (chain.account) {
    case "secp256k1":
      return 3
    default:
      return 1
  }
}

const getVerifierMnemonic = async () => {
  const pw = await passwordStore.getPassword()
  assert(pw, "Unauthorised")

  const mnemonicId = await appStore.get("vaultVerifierCertificateMnemonicId")
  assert(mnemonicId !== undefined, "Verifier mnemonic not found")
  assert(mnemonicId !== null, "Talisman configured to not use verifier mnemonic")

  return keyringStore.getMnemonicText(mnemonicId, pw)
}

const signWithVerifierCertMnemonic = async (unsigned: Uint8Array) => {
  try {
    const mnemonic = await getVerifierMnemonic()

    // same key as pjs keyring.createFromUri(mnemonic, {}, "sr25519"): substrate-bip39 mini secret, no derivation
    const seed = await entropyToSeed(mnemonicToEntropy(mnemonic), "sr25519")
    const { secretFromSeed } = await import("@scure/sr25519")
    const secretKey = secretFromSeed(seed)
    const publicKey = getPublicKeyFromSecret(secretKey, "sr25519")

    // For network specs, sign the specs (not the entire payload)
    return {
      type: "sr25519" as const,
      publicKey,
      signature: signSubstrate("sr25519", secretKey, unsigned),
    }
  } catch (error) {
    throw new Error(`Failed to sign : ${(error as Error).message}`)
  }
}

/**
 * Useful resources :
 * https://paritytech.github.io/parity-signer/rustdocs/generate_message/index.html
 * https://github.com/varovainen/parity-signer/blob/2022-05-25-uos/docs/src/development/UOS.md
 */

export const generateQrAddNetworkSpecs = async (genesisHash: SignerPayloadGenesisHash) => {
  const chain = await chaindataProvider.getNetworkByGenesisHash(genesisHash)
  assert(chain, "Chain not found")

  const systemProperties = await chainConnector.send(chain.id, "system_properties", [])

  const decimals = Array.isArray(systemProperties?.tokenDecimals)
    ? systemProperties?.tokenDecimals[0]
    : systemProperties?.tokenDecimals
  const unit = Array.isArray(systemProperties?.tokenSymbol)
    ? systemProperties?.tokenSymbol[0]
    : systemProperties?.tokenSymbol

  const specs = $networkSpecs.enc({
    base58prefix: chain.prefix ?? 42,
    decimals,
    encryption: getEncryptionForChain(chain),
    genesis_hash: hexToU8a(genesisHash),
    name: chain.specName ?? chain.name ?? chain.id,
    unit,
    title: chain.name ?? chain.id,
    path_id: `//${(chain.name ?? chain.id)?.toLowerCase()}`,
    // TODO logo should match one of the resources defined in https://github.com/paritytech/parity-signer/tree/master/ios/PolkadotVault/Resources/ChainIcons.xcassets
    // We may need an additional property in chaindata to control this
    logo: chain.specName ?? "logo",
    color: chain.themeColor ?? "#000000",
    secondary_color: "#000000",
  })

  const payload = u8aToU8a(
    $addNetworkSpecsPayload.enc({
      specs,
    })
  )

  try {
    // biome-ignore lint/correctness/noInnerDeclarations: legacy
    var { publicKey, signature } = await signWithVerifierCertMnemonic(specs)
  } catch (e) {
    log.error("Failed to sign network specs", e)
    throw new Error("Failed to sign network specs")
  }

  return u8aToU8a(
    u8aConcat(
      new Uint8Array([0x53]), // 53 = update
      // our root account signs using sr25519
      new Uint8Array([0x01]), // 0x00 Ed25519, 0x01 Sr25519, 0x02 Ecdsa, 0xff unsigned
      new Uint8Array([0xc1]), // c1 = add_specs
      publicKey,
      payload,
      signature
    )
  )
}

/**
 * Network Metadata
 */

export const generateQrUpdateNetworkMetadata = async (
  chainIdOrHash: string,
  specVersion?: number
) => {
  const [chain, genesisHash] = await getChainAndGenesisHashFromIdOrHash(chainIdOrHash)
  if (!chain) return

  const { specVersion: runtimeSpecVersion } = await getRuntimeVersion(chain.id)
  assert(!specVersion || specVersion === runtimeSpecVersion, "specVersion mismatch")

  const metadataDef = await fetchMetadataDefFromChain(
    chain,
    genesisHash,
    runtimeSpecVersion,
    getLegacyMetadataRpc
  )
  assert(metadataDef, "Failed to fetch metadata")

  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  assert(metadataRpc, "Failed to fetch metadata")

  const payload = $updateNetworkMetadataPayload.enc({
    meta: hexToU8a(metadataRpc),
    genesis_hash: hexToU8a(genesisHash),
  })
  try {
    // biome-ignore lint/correctness/noInnerDeclarations: legacy
    var { publicKey, signature } = await signWithVerifierCertMnemonic(payload)
  } catch (e) {
    log.error("Failed to sign network metadata", e)
    throw new Error("Failed to sign network metadata")
  }

  return u8aToU8a(
    u8aConcat(
      new Uint8Array([0x53]), // 0x53 = update
      // our root account signs using sr25519
      new Uint8Array([0x01]), // 0x00 Ed25519, 0x01 Sr25519, 0x02 Ecdsa, 0xff unsigned
      new Uint8Array([0x80]), // 0x80 = load_metadata
      publicKey,
      payload,
      signature
    )
  )
}
