import { tokensToPlanck } from "@talismn/util"
import { YieldDto } from "extension-core"
import { useMemo } from "react"

import { useBalance, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"

export const useDepositValidation = (product: YieldDto | null) => {
  const { account, tokenId, amount } = useDepositWizard()
  const token = useToken(tokenId as string)
  const balance = useBalance(account as string, tokenId as string)

  const validationErrors = useMemo(() => {
    const errors: string[] = []

    // Basic validations
    if (!account) {
      errors.push("Please select an account")
    }

    if (!token) {
      errors.push("Please select a token")
    }

    if (!product) {
      errors.push("Please select a product")
    }

    // Product status validations
    if (product) {
      if (product.metadata.underMaintenance) {
        errors.push("This product is under maintenance")
      }
      if (product.metadata.deprecated) {
        errors.push("This product is deprecated")
      }
    }

    // Amount validations
    if (amount && product && token) {
      // Convert decimal strings to planck units before converting to BigInt
      const minAmount = BigInt(
        tokensToPlanck(product?.mechanics?.entryLimits?.minimum || "0", token?.decimals || 18),
      )
      const maxAmount = product?.mechanics?.entryLimits?.maximum
        ? BigInt(
            tokensToPlanck(product?.mechanics?.entryLimits?.maximum || "0", token?.decimals || 18),
          )
        : undefined

      if (BigInt(amount) < minAmount) {
        errors.push(
          `Minimum deposit: ${product?.mechanics?.entryLimits?.minimum || "0"} ${token?.symbol}`,
        )
      }

      if (maxAmount && BigInt(amount) > maxAmount) {
        errors.push(
          `Maximum deposit: ${product?.mechanics?.entryLimits?.maximum || "0"} ${token?.symbol}`,
        )
      }
    }

    // Balance validation
    if (amount && balance && BigInt(amount) > balance.transferable.planck) {
      errors.push("Insufficient balance")
    }

    return errors
  }, [account, token, product, amount, balance])

  const isValid = useMemo(() => {
    return validationErrors.length === 0
  }, [validationErrors])

  return {
    isValid,
    validationErrors,
  }
}
