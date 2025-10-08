import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { solNativeTokenId } from "@talismn/chaindata-provider"
import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { deserializeTransaction, serializeTransaction } from "@talismn/solana"
import { cn } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { Account, isAccountOfType, SolSigningRequest } from "extension-core"
import { isVersionedTransaction } from "inject/solana/solana"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AppPill } from "@talisman/components/AppPill"
import { api } from "@ui/api"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { RiskAnalysisPillButton } from "@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton"
import { RiskAnalysisStateChanges } from "@ui/domains/Sign/risk-analysis/RiskAnalysisStateChanges"
import { useSolTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/solana/useSolTransactionRiskAnalysis"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignApproveButton } from "@ui/domains/Sign/SignApproveButton"
import { SignLedgerSolana, SolSignOutput, SolSignPayload } from "@ui/domains/Sign/SignLedgerSolana"
import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useEnableTokens } from "@ui/hooks/useEnableTokens"
import { useNetworkById } from "@ui/state"
import { getFrontEndSolanaConnection } from "@ui/util/solana/useSolanaConnection"
import { useSolanaNetworkIdForTransaction } from "@ui/util/solana/useSolanaNetworkIdForTransaction"

import { SignNetworkLogo } from "../SignNetworkLogo"

export const SolSignTransactionRequest: FC<{
  request: SolSigningRequest
}> = ({ request }) => {
  if (request.request.type !== "transaction")
    throw new Error("Invalid request type for SolSignTransactionRequest")

  const {
    id,
    account,
    request: { transaction: serializedTx },
  } = request

  const transaction = useMemo(() => deserializeTransaction(serializedTx), [serializedTx])
  const { data: networkId } = useSolanaNetworkIdForTransaction(transaction)
  const network = useNetworkById(networkId)
  const [isLocked, setIsLocked] = useState(false)

  const { data: validity } = useTransactionValidity({
    transaction,
    networkId,
  })

  const riskAnalysis = useSolTransactionRiskAnalysis({
    from: account.address,
    networkId,
    tx: serializedTx,
  })

  const { enableTokens } = useEnableTokens()

  const { t } = useTranslation()

  const [state, setState] = useState<{
    processing: boolean
    error: string | undefined
  }>({
    processing: false,
    error: undefined,
  })

  const handleApprove = useCallback(async () => {
    setState({ error: undefined, processing: true })
    try {
      await enableTokens(riskAnalysis.tokenIds)
      await api.solSignApprove({ id, type: "transaction", networkId: network?.id }) // will close the window automatically if successful
    } catch (error) {
      setState({
        processing: false,
        error: (error as Error).message || "Failed to approve sign request",
      })
    }
  }, [id, network?.id, riskAnalysis.tokenIds, enableTokens])

  const handleSigned = useCallback(
    async (output: SolSignOutput) => {
      if (output.type !== "transaction") throw new Error("Unexpected output from Ledger signing")

      setState({ error: undefined, processing: true })
      try {
        await enableTokens(riskAnalysis.tokenIds)
        await api.solSignApprove({
          id,
          type: "transaction",
          networkId: network?.id,
          transaction: serializeTransaction(transaction),
        })
      } catch (error) {
        setState({
          processing: false,
          error: (error as Error).message || "Failed to approve sign request",
        })
      }
    },
    [id, network?.id, transaction, riskAnalysis.tokenIds, enableTokens],
  )

  const displayError = useMemo(() => {
    return state.error ?? validity?.reason ?? null
  }, [state.error, validity?.reason])

  const signPayload = useMemo<SolSignPayload>(
    () => ({
      type: "transaction",
      transaction,
    }),
    [transaction],
  )

  return (
    <RiskAnalysisProvider riskAnalysis={riskAnalysis} onReject={() => window.close()}>
      <PopupLayout>
        <PopupHeader right={<SignNetworkLogo network={network} />}>
          <AppPill url={request.url} />
        </PopupHeader>
        <PopupContent>
          <div className="text-body-secondary flex w-full flex-col items-center text-center">
            <h1 className="text-body text-md my-12 font-bold leading-9">{t("Approve Request")}</h1>
            <h2 className="mb-8 text-base leading-[3.2rem]">
              {t("You are signing a transaction with account")} <AccountPill account={account} />
            </h2>
            <RiskAnalysisPillButton />
            <div className="bg-grey-850 mt-8 w-full rounded-sm p-2 empty:hidden">
              <RiskAnalysisStateChanges riskAnalysis={riskAnalysis} noTitle />
            </div>
          </div>
        </PopupContent>
        <PopupFooter className="flex flex-col gap-8">
          {!!displayError && (
            <SignAlertMessage className="mb-6" type="error">
              {displayError}
            </SignAlertMessage>
          )}
          <FeeEstimateRow
            transaction={transaction}
            networkId={networkId}
            isLocked={isLocked}
            account={account}
          />
          <div className="grid w-full grid-cols-2 gap-12">
            <Button onClick={() => window.close()}>{t("Cancel")}</Button>
            {isAccountOfType(account, "ledger-solana") ? (
              <SignLedgerSolana
                disabled={!validity?.isValid}
                account={account}
                payload={signPayload}
                onSentToDevice={setIsLocked}
                onSigned={handleSigned}
              />
            ) : (
              <SignApproveButton
                disabled={!validity?.isValid}
                processing={state.processing}
                primary
                onClick={handleApprove}
              >
                {t("Approve")}
              </SignApproveButton>
            )}
          </div>
        </PopupFooter>
      </PopupLayout>
    </RiskAnalysisProvider>
  )
}

