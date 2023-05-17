import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { HexString } from "@polkadot/util/types"
import { tokensToPlanck } from "@talismn/util"
import { api } from "@ui/api"
import LedgerEthereum from "@ui/domains/Sign/LedgerEthereum"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { ethers } from "ethers"
import { useCallback, useEffect, useState } from "react"

import { useSendTokens } from "./context"
import { SendTokensData } from "./types"
import { useTransferableTokenById } from "./useTransferableTokens"

const SendLedgerEthereum = () => {
  const { formData, sendWithSignatureEthereum, cancel } = useSendTokens()
  const { from, to, transferableTokenId, amount, gasSettings } = formData as SendTokensData
  const account = useAccountByAddress(from) as AccountJsonHardwareEthereum
  const transferableToken = useTransferableTokenById(transferableTokenId)
  const { token, evmNetworkId } = transferableToken ?? {}

  const [error, setError] = useState<Error>()
  const [transaction, setTransaction] = useState<ethers.providers.TransactionRequest>()

  const getTransaction = useCallback(async () => {
    if (!token || !evmNetworkId || !gasSettings) return

    const [nonce, txBase] = await Promise.all([
      api.ethGetTransactionsCount(account.address, evmNetworkId),
      getEthTransferTransactionBase(
        evmNetworkId,
        ethers.utils.getAddress(from),
        ethers.utils.getAddress(to),
        token,
        tokensToPlanck(amount, token.decimals)
      ),
    ])

    return {
      ...txBase,
      ...gasSettings,
      nonce,
    }
  }, [account.address, amount, evmNetworkId, from, gasSettings, to, token])

  useEffect(() => {
    getTransaction()
      .then(setTransaction)
      .catch((err) => {
        setError(err as Error)
      })
  }, [getTransaction])

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (!transaction) return
      try {
        setSigned(true)
        await sendWithSignatureEthereum(transaction, signature)
      } catch (err) {
        setError(err as Error)
      }
    },
    [sendWithSignatureEthereum, transaction]
  )

  if (error) return <div className="text-alert-error">{error.message}</div>

  // hide until ready or after it's signed
  if (!transaction || signed) return null

  return (
    <LedgerEthereum
      account={account}
      method="transaction"
      onReject={cancel}
      onSignature={handleSigned}
      payload={transaction}
      parent={"send-funds-container"}
    />
  )
}

// default export to allow lazy loading
export default SendLedgerEthereum
