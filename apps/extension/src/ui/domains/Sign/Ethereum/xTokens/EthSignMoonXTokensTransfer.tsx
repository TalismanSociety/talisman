import { hexToU8a } from "@polkadot/util"
import { Address } from "@talismn/balances"
import { encodeAddressSs58, encodeAnyAddress } from "@talismn/crypto"
import { EvmAddress } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useCoinGeckoTokenRates } from "@ui/hooks/useCoingeckoTokenRates"
import { useEvmTokenInfo } from "@ui/hooks/useEvmTokenInfo"
import { useNetworkById, useNetworks, useToken, useTokens } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

type DecodedMultilocation = {
  paraId?: number
  address?: Address
}

type InteriorX0 = { type: "parachain"; paraId: number }
type InteriorX1 = { type: "account"; address: Address }
type Interior = InteriorX0 | InteriorX1

const decodeInterior = (interior: string): Interior => {
  const prelude = interior.slice(0, 4)
  const main = interior.slice(4)

  // data type is defined by the prelude
  // see https://docs.moonbeam.network/builders/interoperability/xcm/xc20/xtokens/#xtokens-precompile
  switch (prelude) {
    case "0x00": {
      // Parachain	bytes4
      return { type: "parachain" as const, paraId: parseInt(main, 16) }
    }
    case "0x01": {
      // AccountId32	bytes32
      const networkPrefixHex = main.slice(main.length - 2)
      const prefix = networkPrefixHex === "00" ? undefined : parseInt(networkPrefixHex, 16)
      const address = hexToU8a(main.slice(0, main.length - 2))
      return { type: "account" as const, address: encodeAddressSs58(address, prefix) }
    }
    default:
      throw new Error("Unimplemented prelude " + prelude)
  }
}

const decodeMultilocation = (multilocation?: {
  parents: number
  interior: string[]
}): DecodedMultilocation | undefined => {
  if (!multilocation) return undefined

  const result: DecodedMultilocation = {}

  for (const interior of multilocation?.interior ?? []) {
    const decoded = decodeInterior(interior)
    if (decoded.type === "parachain") result.paraId = decoded.paraId
    if (decoded.type === "account") result.address = decoded.address
  }

  return result
}

export const EthSignMoonXTokensTransfer: FC = () => {
  const { t } = useTranslation()
  const { network, decodedTx, account } = useEthSignKnownTransactionRequest()
  const substrateChain = useNetworkById(network?.substrateChainId, "polkadot")
  const tokens = useTokens()

  const [destination, amount, currencyAddress] = useMemo(
    () => [
      getContractCallArg<{ parents: number; interior: string[] }>(decodedTx, "destination"),
      getContractCallArg<bigint>(decodedTx, "amount"),
      getContractCallArg<EvmAddress>(decodedTx, "currency_address"),
    ],
    [decodedTx],
  )

  const erc20 = useEvmTokenInfo(network?.id, currencyAddress)
  const nativeToken = useToken(network?.nativeTokenId)

  const { decimals, symbol, coingeckoId, logo } = useMemo(() => {
    // native token on moonbeam is available as an ERC20 on this precompiled contract
    if (currencyAddress === "0x0000000000000000000000000000000000000802") {
      if (!nativeToken) return {}
      const { decimals, symbol, coingeckoId, logo } = nativeToken
      return { decimals, symbol, coingeckoId, logo }
    }

    const token = tokens.find(
      (t) =>
        t.type === "evm-erc20" &&
        t.networkId === network?.id &&
        t.contractAddress === currencyAddress,
    )

    if (token) {
      const { decimals, symbol, coingeckoId, logo } = token
      return { decimals, symbol, coingeckoId, image: logo }
    }

    if (erc20.token?.type === "evm-erc20") {
      const { decimals, symbol, coingeckoId, logo } = erc20.token || {}
      return { decimals, symbol, coingeckoId, logo }
    }

    const { decimals, symbol, logo } = erc20.token || {}
    return { decimals, symbol, logo }
  }, [currencyAddress, erc20.token, nativeToken, network?.id, tokens])

  const target = useMemo(() => decodeMultilocation(destination), [destination])

  const chains = useNetworks({ platform: "polkadot" })
  const targetChain = useMemo(() => {
    if (!target || !substrateChain) return undefined

    // assume paraId is on the same relay chain as substrateChain
    if (substrateChain.topology.type !== "parachain") return undefined
    const relayId = substrateChain.topology.relayId

    return target.paraId
      ? chains.find((c) => c.topology.type === "parachain" && c.topology.paraId === target.paraId)
      : chains.find((c) => c.id === relayId)
  }, [chains, substrateChain, target])

  const targetAddress = useMemo(
    () =>
      targetChain && target?.address
        ? encodeAnyAddress(target.address, { ss58Format: targetChain?.prefix })
        : undefined,
    [target, targetChain],
  )

  const { data: tokenRates } = useCoinGeckoTokenRates(coingeckoId)

  if (erc20.isLoading) return null

  if (
    amount === undefined ||
    !symbol ||
    decimals === undefined ||
    !network ||
    !account ||
    !targetChain ||
    !targetAddress
  )
    throw new Error("Missing parameter(s)")

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Transfer")}
      header={<SignViewIconHeader icon="transfer" />}
    >
      <SignViewXTokensTransfer
        value={amount}
        tokenDecimals={decimals}
        tokenSymbol={symbol}
        tokenLogo={logo}
        tokenRates={tokenRates}
        fromNetwork={network.id}
        fromAddress={account.address}
        toNetwork={targetChain?.id}
        toAddress={targetAddress}
      />
    </SignContainer>
  )
}
