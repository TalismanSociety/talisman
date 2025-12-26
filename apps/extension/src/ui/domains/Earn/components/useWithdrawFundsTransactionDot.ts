// import { BALANCE_MODULES, BalanceTransferType } from "@talismn/balances"
// import { ChainConnectorDot } from "@talismn/chain-connectors"
// import { DotNetwork, isTokenDot, Token } from "@talismn/chaindata-provider"
// import { ScaleApi } from "@talismn/sapi"
// import { useQuery } from "@tanstack/react-query"
// import { SignerPayloadJSON } from "extension-core"
// import { useMemo, useState } from "react"

// import { api } from "@ui/api"
// import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
// import { useTip } from "@ui/hooks/useTip"
// import { useNetworkById, useToken, useTokens } from "@ui/state"

// import { useWithdrawWizard } from "../context/WithdrawWizardContext"
// import { useWithdrawTransaction } from "../hooks/useWithdrawTransaction"
// import { mapYieldTokenToTokenId } from "../utils/tokenMapping"

// // Helper functions (same as SendFunds, DepositFunds, and ClaimFunds)
// const usePayload = ({
//   sapi,
//   token,
//   network,
//   from,
//   to,
//   value = "0",
//   method,
//   tip,
//   isLocked,
// }: {
//   sapi: ScaleApi | null | undefined
//   token: Token | null | undefined
//   network: DotNetwork | null | undefined
//   from: string | undefined
//   to: string | undefined
//   value: string | undefined
//   method: BalanceTransferType
//   tip: string | undefined
//   isLocked: boolean
// }) => {
//   return useQuery({
//     queryKey: ["callData", token?.id, network?.id, from, to, value, sapi?.id, method, tip],
//     queryFn: async () => {
//       if (!token?.networkId || network?.platform !== "polkadot" || !from || !to || !sapi || !method)
//         return null

//       const mod = BALANCE_MODULES.find((mod) => mod.type === token.type)
//       if (mod?.platform !== "polkadot") throw new Error(`Unsupported module type: ${mod?.type}`)

//       const callData = await mod.getTransferCallData({
//         from,
//         to,
//         value,
//         token,
//         metadataRpc: sapi.chain.metadataRpc,
//         // ChainConnector is not available on front end.
//         // getTransferCallData only uses the send method so we can mimic it safely
//         connector: { send: api.subSend } as unknown as ChainConnectorDot,
//         type: method,
//         config: network.balancesConfig?.[mod.type],
//       })

//       const decodedCall = sapi.getDecodedCallFromPayload(callData)

//       return sapi.getExtrinsicPayload(decodedCall.pallet, decodedCall.method, decodedCall.args, {
//         address: from,
//         tip: tip?.length ? BigInt(tip) : 0n,
//       })
//     },
//     refetchInterval: false,
//     enabled: !isLocked,
//   })
// }

// const useEstimateFee = ({
//   sapi,
//   payload,
//   isLocked,
// }: {
//   sapi: ScaleApi | null | undefined
//   payload: SignerPayloadJSON | undefined
//   isLocked: boolean
// }) => {
//   return useQuery({
//     queryKey: ["estimateFee", sapi?.id, payload],
//     queryFn: async () => {
//       if (!sapi || !payload) return null

//       const fee = await sapi.getFeeEstimate(payload)

//       return { partialFee: fee.toString(), unsigned: payload }
//     },
//     refetchInterval: false,
//     enabled: !isLocked,
//   })
// }

// // Polkadot withdraw transaction hook - updated
// export const useWithdrawFundsTransactionDot = (
//   withdrawTransactionData: ReturnType<typeof useWithdrawTransaction>,
// ) => {
//   const [isLocked, _setIsLocked] = useState(false)
//   const { balance, account, tokenId } = useWithdrawWizard()
//   const tokens = useTokens()

