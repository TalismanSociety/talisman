// import { ChevronLeftIcon } from "@talismn/icons"
// import { BalanceDto } from "extension-core"
// import { FC, useCallback, useEffect, useMemo } from "react"
// import { useTranslation } from "react-i18next"
// import { useNavigate, useSearchParams } from "react-router-dom"
// import { IconButton } from "talisman-ui"

// import { WithdrawAmountForm } from "@ui/domains/Earn/components/WithdrawAmountForm"
// import { useWithdrawWizard } from "@ui/domains/Earn/context/WithdrawWizardContext"

// export const WithdrawAmountPage: FC = () => {
//   const { t } = useTranslation()
//   const navigate = useNavigate()
//   const [searchParams] = useSearchParams()
//   const { set, setBalance } = useWithdrawWizard()

//   const yieldId = searchParams.get("yieldId")
//   const account = searchParams.get("account")
//   const tokenId = searchParams.get("tokenId")
//   const validatorAddress = searchParams.get("validatorAddress")
//   const balancesParam = searchParams.get("balances")

//   // Parse balances from URL params
//   const balances: BalanceDto[] = useMemo(() => {
//     try {
//       return balancesParam ? JSON.parse(decodeURIComponent(balancesParam)) : []
//     } catch {
//       return []
//     }
//   }, [balancesParam])

//   // Find the selected balance based on account and token
//   const selectedBalance = useMemo(() => {
//     if (!account) return null

//     // Find balance for the selected account
//     const accountBalances = balances.filter((b) => b.address === account)

//     if (accountBalances.length === 0) return null

//     // If we have a tokenId, try to find the balance that matches
//     // We need to map the tokenId back to the original token address/symbol
//     if (tokenId) {
//       // For now, just return the first balance for the account
//       // The tokenId mapping was already done in navigation
//       return accountBalances[0]
//     }

//     return accountBalances[0]
//   }, [balances, account, tokenId])

//   useEffect(() => {
//     // Set context values from URL params
//     if (yieldId) set("yieldId", yieldId)
//     if (account) set("account", account as string)
//     if (tokenId) set("tokenId", tokenId as string)
//     if (validatorAddress) set("validatorAddress", validatorAddress)

//     // Set balance and amount if we have a selected balance
//     if (selectedBalance) {
//       setBalance(selectedBalance)
//       set("amount", selectedBalance.amountRaw || "0") // Prefill with full balance
//     }
//   }, [yieldId, account, tokenId, validatorAddress, selectedBalance, set, setBalance])

//   const handleNext = useCallback(() => {
//     navigate(`/select-product/withdraw/confirm?${searchParams.toString()}`)
//   }, [navigate, searchParams])

//   const handleClose = useCallback(() => {
//     navigate("/portfolio")
//   }, [navigate])

//   return (
//     <div className="flex size-full flex-grow flex-col bg-black">
//       <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
//         <IconButton onClick={handleClose}>
//           <ChevronLeftIcon />
//         </IconButton>
//         <div className="text-base font-bold text-white">{t("Withdraw")}</div>
//         <div className="w-10" />
//       </header>
//       <div className="flex h-full w-full flex-col">
//         <WithdrawAmountForm onNext={handleNext} />
//       </div>
//     </div>
//   )
// }
