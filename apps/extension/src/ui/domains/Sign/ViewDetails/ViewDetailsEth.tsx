import { BalanceFormatter } from "@extension/core"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CopyIcon, FileSearchIcon } from "@talismn/icons"
import { formatDecimals } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useFeePriorityOptionsUI } from "@ui/domains/Ethereum/GasSettings/common"
import { NetworkUsage } from "@ui/domains/Ethereum/NetworkUsage"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, PropsWithChildren, ReactNode, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"
import { formatEther, formatGwei } from "viem"

import { Message } from "../Message"
import { useEthSignTransactionRequest } from "../SignRequestContext"
import { ViewDetailsAddress } from "./ViewDetailsAddress"
import { ViewDetailsField } from "./ViewDetailsField"

const ViewDetailsGrid: FC<PropsWithChildren> = ({ children }) => (
  <div className="grid-cols-keyvalue grid gap-x-8 whitespace-nowrap">{children}</div>
)

const ViewDetailsGridRow: FC<{ left: ReactNode; right: ReactNode }> = ({ left, right }) => (
  <>
    <div className="text-body-secondary">{left}</div>
    <div className="text-right">{right}</div>
  </>
)

type ViewDetailsContentProps = {
  onClose: () => void
}

const Gwei: FC<{ value: bigint | null | undefined }> = ({ value }) => {
  const { t } = useTranslation("request")
  return (
    <>
      {value !== null && value !== undefined
        ? t("{{value}} GWEI", { value: formatDecimals(formatGwei(value)) })
        : t("N/A")}
    </>
  )
}

