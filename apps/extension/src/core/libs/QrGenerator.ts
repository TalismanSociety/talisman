import { AccountTypes } from "@core/domains/accounts/types"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { getMetadataDef, getMetadataRpcFromDef } from "@core/util/getMetadataDef"
import keyring from "@polkadot/ui-keyring"
import { assert, hexToU8a, u8aConcat, u8aToU8a } from "@polkadot/util"
import { SubNativeToken } from "@talismn/balances-substrate-native"
import * as $ from "scale-codec"

const signWithRoot = async (unsigned: Uint8Array) => {
  const rootAccount = keyring.getAccounts().find(({ meta }) => meta?.origin === AccountTypes.ROOT)
  assert(rootAccount, "Root account not found")

  // For network specs, sign the specs (not the entire payload)
  const signResult = await getPairForAddressSafely(rootAccount.address, (keypair) => {
    const type = keypair.type
    const publicKey = keypair.publicKey
    const signature = keypair.sign(unsigned)
    return { type, publicKey, signature }
  })

  if (!signResult.ok) throw new Error("Failed to sign : " + signResult.unwrap())

  return signResult.val
}

/**
 * Useful resources :
 * https://paritytech.github.io/parity-signer/rustdocs/generate_message/index.html
 * https://github.com/varovainen/parity-signer/blob/2022-05-25-uos/docs/src/development/UOS.md
 */

/**
 * Add Network Specs
 */
const $networkSpecs = $.object(
  $.field("base58prefix", $.u16),
  $.field("color", $.str),
  $.field("decimals", $.u8),
  $.field("encryption", $.u8), // Ed25519=0, Sr25519=1, Ecdsa=2, ethereum=3
  $.field("genesis_hash", $.sizedUint8Array(32)),
  $.field("logo", $.str),
  $.field("name", $.str),
  $.field("path_id", $.str),
  $.field("secondary_color", $.str),
  $.field("title", $.str),
  $.field("unit", $.str)
)
const $addNetworkSpecsPayload = $.object($.field("specs", $.uint8Array))

export const generateQrAddNetworkSpecs = async (genesisHash: string) => {
  const chain = await chaindataProvider.getChain({ genesisHash })
  assert(chain, "Chain not found")
  assert(chain.nativeToken?.id, "Chain native token not found")

  const token = (await chaindataProvider.getToken(chain?.nativeToken?.id)) as SubNativeToken
  assert(token, "Token not found")

  const specs = $networkSpecs.encode({
    base58prefix: chain.prefix ?? 42,
    decimals: token.decimals,
    encryption: 1, // TODO specify encryption based on what we need to sign
    genesis_hash: hexToU8a(genesisHash),
    name: chain.specName ?? chain.name ?? chain.id,
    unit: token.symbol,
    title: chain.name ?? chain.id,
    path_id: `//${(chain.name ?? chain.id)?.toLowerCase()}`,

    // below ones seem useless
    logo: "", // looks like we could pass a base64 encoded image here
    color: chain.themeColor ?? "#000000",
    secondary_color: "#000000",
  })

  const payload = u8aToU8a(
    $addNetworkSpecsPayload.encode({
      specs,
    })
  )

  const { publicKey, signature } = await signWithRoot(specs)

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
const $updateNetworkMetadataPayload = $.object(
  $.field("meta", $.uint8Array),
  $.field("genesis_hash", $.sizedUint8Array(32))
)

export const generateQrUpdateNetworkMetadata = async (genesisHash: string, specVersion: number) => {
  const metadataDef = await getMetadataDef(genesisHash, specVersion)
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  assert(metadataRpc, "Failed to fetch metadata")

  const payload = $updateNetworkMetadataPayload.encode({
    meta: hexToU8a(metadataRpc),
    genesis_hash: hexToU8a(genesisHash),
  })

  const { publicKey, signature } = await signWithRoot(payload)

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
