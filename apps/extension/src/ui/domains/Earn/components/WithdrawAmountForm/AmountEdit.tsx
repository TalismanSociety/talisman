// import { AlertCircleIcon } from "@talismn/icons"
// import { tokensToPlanck } from "@talismn/util"
// import BigNumber from "bignumber.js"
// import { log } from "extension-shared"
// import debounce from "lodash-es/debounce"
// import { ChangeEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react"

// import { WithTooltip } from "@talisman/components/Tooltip"
// import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
// import { Fiat } from "@ui/domains/Asset/Fiat"
// import { Tokens } from "@ui/domains/Asset/Tokens"
// import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
// import { useSelectedCurrency } from "@ui/state"

// import { useWithdrawWizard } from "../../context/WithdrawWizardContext"
// import { useWithdrawFundsContext } from "../WithdrawFundsProvider"
// import { TokenPillButton } from "./TokenPillButton"

// const normalizeStringNumber = (value?: string | number | null, decimals = 18) => {
//   try {
//     // fixes the decimals and remove all leading/trailing zeros
//     // NOTE: BigNumber is used to correctly format the string for tiny numbers.
//     // `Number(0.000000123).toString()` becomes `1.23e-7`
//     // `BigNumber(0.000000123).toString(10)` becomes `0.000000123`
//     return value ? BigNumber(Number(value).toFixed(decimals)).toString(10) : ""
//   } catch (err) {
//     log.error("normalizeStringNumber", { value, decimals, err })
//     return ""
//   }
// }

// const TokenInput = () => {
//   const { set, remove } = useWithdrawWizard()
//   const {
//     token,
//     tokenId,
//     withdrawAmount,
//     maxAmount,
//     isEstimatingMaxAmount,
//     withdrawMax,
//     amount: _amount,
//   } = useWithdrawFundsContext()

//   const refTokensInput = useRef<HTMLInputElement>(null)
//   useInputAutoWidth(refTokensInput)

//   useEffect(() => {
//     if (withdrawMax && refTokensInput.current && typeof maxAmount?.tokens === "string") {
//       const expectedInputValue = maxAmount?.tokens ?? ""
//       if (refTokensInput.current.value !== expectedInputValue)
//         refTokensInput.current.value = expectedInputValue
//     }
//   }, [withdrawMax, maxAmount])

//   const defaultValue = useMemo(
//     () =>
//       normalizeStringNumber(
//         withdrawMax && maxAmount ? maxAmount.tokens : withdrawAmount?.tokens,
//         token?.decimals || 18,
//       ),
//     [token?.decimals, maxAmount, withdrawMax, withdrawAmount],
//   )

//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
//     debounce((e) => {
//       if (withdrawMax) set("withdrawMax", false)

//       const text = e.target.value ?? ""
//       const num = Number(text)

//       if (token && text.length && !isNaN(num)) {
//         const tokens = parseFloat(text)
//         set("amount", tokensToPlanck(tokens.toString(), token.decimals))
//       } else remove("amount")
//     }, 250),
//     [remove, withdrawMax, set, token],
//   )

//   if (!token) return null

//   return (
//     <div className="mx-auto flex max-w-lg flex-nowrap items-center justify-center gap-4">
//       <input
//         ref={refTokensInput}
//         type="text"
//         inputMode="decimal"
//         placeholder="0"
//         defaultValue={defaultValue}
//         readOnly
//         onChange={handleChange}
//         className="placeholder:text-grey-500 min-w-0 flex-1 text-ellipsis bg-transparent text-right text-xl font-bold text-white outline-none"
//         disabled={isEstimatingMaxAmount}
//       />
//       <TokenPillButton tokenId={tokenId} onClick={() => {}} />
//     </div>
//   )
// }

// const FiatInput = () => {
//   const { set, remove, withdrawMax } = useWithdrawWizard()
//   const { token, withdrawAmount, maxAmount, tokenRates, isEstimatingMaxAmount } =
//     useWithdrawFundsContext()

//   const refFiatInput = useRef<HTMLInputElement>(null)
//   useInputAutoWidth(refFiatInput)
//   const currency = useSelectedCurrency()

//   useEffect(() => {
//     if (withdrawMax && refFiatInput.current && typeof maxAmount?.fiat(currency) === "number") {
//       const expectedInputValue = maxAmount?.fiat(currency)?.toString() ?? ""
//       if (refFiatInput.current.value !== expectedInputValue)
//         refFiatInput.current.value = expectedInputValue
//     }
//   }, [withdrawMax, currency, maxAmount])

