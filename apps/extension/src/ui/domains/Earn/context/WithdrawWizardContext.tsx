import { TokenId } from "@talismn/chaindata-provider"
import { Address, BalanceDto } from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { provideContext } from "@talisman/util/provideContext"

type WithdrawWizardParams = {
  account: Address
  yieldId: string
  tokenId: TokenId
  amount: string // planck
  withdrawMax: boolean
  validatorAddress?: string
}

const STRING_PROPS = ["account", "yieldId", "tokenId", "amount", "validatorAddress"]
const BOOL_PROPS = ["withdrawMax"]

export type WithdrawWizardPage = "amount" | "confirm"

const useWithdrawWizardProvider = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Separate state for balance (not serializable in URL)
  const [balance, setBalance] = useState<BalanceDto | null>(null)

  const {
    account,
    yieldId,
    tokenId,
    amount,
    withdrawMax,
    validatorAddress: _validatorAddress,
  } = useMemo(
    () => ({
      account: searchParams.get("account") ?? undefined,
      yieldId: searchParams.get("yieldId") ?? undefined,
      tokenId: searchParams.get("tokenId") ?? undefined,
      amount: searchParams.get("amount") ?? undefined,
      withdrawMax: searchParams.get("withdrawMax") !== null,
      validatorAddress: searchParams.get("validatorAddress") ?? undefined,
    }),
    [searchParams],
  )

  const set = useCallback(
    <T extends keyof WithdrawWizardParams>(
      key: T,
      value: WithdrawWizardParams[T],
      goToNextPage = false,
    ) => {
      // reset amount if token changes, as decimals may be totally different
      if (key === "tokenId" && value !== searchParams.get("tokenId")) {
        searchParams.delete("amount")
        searchParams.delete("withdrawMax")
      }

      if (key === "amount" && value) searchParams.delete("withdrawMax")
      if (key === "account" && value) searchParams.delete("withdrawMax")

      // boolean values
      if (BOOL_PROPS.includes(key) && value) searchParams.set(key, "")
      else if (BOOL_PROPS.includes(key) && !value) searchParams.delete(key)
      // string values
      else if (STRING_PROPS.includes(key)) searchParams.set(key, value as string)
      else throw new Error(`Invalid key ${key}`)

      setSearchParams(searchParams, { replace: true })

      if (goToNextPage) {
        let page: WithdrawWizardPage = "amount"
        if (!searchParams.has("account")) page = "amount"
        else if (!searchParams.has("amount") && !searchParams.has("withdrawMax")) page = "amount"
        const url = `/select-product/withdraw/${page}?${searchParams.toString()}`
        navigate(url)
      }
    },
    [navigate, searchParams, setSearchParams],
  )

  const remove = useCallback(
    (key: keyof WithdrawWizardParams) => {
      searchParams.delete(key)
      setSearchParams(searchParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const goto = useCallback(
    (page: WithdrawWizardPage, replace?: boolean) => {
      const url = `/select-product/withdraw/${page}?${searchParams.toString()}`
      navigate(url, { replace })
    },
    [navigate, searchParams],
  )

  const gotoConfirm = useCallback(() => {
    if (!account) throw new Error("Account is not set")
    if (!tokenId) throw new Error("Token is not set")
    if (!yieldId) throw new Error("Yield ID is not set")
    if (!amount && !withdrawMax) throw new Error("Amount is not set")

    navigate(`/select-product/withdraw/confirm?${searchParams.toString()}`)
  }, [account, navigate, searchParams, amount, withdrawMax, tokenId, yieldId])

  const gotoProgress = useCallback(
    ({ networkId, txId }: { networkId: string; txId: string }) => {
      const qs = new URLSearchParams()
      qs.set("txId", txId)
      qs.set("networkId", networkId)
      navigate(`/select-product/withdraw/submitted?${qs.toString()}`)
    },
    [navigate],
  )

  const reset = useCallback(() => {
    // Clear all search parameters to reset the wizard state
    searchParams.delete("account")
    searchParams.delete("yieldId")
    searchParams.delete("tokenId")
    searchParams.delete("amount")
    searchParams.delete("withdrawMax")
    searchParams.delete("validatorAddress")
    setSearchParams(searchParams, { replace: true })
    setBalance(null)
  }, [searchParams, setSearchParams])

  const resetUserInput = useCallback(() => {
    // Clear only user input fields, keep account, tokenId, yieldId
    searchParams.delete("amount")
    searchParams.delete("withdrawMax")
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams])

  return {
    // State
    account,
    yieldId,
    tokenId,
    amount,
    withdrawMax,
    validatorAddress: _validatorAddress,
    balance,
    // Actions
    set,
    remove,
    goto,
    gotoConfirm,
    gotoProgress,
    reset,
    resetUserInput,
    setBalance,
  }
}

export const [WithdrawWizardProvider, useWithdrawWizard] = provideContext(useWithdrawWizardProvider)
