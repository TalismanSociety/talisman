import { Keyring } from "@polkadot/keyring"
import { assert, hexToU8a, u8aConcat, u8aToU8a } from "@polkadot/util"
import { Chain } from "@talismn/chaindata-provider"
import { getMetadataRpcFromDef, log } from "extension-shared"

import { appStore } from "../../domains/app/store.app"
import { passwordStore } from "../../domains/app/store.password"
import { mnemonicsStore } from "../../domains/mnemonics/store"
import { SignerPayloadGenesisHash } from "../../domains/signing/types"
import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import {
  fetchMetadataDefFromChain,
  getChainAndGenesisHashFromIdOrHash,
  getLegacyMetadataRpc,
} from "../../util/getMetadataDef"
import { getRuntimeVersion } from "../../util/getRuntimeVersion"
import { $addNetworkSpecsPayload, $networkSpecs, $updateNetworkMetadataPayload } from "./codecs"

const getEncryptionForChain = (chain: Chain) => {
  // Ed25519=0, Sr25519=1, Ecdsa=2, ethereum=3
  switch (chain.account) {
    case "secp256k1":
      return 3
    default:
      return 1
  }
}

export const getVerifierMnemonic = async () => {
  const pw = await passwordStore.getPassword()
  assert(pw, "Unauthorised")

  const mnemonicId = await appStore.get("vaultVerifierCertificateMnemonicId")
  assert(mnemonicId !== undefined, "Verifier mnemonic not found")
  assert(mnemonicId !== null, "Talisman configured to not use verifier mnemonic")

  const { ok, val: mnemonic } = await mnemonicsStore.getMnemonic(mnemonicId, pw)
  if (!ok || !mnemonic) throw new Error("Failed to get verifier mnemonic", { cause: mnemonic })
  return mnemonic
}

const signWithVerifierCertMnemonic = async (unsigned: Uint8Array) => {
  try {
    const mnemonic = await getVerifierMnemonic()
    const keyring = new Keyring()
    const signingPair = keyring.createFromUri(mnemonic, {}, "sr25519")

    // For network specs, sign the specs (not the entire payload)
    const { type, publicKey } = signingPair
    return { type, publicKey, signature: signingPair.sign(unsigned) }
  } catch (error) {
    throw new Error("Failed to sign : " + (error as Error).message)
  }
}

/**
 * Useful resources :
 * https://paritytech.github.io/parity-signer/rustdocs/generate_message/index.html
 * https://github.com/varovainen/parity-signer/blob/2022-05-25-uos/docs/src/development/UOS.md
 */

export const generateQrAddNetworkSpecs = async (genesisHash: SignerPayloadGenesisHash) => {
  const chain = await chaindataProvider.chainByGenesisHash(genesisHash)
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
    // eslint-disable-next-line no-var
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
    undefined,
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
    // eslint-disable-next-line no-var
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
