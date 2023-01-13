import { BalanceFormatter } from "@core/domains/balances/types"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { EthGasSettings } from "@core/domains/ethereum/types"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { Box } from "@talisman/components/Box"
import { LoaderIcon } from "@talisman/theme/icons"
import { EvmNativeToken } from "@talismn/balances-evm-native"
import { tokensToPlanck } from "@talismn/util"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import { useEthTransaction } from "../../Ethereum/useEthTransaction"
import Fiat from "../Fiat"
import Tokens from "../Tokens"
import { useTransferableTokenById } from "./useTransferableTokens"

export const Loader = styled(LoaderIcon)`
  font-size: 1.8rem;
`

export type FeeSettings = {
  priority?: EthPriorityOptionName
  gasSettings?: EthGasSettings
}

type EthTransactionFeesProps = {
  transferableTokenId?: string
  amount: string
  from: string
  to: string
  onChange?: (fees: FeeSettings, errorMessage?: string) => void
}

/**
 * This component should only be rendered if the selected chain is EVM
 * All EVM gas computation should be done from here
 */
export const EthTransactionFees = ({
  transferableTokenId,
  amount, // ethers
  from,
  to,
  onChange,
}: EthTransactionFeesProps) => {
  const transferableToken = useTransferableTokenById(transferableTokenId)
  const token = useToken(transferableToken?.token?.id)
  const evmNetwork = useEvmNetwork(transferableToken?.evmNetworkId)
  const nativeToken = useToken(evmNetwork?.nativeToken?.id)

  const tokenRates = useTokenRates(token?.id)
  const nativeTokenRates = useTokenRates(nativeToken?.id)

  const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

  useEffect(() => {
    if (!transferableToken?.evmNetworkId || !token || !amount || !to) setTx(undefined)
    else {
      getEthTransferTransactionBase(
        transferableToken.evmNetworkId,
        from,
        to,
        token,
        tokensToPlanck(amount, token.decimals)
      )
        .then(setTx)
        .catch((err) => {
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error("EthTransactionFees", { err })
        })
    }
  }, [from, to, token, transferableToken?.evmNetworkId, amount])

  const {
    transaction,
    priority,
    setPriority,
    txDetails,
    isLoading,
    gasSettings,
    error,
    gasSettingsByPriority,
    setCustomSettings,
  } = useEthTransaction(tx)

  const errorMessage = useMemo(() => {
    if (error?.startsWith("insufficient funds for intrinsic transaction cost"))
      return "Insufficient balance"
    return error ?? null
  }, [error])

  const sendFundsContainer = document.getElementById("send-funds-container")

  useEffect(() => {
    if (!onChange) return
    if (gasSettings) {
      onChange({
        priority,
        gasSettings,
      })
    } else {
      onChange({}, errorMessage)
    }
  }, [errorMessage, gasSettings, onChange, priority])

  const estimatedFee = useMemo(
    () =>
      txDetails
        ? new BalanceFormatter(
            ethers.utils.formatUnits(txDetails.estimatedFee, 0),
            nativeToken?.decimals,
            nativeTokenRates
          )
        : null,
    [nativeToken, nativeTokenRates, txDetails]
  )

  if (!txDetails) return null

  if (!nativeToken || isLoading) return <Loader data-spin />

  if (!estimatedFee || !transaction) return null

  return (
    <Box textalign="right" flex column justify="flex-end" gap={0.1}>
      {txDetails?.priorityOptions && (
        <Box>
          Priority :{" "}
          <EthFeeSelect
            nativeToken={nativeToken as EvmNativeToken}
            drawerContainer={sendFundsContainer}
            gasSettingsByPriority={gasSettingsByPriority}
            setCustomSettings={setCustomSettings}
            onChange={setPriority}
            priority={priority}
            decimals={nativeToken?.decimals}
            symbol={nativeToken?.symbol}
            txDetails={txDetails}
          />
        </Box>
      )}
      <Box>
        Est. Fee:{" "}
        <Tokens
          amount={estimatedFee.tokens}
          symbol={nativeToken?.symbol}
          decimals={nativeToken?.decimals}
          noCountUp
        />
        {tokenRates && (
          <>
            {" "}
            / <Fiat amount={estimatedFee.fiat("usd")} currency="usd" noCountUp />
          </>
        )}
      </Box>
    </Box>
  )
}
