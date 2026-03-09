import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { createPublicClient, erc20Abi, fallback, http, zeroAddress } from "viem"
import type { Chain as ViemChain } from "viem/chains"
import { allEvmChains } from "./allEvmChains"
import { Decimal } from "./Decimal"
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

  const { data: evmBalance } = useQuery({
    queryKey: ["swap-evm-balance", networkId, address, tokenAddress],
    queryFn: async () => {
      if (!networkId || !address) return undefined

      const chain: ViemChain | undefined = Object.values(allEvmChains).find(
        (c) => c?.id === networkId
      )
      const rpcUrls = chain?.rpcUrls.default.http
      if (!chain || !rpcUrls?.length) return undefined

      const client = createPublicClient({
        transport: fallback(
          rpcUrls.map((rpc) => http(rpc, { retryCount: 0 })),
          { retryCount: 0 }
        ),
        chain,
        batch: { multicall: true },
      })

      // native token
      if (!tokenAddress || tokenAddress === zeroAddress) {
        const balance = await client.getBalance({ address: address as `0x${string}` })
        return Decimal.fromPlanck(balance, chain.nativeCurrency.decimals, {
          currency: chain.nativeCurrency.symbol,
        })
      }

      // erc20 token
      const calls = await client.multicall({
        contracts: [
          {
            abi: erc20Abi,
            functionName: "balanceOf",
            address: tokenAddress,
            args: [address as `0x${string}`],
          },
          {
            abi: erc20Abi,
            functionName: "symbol",
            address: tokenAddress,
          },
          {
            abi: erc20Abi,
            functionName: "decimals",
            address: tokenAddress,
          },
        ],
      })

      const [balanceCall, symbolCall, decimalsCall] = calls
      const symbol = symbolCall.status === "success" ? symbolCall.result : "Unknown"
      const decimals = decimalsCall.status === "success" ? decimalsCall.result : 18

      if (balanceCall.status === "failure") return undefined
      return Decimal.fromPlanck(balanceCall.result as bigint, decimals, { currency: symbol })
    },
    enabled: props?.type === "evm" && !!networkId && !!address,
    refetchInterval: 15_000,
  })

  return evmBalance
}
