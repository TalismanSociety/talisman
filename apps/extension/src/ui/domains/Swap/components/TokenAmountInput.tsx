// import { AlertCircleIcon, ArrowUpDownIcon } from "@talismn/icons"
// import { planckToTokens } from "@talismn/util"
// import { useToken } from "@ui/state/chaindata"
// import { useSelectedCurrency } from "@ui/state/settings"
// import { type FC, useCallback, useEffect, useId, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
// import { useSwap } from "../SwapProvider"
// import { parseUserInputToPlanckOrUndefined } from "../swap-utils"
// import { SelectTokenButton } from "./SelectTokenButton"

// type Props = {
//   amount?: bigint
//   assetIds?: string[]
//   selectedTokenId?: string | null
//   onChangeAmount?: (value: bigint) => void
//   onChangeTokenId?: (tokenId: string | null) => void
//   availableBalance?: bigint
//   stayAliveBalance?: bigint
//   disabled?: boolean
//   usdOverride?: number
//   showFiat?: boolean
//   /** Used to determine which tokens should be prioritized to the top of the list */
//   priorityMode?: "buy" | "sell"
// }

// export const TokenAmountInput: FC<Props> = ({
//   amount,
//   assetIds,
//   availableBalance,
//   onChangeTokenId,
//   selectedTokenId,
//   onChangeAmount,
//   stayAliveBalance,
//   disabled = false,
//   usdOverride,
//   showFiat = true,
//   priorityMode,
// }) => {
//   const { t } = useTranslation()
//   const selectedToken = useToken(selectedTokenId ?? undefined)

//   const [input, setInput] = useState(
//     (amount ?? 0n) > 0n
//       ? (planckToTokens(amount!.toString(), selectedToken?.decimals ?? 0) ?? "")
//       : ""
//   )

//   // reset input when fromAddress changes
//   const { fromAddress } = useSwap()
//   // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
//   useEffect(() => {
//     onChangeAmount?.(0n)

//     // only re-run this effect when `fromAddress` changes
//   }, [fromAddress])

//   const currency = useSelectedCurrency()

//   const parseInput = useCallback(
//     (value: string): bigint => {
//       if (!selectedToken) return 0n
//       try {
//         const formattedInput = value.endsWith(".") ? `${value}0` : value
//         return parseUserInputToPlanckOrUndefined(formattedInput, selectedToken.decimals) ?? 0n
//       } catch {
//         return 0n
//       }
//     },
//     [selectedToken]
//   )

//   const handleChangeTokenId = useCallback(
//     (tokenId: string | null) => {
//       setInput("")
//       onChangeTokenId?.(tokenId)
//       onChangeAmount?.(0n)
//     },
//     [onChangeAmount, onChangeTokenId]
//   )

//   const handleChangeInput = useCallback(
//     (value: string) => {
//       setInput(value)
//       const parsedPlanck = parseInput(value)
//       onChangeAmount?.(parsedPlanck)
//     },
//     [onChangeAmount, parseInput]
//   )

//   const fiatValue = useFiatValueForAmount({ planck: amount, tokenId: selectedTokenId, usdOverride })

//   const insufficientBalance = useMemo(() => {
//     if (availableBalance === undefined || !amount) return false
//     return amount > (availableBalance ?? 0n)
//   }, [amount, availableBalance])

//   const accountWillBeReaped = useMemo(() => {
//     if (stayAliveBalance === undefined || !amount || amount === 0n) return false
//     return stayAliveBalance < amount
//   }, [amount, stayAliveBalance])

//   useEffect(() => {
//     if (amount == null) return setInput("")
//     const parsedPlanck = parseInput(input)
//     if (parsedPlanck !== amount) {
//       if (amount > 0n) {
//         setInput(planckToTokens(amount.toString(), selectedToken?.decimals ?? 0) ?? "0")
//       } else {
//         if (parsedPlanck !== 0n) {
//           setInput("")
//         }
//       }
//     }
//   }, [amount, input, parseInput, selectedToken?.decimals])

//   const inputId = useId()

//   return (
//     <div className="flex items-center gap-2">
//       <div className="shrink-0">
//         <SelectTokenButton
//           onSelectTokenId={handleChangeTokenId}
//           selectedTokenId={selectedTokenId}
//           assetIds={assetIds}
//           priorityMode={priorityMode}
//         />
//       </div>

//       <div className="flex flex-1 flex-col items-end overflow-hidden">
//         <input
//           type="text"
//           id={inputId}
//           autoComplete="off"
//           disabled={disabled}
//           className="w-full bg-transparent text-right font-semibold text-[20px] text-white placeholder-grey-400"
//           value={input}
//           placeholder="0"
//           onChange={(e) => handleChangeInput(e.target.value)}
//         />
//         {insufficientBalance ? (
//           <div className="flex items-center gap-[4px]">
//             <AlertCircleIcon className="h-[12px] w-[12px] shrink-0 text-alert-error" />
//             <span className="text-[11px] text-alert-error leading-none">
//               {t("Insufficient balance")}
//             </span>
//           </div>
//         ) : accountWillBeReaped ? (
//           <div className="flex items-center gap-[4px]">
//             <AlertCircleIcon className="h-[12px] w-[12px] shrink-0 text-alert-warn" />
//             <span className="text-[11px] text-alert-warn leading-none">
//               {t("Account will be reaped")}
//             </span>
//           </div>
//         ) : showFiat ? (
//           <div className="flex items-center gap-[4px]">
//             <div className="flex size-[16px] shrink-0 items-center justify-center rounded-full bg-white/5 backdrop-blur-[2px]">
//               <ArrowUpDownIcon className="size-[8px] text-body-secondary" />
//             </div>
//             <p className="text-[12px] text-body-secondary leading-none">
//               {(fiatValue ?? 0)?.toLocaleString(undefined, { currency, style: "currency" })}
//             </p>
//           </div>
//         ) : null}
//       </div>
//     </div>
//   )
// }
