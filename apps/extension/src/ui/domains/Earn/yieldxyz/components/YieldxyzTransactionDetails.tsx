import { abiErc20 } from "@core/util/abi"
import type { TokenId } from "@talismn/chaindata-provider"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { decodeFunctionData, parseAbi, type TransactionRequest } from "viem"

import { FormFieldSetRow } from "../../shared/FormFieldSet"

/** The provider's calldata is not decodable for most protocols — show its method id in that case. */
const useMethodLabel = (data: `0x${string}` | undefined) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!data || data === "0x") return t("Transfer")

    try {
      return decodeFunctionData({ abi: parseAbi(abiErc20), data }).functionName
    } catch {
      return data.slice(0, 10)
    }
  }, [data, t])
}

/**
 * The rest of the confirmation screen describes what the user asked for. These rows describe the
 * transaction the provider returned, which is what actually gets signed.
 */
export const YieldxyzTransactionDetails: FC<{
  tx: TransactionRequest | undefined
  feeTokenId: TokenId
  networkId: string
}> = ({ tx, feeTokenId, networkId }) => {
  const { t } = useTranslation()
  const method = useMethodLabel(tx?.data)

  if (!tx?.to) return null

  return (
    <>
      <FormFieldSetRow label={t("Contract")} variant="small">
        <AddressDisplay
          address={tx.to}
          networkId={networkId}
          className="text-xs [&>div>svg]:size-10"
        />
      </FormFieldSetRow>
      <FormFieldSetRow label={t("Method")} variant="small" valueClassName="text-body-secondary">
        <span className="truncate text-xs">{method}</span>
      </FormFieldSetRow>
      {!!tx.value && (
        <FormFieldSetRow label={t("Amount Sent")} variant="small">
          <TokensAndFiat planck={tx.value} tokenId={feeTokenId} tokensClassName="text-body" />
        </FormFieldSetRow>
      )}
    </>
  )
}
