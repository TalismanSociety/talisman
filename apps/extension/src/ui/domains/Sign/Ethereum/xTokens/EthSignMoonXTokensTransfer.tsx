import { EvmAddress } from "@extension/core"
import { hexToU8a } from "@polkadot/util"
import { Address } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import useChains from "@ui/hooks/useChains"
import { useCoinGeckoTokenRates } from "@ui/hooks/useCoingeckoTokenRates"
import { useEvmTokenInfo } from "@ui/hooks/useEvmTokenInfo"
import useToken from "@ui/hooks/useToken"
import useTokens from "@ui/hooks/useTokens"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

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
      const networkPrefix = networkPrefixHex === "00" ? undefined : parseInt(networkPrefixHex, 16)
      const address = hexToU8a(main.slice(0, main.length - 2))
      return { type: "account" as const, address: encodeAnyAddress(address, networkPrefix) }
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
  const { t } = useTranslation("request")
  const { network, decodedTx, account } = useEthSignKnownTransactionRequest()
  const substrateChain = useChain(network?.substrateChain?.id)
  const { tokens } = useTokens({ activeOnly: false, includeTestnets: true })

  const [destination, amount, currencyAddress] = useMemo(
    () => [
      getContractCallArg<{ parents: number; interior: string[] }>(decodedTx, "destination"),
      getContractCallArg<bigint>(decodedTx, "amount"),
      getContractCallArg<EvmAddress>(decodedTx, "currency_address"),
    ],
    [decodedTx]
  )

  const erc20 = useEvmTokenInfo(network?.id, currencyAddress)
  const nativeToken = useToken(network?.nativeToken?.id)

  const { decimals, symbol, coingeckoId, image } = useMemo(() => {
    // native token on moonbeam is available as an ERC20 on this precompiled contract
    if (currencyAddress === "0x0000000000000000000000000000000000000802") {
      if (!nativeToken) return {}
      const { decimals, symbol, coingeckoId, logo } = nativeToken
      return { decimals, symbol, coingeckoId, image: logo }
    }

    const token = tokens.find(
      (t) =>
        t.type === "evm-erc20" &&
        t.evmNetwork?.id === network?.id &&
        t.contractAddress === currencyAddress
    )

    if (token) {
      const { decimals, symbol, coingeckoId, logo } = token
      return { decimals, symbol, coingeckoId, image: logo }
    }

    if (erc20.token?.type === "evm-erc20") {
      const { decimals, symbol, coingeckoId, image } = erc20.token || {}
      return { decimals, symbol, coingeckoId, image }
    }

    const { decimals, symbol, image } = erc20.token || {}
    return { decimals, symbol, image }
  }, [currencyAddress, erc20.token, nativeToken, network?.id, tokens])

  const target = useMemo(() => decodeMultilocation(destination), [destination])

  const { chains } = useChains({ activeOnly: false, includeTestnets: true })
  const targetChain = useMemo(
    () =>
      target
        ? target.paraId !== undefined // if no paraId, target is the relay chain
          ? chains.find(
              (c) => c.relay?.id === substrateChain?.relay?.id && c.paraId === target.paraId
            )
          : chains.find((c) => c.id === substrateChain?.relay?.id)
        : undefined,
    [chains, substrateChain?.relay?.id, target]
  )

  const targetAddress = useMemo(
    () =>
      targetChain && target?.address
        ? encodeAnyAddress(target.address, targetChain?.prefix ?? undefined)
        : undefined,
    [target, targetChain]
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
        tokenLogo={image}
        tokenRates={tokenRates}
        fromNetwork={network.id}
        fromAddress={account.address}
        toNetwork={targetChain?.id}
        toAddress={targetAddress}
      />
    </SignContainer>
  )
}