//   const defaultValue = useMemo(
//     () =>
//       normalizeStringNumber(
//         withdrawMax && maxAmount ? maxAmount.fiat(currency) : withdrawAmount?.fiat(currency),
//         2,
//       ),
//     [currency, maxAmount, withdrawMax, withdrawAmount],
//   )

//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
//     debounce((e) => {
//       if (withdrawMax) set("withdrawMax", false)

//       const text = e.target.value ?? ""
//       const num = Number(text)
//       const tokenRate = tokenRates?.[currency]

//       if (token && tokenRate && text.length && !isNaN(num)) {
//         const fiat = parseFloat(text)
//         const tokens = (fiat / tokenRate.price).toFixed(Math.ceil(token.decimals / 3))
//         set("amount", tokensToPlanck(tokens, token.decimals))
//       } else remove("amount")
//     }, 250),
//     [remove, withdrawMax, set, token, tokenRates],
//   )

//   if (!tokenRates) return null

//   return (
//     <div className="mx-auto flex max-w-[400px] flex-nowrap items-center justify-center gap-4">
//       <input
//         ref={refFiatInput}
//         type="text"
//         inputMode="decimal"
//         placeholder="0"
//         defaultValue={defaultValue}
//         readOnly
//         onChange={handleChange}
//         className="placeholder:text-grey-500 min-w-0 flex-1 text-ellipsis bg-transparent text-right text-xl font-bold text-white outline-none"
//         disabled={isEstimatingMaxAmount}
//       />
//       <div className="text-body flex shrink-0 flex-nowrap items-center gap-4 text-base">
//         <div className="shrink-0">
//           <span className="text-lg">{currencyConfig[currency].symbol}</span>
//         </div>
//         <div>{currency}</div>
//       </div>
//     </div>
//   )
// }

// const TokenDisplay = () => {
//   const { withdrawAmount, token } = useWithdrawFundsContext()

//   if (!token || !withdrawAmount) return null

//   return (
//     <div className="text-body-secondary max-w-[264px] truncate text-sm">
//       <Tokens
//         amount={withdrawAmount.tokens ?? "0"}
//         decimals={token.decimals}
//         symbol={token.symbol}
//         noCountUp
//       />
//     </div>
//   )
// }

// const FiatDisplay = () => {
//   const { withdrawAmount } = useWithdrawFundsContext()

//   if (!withdrawAmount) return null

//   return (
//     <div className="text-body-secondary max-w-[264px] truncate text-sm">
//       <Fiat amount={withdrawAmount} noCountUp />
//     </div>
//   )
// }

// export const WithdrawAmountErrorMessage = () => {
//   const { error } = useWithdrawFundsContext()

//   const getErrorMessage = (err: unknown): string => {
//     if (typeof err === "string") return err
//     if (err instanceof Error) return err.message
//     if (err && typeof err === "object" && "message" in err) {
//       return String(err.message)
//     }
//     // Fallback: try to stringify or return a default message
//     try {
//       return JSON.stringify(err)
//     } catch {
//       return "An error occurred"
//     }
//   }

//   return error ? (
//     <WithTooltip tooltip={getErrorMessage(error)}>
//       <div
//         className="text-alert-error flex items-center justify-center gap-2"
//         style={{
//           fontWeight: 400,
//           fontSize: "12px",
//           lineHeight: "140%",
//           letterSpacing: "0%",
//           verticalAlign: "middle",
//         }}
//       >
//         <AlertCircleIcon className="text-alert-error inline-block align-text-top text-sm" />
//         {getErrorMessage(error)}
//       </div>
//     </WithTooltip>
//   ) : null
// }

// export const AmountEdit = () => {
//   const { tokenRates, token } = useWithdrawFundsContext()
//   const [isTokenEdit] = useState(true)

//   return (
//     <div className="flex w-full grow flex-col items-center">
//       {!!token && (
//         <>
//           <div className="flex h-[8rem] w-full flex-col items-center justify-end text-xl font-bold">
//             {isTokenEdit ? <TokenInput /> : <FiatInput />}
//           </div>
//           {tokenRates && (
//             <div className="mt-4 flex max-w-full items-center justify-center gap-4">
//               {!isTokenEdit ? <TokenDisplay /> : <FiatDisplay />}
//             </div>
//           )}
//           {/* Error message moved to parent form for single source of truth */}
//         </>
//       )}
//     </div>
//   )
// }