const FeeEstimateRow: FC<{
  transaction: VersionedTransaction | Transaction
  networkId: string | null
  isLocked: boolean
  account: Account
}> = ({ transaction, networkId, account, isLocked }) => {
  const { t } = useTranslation()
  const tokenId = useMemo(() => (networkId ? solNativeTokenId(networkId) : undefined), [networkId])
  const {
    data: estimatedFee,
    isLoading,
    error,
  } = useEstimatedFee({ transaction, networkId, isLocked })

  const balanceParams = useMemo<BalanceByParamsProps>(
    () =>
      tokenId ? { addressesAndTokens: { addresses: [account.address], tokenIds: [tokenId] } } : {},
    [account.address, tokenId],
  )
  const { status, balances } = useBalancesByParams(balanceParams)

  return (
    <div className="text-body-secondary flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Tooltip placement="top-start">
          <TooltipTrigger asChild>
            <div>
              {t("Estimated Fee")} <InfoIcon className="inline-block align-text-top text-[1.1em]" />
            </div>
          </TooltipTrigger>

          <TooltipContent>
            <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
              <div className="flex w-full justify-between gap-8">
                <div>{t("Balance")}</div>
                <div>
                  <TokensAndFiat
                    tokenId={tokenId}
                    planck={balances.sum.planck.transferable}
                    noTooltip
                    noCountUp
                    className={cn(status === "initialising" && "animate-pulse")}
                  />
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <div>
        {isLoading || !tokenId ? (
          <LoaderIcon className="animate-spin-slow inline-block" />
        ) : error || !estimatedFee ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger type="button">{t("Unknown")}</TooltipTrigger>
            <TooltipContent>{t("Failed to estimate fee")}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={estimatedFee} tokenId={tokenId} />
        )}
      </div>
    </div>
  )
}

const useEstimatedFee = ({
  transaction,
  networkId,
  isLocked,
}: {
  transaction: Transaction | VersionedTransaction
  networkId: string | null
  isLocked: boolean
}) => {
  return useQuery({
    queryKey: ["useSolSignTransactionEstimateFee", transaction, networkId],
    queryFn: async () => {
      if (!networkId) return null

      const connection = getFrontEndSolanaConnection(networkId)
      if (!connection) return null

      const result = await connection.getFeeForMessage(
        isVersionedTransaction(transaction) ? transaction.message : transaction.compileMessage(),
      )

      return result.value ? String(result.value) : null
    },
    refetchInterval: !isLocked && 5_000, // refresh fee every 5 seconds
  })
}

const useTransactionValidity = ({
  transaction,
  networkId,
}: {
  transaction: Transaction | VersionedTransaction
  networkId: string | null
}) => {
  const { t } = useTranslation()

  return useQuery({
    queryKey: ["useSolSignTransactionValidity", transaction, networkId],
    queryFn: async () => {
      if (!networkId) return { isValid: false, reason: t("Unknown network") }

      const connection = getFrontEndSolanaConnection(networkId)
      if (!connection) return { isValid: false, reason: t("No connection available") }

      try {
        const recentBlockhash = isVersionedTransaction(transaction)
          ? transaction.message.recentBlockhash
          : transaction.recentBlockhash

        if (!recentBlockhash) return { isValid: false, reason: t("No blockhash found") }

        // Check if the blockhash is still valid
        const isValid = await connection.isBlockhashValid(recentBlockhash, {
          commitment: "processed", // Fastest, but may include blocks that could be rolled back.
        })

        return {
          isValid: isValid.value,
          reason: isValid.value ? null : t("Transaction has expired"),
        }
      } catch (error) {
        return { isValid: false, reason: t("Failed to validate transaction") }
      }
    },
    refetchInterval: 5_000, // Check every 5 seconds
  })
}
