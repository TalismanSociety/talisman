import type { TokenId } from "@talismn/chaindata-provider"
import { cn } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useToken } from "@ui/state"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"
import { useTaoDashboardSubnetPickerModal } from "../TaoDashboardSubnetPickerModal"

export const SwapBuyOutput: FC<{
  tokenId: TokenId
  value: bigint | null
}> = ({ tokenId, value }) => {
  const token = useToken(tokenId)

  // const handleMaxClick = useCallback(() => {
  //   if (maxValue !== undefined) {
  //     onValueChange(maxValue)
  //   }
  // }, [maxValue, onValueChange])

  if (!token) return null

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
      <div className="flex h-20 w-full items-center justify-between gap-6 overflow-hidden text-[2rem]">
        <TokensAndFiat
          noFiat
          noCountUp
          tokenId={tokenId}
          planck={value ?? 0n}
          className={cn(value === null && "text-body-disabled")}
        />
        <TokenDisplay tokenId={tokenId} />
      </div>
    </div>
  )
}

const TokenDisplay: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId, "substrate-dtao")
  const { open } = useTaoDashboardSubnetPickerModal()

  const handleClick = useCallback(() => {
    if (!token) return
    open({ netuid: token.netuid })
  }, [token, open])

  if (!token) return null

  return (
    <PillButton onClick={handleClick} className="">
      <div className="flex items-center gap-4">
        <TokenLogo className="text-xl" tokenId={tokenId} />
        <div className="flex flex-col items-start gap-1">
          <div className="text-body">SN{token.netuid}</div>
          <div className="text-body-secondary text-xs">
            {token.subnetName ?? t("Subnet {{netuid}}", { netuid: token.netuid })}
          </div>
        </div>
      </div>
    </PillButton>
  )
}

// const BalanceDisplay: FC<{ tokenId: TokenId; address: string }> = ({ tokenId, address }) => {
//   const { t } = useTranslation()
//   const balance = useBalance(address, tokenId)

//   const isInitializing = useIsBalanceInitializing()
//   const isLoading = useMemo(
//     () => isInitializing || balance?.status !== "live",
//     [balance, isInitializing]
//   )

//   return (
//     <div className={cn("text-body-secondary text-sm", isLoading && "animate-pulse")}>
//       {t("Bal:")}{" "}
//       <TokensAndFiat
//         planck={balance?.transferable.planck ?? 0n}
//         tokenId={tokenId}
//         noCountUp
//         noFiat
//       />
//     </div>
//   )
// }

// const MaxButton: FC<{
//   tokenId: TokenId
//   maxAmount?: bigint
//   onClick: () => void
// }> = ({ maxAmount, onClick }) => {
//   const { t } = useTranslation()
//   if (maxAmount === undefined) return null

//   return (
//     <button
//       type="button"
//       disabled={!maxAmount}
//       className="rounded-full bg-grey-800 px-3 py-1.5 text-body-secondary text-sm hover:bg-grey-700"
//       onClick={onClick}
//     >
//       {t("Max")}
//     </button>
//   )
// }

// const TokenInput: FC<{
//   token: Token
//   value: bigint | null
//   onValueChanged: (value: bigint | null) => void
// }> = ({ token, value, onValueChanged }) => {
//   const { t } = useTranslation()
//   const formatter = useMemo(
//     () => (value !== null ? new BalanceFormatter(value, token.decimals) : null),
//     [token.decimals, value]
//   )

//   const formattedValue = useMemo(() => formatter?.tokens ?? "", [formatter?.tokens])

//   const [inputValue, setInputValue] = useState(formattedValue)

//   useEffect(() => {
//     setInputValue(formattedValue)
//   }, [formattedValue])

//   const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
//     (e) => {
//       // refSkipSync.current = true
//       const nextValue = e.target.value
//       setInputValue(nextValue)

//       if (!token || !nextValue.trim()) return onValueChanged(null)

//       try {
//         const plancks = tokensToPlanck(nextValue, token.decimals)
//         onValueChanged(BigInt(plancks))
//       } catch {
//         // invalid input, ignore
//         onValueChanged(null)
//       }
//     },
//     [onValueChanged, token]
//   )

//   return (
//     <input
//       type="text"
//       inputMode="decimal"
//       placeholder={t("Enter Amount")}
//       step="any"
//       value={inputValue}
//       className={
//         "peer inline-block grow text-ellipsis bg-transparent text-[2rem] text-body placeholder:text-body-disabled"
//       }
//       onChange={handleChange}
//     />
//   )
// }
