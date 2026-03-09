import { useQuery } from "@tanstack/react-query"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useNetworkById } from "@ui/state/chaindata"
import { useMemo } from "react"
import { erc20Abi, zeroAddress } from "viem"
import type { UseSubstrateBalanceProps } from "./useSubstrateBalance"
import { useSubstrateBalance } from "./useSubstrateBalance"

type EvmProps = {
  type: "evm"
  networkId: number
  address: string
  tokenAddress?: `0x${string}`
}

export type UseFastBalanceProps = EvmProps | UseSubstrateBalanceProps

export const useFastBalance = (props?: UseFastBalanceProps) => {
  const substrateBalance = useSubstrateBalance(
    useMemo(() => (props?.type === "substrate" ? props : undefined), [props])
  )

  const evmBalance = useEvmBalance(props)

  return useMemo(() => {
    if (!props) return undefined
    if (props.type === "substrate") return { ...props, balance: substrateBalance }
    if (props.type === "evm")
      return {
        ...props,
        balance: evmBalance ? { transferable: evmBalance, stayAlive: evmBalance } : undefined,
      }
    return undefined
  }, [evmBalance, props, substrateBalance])
}

const useEvmBalance = (props?: UseFastBalanceProps) => {
  const networkId = props?.type === "evm" ? props.networkId : undefined
  const address = props?.type === "evm" ? props.address : undefined
  const tokenAddress = props?.type === "evm" ? props.tokenAddress : undefined

  const evmNetwork = useNetworkById(networkId?.toString(), "ethereum")

  const { data: evmBalance } = useQuery({
    queryKey: ["swap-evm-balance", networkId, address, tokenAddress],
    queryFn: async () => {
      if (!networkId || !address || !evmNetwork) return undefined

      // biome-ignore lint/suspicious/noExplicitAny: evmNetwork type mismatch between chaindata and extension
      const client = getExtensionPublicClient(evmNetwork as any)
      if (!client) return undefined

      // native token
      if (!tokenAddress || tokenAddress === zeroAddress) {
        return await client.getBalance({ address: address as `0x${string}` })
      }

      // erc20 token
      const [balanceCall] = await client.multicall({
        contracts: [
          {
            abi: erc20Abi,
            functionName: "balanceOf",
            address: tokenAddress,
            args: [address as `0x${string}`],
          },
        ],
      })

      if (balanceCall.status === "failure") return undefined
      return balanceCall.result as bigint
    },
    enabled: props?.type === "evm" && !!networkId && !!address && !!evmNetwork,
    refetchInterval: 15_000,
  })

  return evmBalance
}