const ViewDetailsContent: FC<ViewDetailsContentProps> = ({ onClose }) => {
  const { t } = useTranslation("request")
  const feePriorityOptions = useFeePriorityOptionsUI()
  const {
    request,
    network,
    networkUsage,
    txDetails,
    priority,
    transaction,
    decodedTx,
    error,
    errorDetails,
  } = useEthSignTransactionRequest()
  const { genericEvent } = useAnalytics()

  const nativeToken = useToken(network?.nativeToken?.id)
  const formatEthValue = useCallback(
    (value: bigint = 0n) => {
      return value ? `${formatEther(value)} ${nativeToken?.symbol ?? ""}` : null
    },
    [nativeToken?.symbol]
  )

  const nativeTokenRates = useTokenRates(nativeToken?.id)

  useEffect(() => {
    genericEvent("open sign transaction view details", { type: "ethereum" })
  }, [genericEvent])

  const [estimatedFee, maximumFee, estimatedL1DataFee, estimatedL2Fee] = useMemo(
    () =>
      txDetails && nativeToken
        ? [
            new BalanceFormatter(txDetails.estimatedFee, nativeToken?.decimals, nativeTokenRates),
            new BalanceFormatter(txDetails.maxFee, nativeToken?.decimals, nativeTokenRates),
            txDetails.estimatedL1DataFee
              ? new BalanceFormatter(
                  txDetails.estimatedL1DataFee,
                  nativeToken.decimals,
                  nativeTokenRates
                )
              : null,
            txDetails.estimatedL1DataFee
              ? new BalanceFormatter(
                  txDetails.estimatedFee - txDetails.estimatedL1DataFee,
                  nativeToken.decimals,
                  nativeTokenRates
                )
              : null,
          ]
        : [null, null, null, null],
    [nativeToken, nativeTokenRates, txDetails]
  )

  const handleCopyByteCode = useCallback(async () => {
    if (!request?.data) return
    try {
      await navigator.clipboard.writeText(request.data.toString())
      notify(
        {
          type: "success",
          title: t("Byte code copied"),
        }
        // set an id to prevent multiple clicks to display multiple notifications
      )
    } catch (err) {
      notify({
        type: "error",
        title: t(`Copy failed`),
      })
    }
  }, [request?.data, t])

  if (!request) return null

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto pr-4 text-sm leading-[2rem]">
        <div className="text-body-secondary">{t("Details")}</div>
        {!!decodedTx?.isContractCall && (
          <ViewDetailsField label={t("Contract type and method")}>
            {decodedTx?.contractType
              ? `${decodedTx?.contractType} : ${decodedTx?.contractCall?.functionName ?? t("N/A")}`
              : t("Unknown")}
          </ViewDetailsField>
        )}
        <ViewDetailsAddress
          label={t("From")}
          address={request.from}
          blockExplorerUrl={network?.explorerUrl}
        />
        <ViewDetailsAddress
          label={t("To")}
          address={request.to ?? undefined}
          blockExplorerUrl={network?.explorerUrl}
        />
        <ViewDetailsField label={t("Value to be transferred")} breakAll>
          {formatEthValue(transaction?.value)}
        </ViewDetailsField>
        <ViewDetailsField label={t("Network")}>
          <ViewDetailsGrid>
            <ViewDetailsGridRow
              left={t("Name")}
              right={network ? `${network.name} (${network.id})` : null}
            />
            <ViewDetailsGridRow
              left={t("Usage")}
              right={
                typeof networkUsage === "number" ? `${Math.round(networkUsage * 100)}%` : t("N/A")
              }
            />

            {transaction?.type === "eip1559" && (
              <>
                <ViewDetailsGridRow
                  left={t("Gas price")}
                  right={<Gwei value={txDetails?.gasPrice} />}
                />
                <ViewDetailsGridRow
                  left={t("Base fee per gas")}
                  right={<Gwei value={txDetails?.baseFeePerGas} />}
                />
                <ViewDetailsGridRow
                  left={t("Base fee trend")}
                  right={
                    <NetworkUsage
                      baseFeeTrend={txDetails?.baseFeeTrend}
                      className="h-10 justify-end"
                    />
                  }
                />
              </>
            )}
          </ViewDetailsGrid>
        </ViewDetailsField>
        {!!priority && (
          <ViewDetailsField label={`${t("Gas settings")} (${feePriorityOptions[priority].label})`}>
            {transaction ? (
              <ViewDetailsGrid>
                {transaction?.type === "eip1559" ? (
                  <>
                    <ViewDetailsGridRow left={t("Type")} right="EIP-1559" />

                    <ViewDetailsGridRow
                      left={t("Max priority fee per gas")}
                      right={<Gwei value={transaction.maxPriorityFeePerGas} />}
                    />
                    <ViewDetailsGridRow
                      left={t("Max fee per gas")}
                      right={<Gwei value={transaction.maxFeePerGas} />}
                    />
                  </>
                ) : (
                  <>
                    <ViewDetailsGridRow left={t("Type")} right={t("Legacy")} />
                    <ViewDetailsGridRow
                      left={t("Gas price")}
                      right={<Gwei value={transaction?.gasPrice} />}
                    />
                  </>
                )}
                <ViewDetailsGridRow
                  left={t("Gas limit")}
                  right={transaction?.gas ? transaction.gas.toString() : t("N/A")}
                />
              </ViewDetailsGrid>
            ) : (
              t("N/A")
            )}
          </ViewDetailsField>
        )}
        {estimatedL1DataFee && estimatedL2Fee && nativeToken && (
          <ViewDetailsField label={t("Layer 2")}>
            <ViewDetailsGrid>
              <ViewDetailsGridRow
                left={t("Layer 1 data fee")}
                right={
                  <>
                    <Tokens
                      amount={estimatedL1DataFee.tokens}
                      decimals={nativeToken.decimals}
                      symbol={nativeToken.symbol}
                    />
                    {estimatedL1DataFee && nativeTokenRates ? (
                      <>
                        {" "}
                        / <Fiat amount={estimatedL1DataFee} noCountUp />
                      </>
                    ) : null}
                  </>
                }
              />
              <ViewDetailsGridRow
                left={t("Layer 2 fee")}
                right={
                  <>
                    <Tokens
                      amount={estimatedL2Fee.tokens}
                      decimals={nativeToken.decimals}
                      symbol={nativeToken.symbol}
                    />
                    {estimatedL2Fee && nativeTokenRates ? (
                      <>
                        {" "}
                        / <Fiat amount={estimatedL2Fee} noCountUp />
                      </>
                    ) : null}
                  </>
                }
              />
            </ViewDetailsGrid>
          </ViewDetailsField>
        )}
        <ViewDetailsField label={t("Total Fee")}>
          {transaction ? (
            <ViewDetailsGrid>
              <ViewDetailsGridRow
                left={t("Estimated")}
                right={
                  <>
                    {estimatedFee?.tokens ? (
                      <Tokens
                        amount={estimatedFee?.tokens}
                        decimals={nativeToken?.decimals}
                        symbol={nativeToken?.symbol}
                      />
                    ) : (
                      t("N/A")
                    )}
                    {estimatedFee && nativeTokenRates ? (
                      <>
                        {" "}
                        / <Fiat amount={estimatedFee} noCountUp />
                      </>
                    ) : null}
                  </>
                }
              />
              <ViewDetailsGridRow
                left={t("Maximum")}
                right={
                  <>
                    {maximumFee?.tokens ? (
                      <Tokens
                        amount={maximumFee?.tokens}
                        decimals={nativeToken?.decimals}
                        symbol={nativeToken?.symbol}
                      />
                    ) : (
                      t("N/A")
                    )}
                    {maximumFee && nativeTokenRates ? (
                      <>
                        {" "}
                        / <Fiat amount={maximumFee} noCountUp />
                      </>
                    ) : null}
                  </>
                }
              />
            </ViewDetailsGrid>
          ) : (
            t("N/A")
          )}
        </ViewDetailsField>
        <ViewDetailsField
          label={t("Error")}
          error={`${error ?? ""}${errorDetails ? `\n${errorDetails}` : ""}`}
        />
        {request.data && (
          <ViewDetailsField
            label={
              <button
                type="button"
                onClick={handleCopyByteCode}
                className="text-body-secondary text-left hover:text-white"
              >
                <CopyIcon className="inline transition-none" /> {t("Copy byte code")}
              </button>
            }
          >
            <Message
              rows={6}
              className="bg-grey-800 w-full rounded-sm"
              text={request.data?.toString()}
            />
          </ViewDetailsField>
        )}
      </div>
      <Button className="shrink-0" onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}

export const ViewDetailsEth = () => {
  const { t } = useTranslation("request")
  const { isOpen, open, close } = useOpenClose()
  const { isLoading } = useEthSignTransactionRequest()

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-body-disabled hover:text-body-secondary flex items-center gap-2"
      >
        <FileSearchIcon className="text-base" />
        <span className="text-xs">{t("View Details")}</span>
      </button>
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen && !isLoading} onDismiss={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
