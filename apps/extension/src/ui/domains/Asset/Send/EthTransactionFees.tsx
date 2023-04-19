import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { EthGasSettings } from "@core/domains/ethereum/types"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { Box } from "@talisman/components/Box"
import { LoaderIcon } from "@talisman/theme/icons"
import { tokensToPlanck } from "@talismn/util"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { ethers } from "ethers"
import { useEffect, useState } from "react"
import styled from "styled-components"

import { useEthTransaction } from "../../Ethereum/useEthTransaction"
import { TokensAndFiat } from "../TokensAndFiat"
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
    networkUsage,
  } = useEthTransaction(tx)

  useEffect(() => {
    if (!onChange) return
    if (gasSettings) {
      onChange({
        priority,
        gasSettings,
      })
    } else {
      onChange({}, error)
    }
  }, [error, gasSettings, onChange, priority])

  if (!txDetails) return null

  if (!evmNetwork?.nativeToken || isLoading) return <Loader className="animate-spin-slow" />

  if (!txDetails.estimatedFee || !transaction) return null

  return (
    <Box textalign="right" flex column justify="flex-end" gap={0.1}>
      {tx && txDetails && priority && (
        <Box>
          Priority :{" "}
          <EthFeeSelect
            tokenId={evmNetwork?.nativeToken?.id}
            drawerContainerId={"send-funds-container"}
            gasSettingsByPriority={gasSettingsByPriority}
            setCustomSettings={setCustomSettings}
            onChange={setPriority}
            priority={priority}
            txDetails={txDetails}
            networkUsage={networkUsage}
            tx={tx}
          />
        </Box>
      )}
      <Box>
        Est. Fee:{" "}
        <TokensAndFiat
          planck={txDetails.estimatedFee.toString()}
          tokenId={evmNetwork.nativeToken.id}
          noCountUp
        />
      </Box>
    </Box>
  )
}