//   // Get token ID from context first, fallback to balance mapping
//   const mappedTokenId = useMemo(() => {
//     if (tokenId) return tokenId
//     if (!balance?.token || !tokens) return ""
//     return (
//       mapYieldTokenToTokenId(
//         balance.token.address || balance.token.symbol,
//         balance.token.network,
//         tokens,
//       ) || ""
//     )
//   }, [tokenId, balance?.token, tokens])

//   const token = useToken(mappedTokenId)
//   const network = useNetworkById(token?.networkId, "polkadot")

//   // Use the transaction data passed from the selector hook
//   const {
//     allTransactions,
//     maxAmount: _yieldMaxAmount,
//     isLoading: isYieldLoading,
//     error: yieldError,
//   } = withdrawTransactionData

//   // Standard Polkadot fee calculation hooks (same as SendFunds, DepositFunds, and ClaimFunds)
//   const qTip = useTip(token?.networkId, !isLocked)
//   const qSapi = useScaleApi(token?.networkId)

//   // Use Yield API transaction data if available, otherwise create payload for fee estimation
//   const unsignedTransaction = useMemo(() => {
//     if (!allTransactions?.[0]?.unsignedTransaction || !account) return null

//     const tx = allTransactions[0]
//     let parsedPayload: SignerPayloadJSON | null = null

//     if (typeof tx.unsignedTransaction === "string") {
//       try {
//         parsedPayload = JSON.parse(tx.unsignedTransaction) as SignerPayloadJSON
//       } catch {
//         return null
//       }
//     } else {
//       // Type guard to ensure it's a SignerPayloadJSON-like object
//       const txData = tx.unsignedTransaction
//       if (txData && typeof txData === "object" && "address" in txData && "genesisHash" in txData) {
//         // Convert through unknown first to avoid type overlap issues
//         parsedPayload = txData as unknown as SignerPayloadJSON
//       } else {
//         return null
//       }
//     }

//     // Ensure address is set correctly for fee estimation
//     if (parsedPayload && (!parsedPayload.address || parsedPayload.address !== account)) {
//       parsedPayload = {
//         ...parsedPayload,
//         address: account,
//       }
//     }

//     return parsedPayload
//   }, [allTransactions, account])

//   // Create payload for fee estimation if no Yield API transaction
//   // Hooks must be called unconditionally, so we pass undefined values if needed
//   const qPayload = usePayload({
//     sapi: qSapi?.data,
//     token: token || undefined,
//     network: network || undefined,
//     from: account || undefined,
//     to: account || undefined, // For withdraw, we're moving funds back to the same account
//     value: "0", // For fee estimation, we don't need the actual amount
//     method: "keep-alive" as BalanceTransferType,
//     tip: qTip.data ?? "0",
//     isLocked,
//   })

//   // Estimate fee using standard Polkadot approach
//   const qEstimateFee = useEstimateFee({
//     sapi: qSapi?.data,
//     payload: unsignedTransaction || qPayload.data?.payload,
//     isLocked,
//   })

//   // Early returns after all hooks
//   if (!token || !network || !account) {
//     return null
//   }

//   if (!isTokenDot(token)) return null

//   return {
//     platform: "polkadot" as const,
//     tx: unsignedTransaction || qPayload.data?.payload,
//     txDetails: {
//       payload: unsignedTransaction || qPayload.data?.payload,
//       estimatedFee: qEstimateFee.data?.partialFee,
//     },
//     priority: null, // Polkadot doesn't use priority like Ethereum
//     gasSettingsByPriority: null, // Not applicable for Polkadot
//     setCustomSettings: () => {}, // Not applicable for Polkadot
//     setPriority: () => {}, // Not applicable for Polkadot
//     networkUsage: null, // Not applicable for Polkadot
//     isLoading:
//       isYieldLoading ||
//       qEstimateFee.isLoading ||
//       qPayload.isLoading ||
//       qSapi.isLoading ||
//       qTip.isLoading,
//     error: yieldError || qEstimateFee.error || qPayload.error || qSapi.error || qTip.error,
//     allTransactions: allTransactions,
//   }
// }
