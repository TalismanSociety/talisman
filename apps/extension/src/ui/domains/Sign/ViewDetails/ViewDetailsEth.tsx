import { BalanceFormatter } from "@core/domains/balances"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CopyIcon, ExternalLinkIcon } from "@talisman/theme/icons"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { formatDecimals } from "@talismn/util"
import { Address } from "@ui/domains/Account/Address"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { FEE_PRIORITY_OPTIONS } from "@ui/domains/Ethereum/GasSettings/common"
import { NetworkUsage } from "@ui/domains/Ethereum/NetworkUsage"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { BigNumber, BigNumberish } from "ethers"
import { formatEther, formatUnits } from "ethers/lib/utils"
import { FC, PropsWithChildren, ReactNode, useCallback, useEffect, useMemo } from "react"
import styled from "styled-components"
import { PillButton } from "talisman-ui"

import { Message } from "../Message"
import { useEthSignTransactionRequest } from "../SignRequestContext"
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

const ViewDetailsContainer = styled.div`
  background: var(--color-background);
  padding: 2.4rem;
  border-radius: 2.4rem 2.4rem 0px 0px;
  font-size: var(--font-size-small);
  line-height: 2rem;
  display: flex;
  flex-direction: column;
  max-height: 60rem;

  .grow {
    flex-grow: 1;
    overflow-y: auto;
    ${scrollbarsStyle()}
  }

  color: var(--color-foreground-muted-2x);
  .title {
    color: var(--color-mid);
  }

  .title {
    margin-bottom: 1.6rem;
  }

  button {
    margin-top: 2.4rem;
    width: 100%;
  }

  .error {
    color: var(--color-status-error);
  }

  .warning {
    color: var(--color-status-warning);
  }

  a:link,
  a:visited {
    transition: none;
    color: var(--color-foreground-muted-2x);
  }
  a:hover,
  a:active {
    color: var(--color-foreground);
  }
`

type ViewDetailsContentProps = {
  onClose: () => void
}

const ViewDetailsAddress: FC<{ address?: string }> = ({ address }) => {
  const { network } = useEthSignTransactionRequest()
  const blockExplorerUrl = useMemo(() => network?.explorerUrl, [network?.explorerUrl])

  if (!address) return null

  if (!blockExplorerUrl) return <>{address}</>

  return (
    <a
      className="inline-flex gap-2"
      href={`${blockExplorerUrl}/address/${address}`}
      target="_blank"
      rel="noreferrer"
    >
      <Address address={address} startCharCount={8} endCharCount={8} />
      <div className="flex-col-justify-center flex pb-1">
        <ExternalLinkIcon className="transition-none" />
      </div>
    </a>
  )
}

const formatGwei = (value?: BigNumberish) => {
  return value ? `${formatDecimals(formatUnits(value, "gwei"))} GWEI` : null
}

const ViewDetailsContent: FC<ViewDetailsContentProps> = ({ onClose }) => {
  const {
    request,
    network,
    networkUsage,
    txDetails,
    priority,
    transaction,
    transactionInfo,
    error,
  } = useEthSignTransactionRequest()
  const { genericEvent } = useAnalytics()

  const txInfo = useMemo(() => {
    if (transactionInfo && transactionInfo.contractType !== "unknown") return transactionInfo
    return undefined
  }, [transactionInfo])

  const nativeToken = useToken(network?.nativeToken?.id)
  const formatEthValue = useCallback(
    (value?: BigNumberish) => {
      return value ? `${formatEther(value)} ${nativeToken?.symbol ?? ""}` : null
    },
    [nativeToken?.symbol]
  )

  const nativeTokenRates = useTokenRates(nativeToken?.id)

  useEffect(() => {
    genericEvent("open sign transaction view details", { type: "ethereum" })
  }, [genericEvent])

  const [estimatedFee, maximumFee] = useMemo(
    () =>
      txDetails && nativeToken
        ? [
            new BalanceFormatter(
              BigNumber.from(txDetails?.estimatedFee).toString(),
              nativeToken?.decimals,
              nativeTokenRates
            ),
            new BalanceFormatter(
              BigNumber.from(txDetails?.maxFee).toString(),
              nativeToken?.decimals,
              nativeTokenRates
            ),
          ]
        : [null, null],
    [nativeToken, nativeTokenRates, txDetails]
  )

  const handleCopyByteCode = useCallback(async () => {
    if (!request?.data) return
    try {
      await navigator.clipboard.writeText(request.data.toString())
      notify(
        {
          type: "success",
          title: "Byte code copied",
        }
        // set an id to prevent multiple clicks to display multiple notifications
      )
    } catch (err) {
      notify({
        type: "error",
        title: `Copy failed`,
      })
    }
  }, [request?.data])

  return (
    <ViewDetailsContainer>
      <div className="grow">
        <div className="title">Details</div>
        {!!txInfo?.isContractCall && (
          <ViewDetailsField label="Contract type and method">
            {txInfo?.contractType
              ? `${txInfo?.contractType} : ${txInfo?.contractCall?.name ?? "N/A"}`
              : "Unknown"}
          </ViewDetailsField>
        )}
        <ViewDetailsField label="From" breakAll>
          <ViewDetailsAddress address={request.from} />
        </ViewDetailsField>
        <ViewDetailsField label="To" breakAll>
          {request.to ? <ViewDetailsAddress address={request.to} /> : "N/A"}
        </ViewDetailsField>
        <ViewDetailsField label="Value to be transferred" breakAll>
          {formatEthValue(request.value)}
        </ViewDetailsField>
        <ViewDetailsField label={"Network"}>
          <ViewDetailsGrid>
            <ViewDetailsGridRow
              left="Name"
              right={network ? `${network.name} (${network.id})` : null}
            />
            <ViewDetailsGridRow
              left="Usage"
              right={
                typeof networkUsage === "number" ? `${Math.round(networkUsage * 100)}%` : "N/A"
              }
            />
            {transaction?.type === 2 && (
              <>
                <ViewDetailsGridRow
                  left="Base fee per gas"
                  right={txDetails?.baseFeePerGas ? formatGwei(txDetails.baseFeePerGas) : "N/A"}
                />
                <ViewDetailsGridRow
                  left="Base fee trend"
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
          <ViewDetailsField label={`Gas settings (${FEE_PRIORITY_OPTIONS[priority].label})`}>
            {transaction ? (
              <ViewDetailsGrid>
                {transaction?.type === 2 ? (
                  <>
                    <ViewDetailsGridRow left="Type" right="EIP-1559" />

                    <ViewDetailsGridRow
                      left="Max priority fee per gas"
                      right={
                        transaction.maxPriorityFeePerGas
                          ? formatGwei(transaction.maxPriorityFeePerGas)
                          : "N/A"
                      }
                    />
                    <ViewDetailsGridRow
                      left="Max fee per gas"
                      right={
                        transaction.maxFeePerGas ? formatGwei(transaction.maxFeePerGas) : "N/A"
                      }
                    />
                  </>
                ) : (
                  <>
                    <ViewDetailsGridRow left="Type" right="Legacy" />
                    <ViewDetailsGridRow
                      left="Gas price"
                      right={transaction?.gasPrice ? formatGwei(transaction.gasPrice) : "N/A"}
                    />
                  </>
                )}
                <ViewDetailsGridRow
                  left="Gas limit"
                  right={
                    transaction?.gasLimit ? BigNumber.from(transaction.gasLimit)?.toNumber() : "N/A"
                  }
                />
              </ViewDetailsGrid>
            ) : (
              "N/A"
            )}
          </ViewDetailsField>
        )}
        <ViewDetailsField label="Total Fee">
          {transaction ? (
            <ViewDetailsGrid>
              <ViewDetailsGridRow
                left="Estimated"
                right={
                  <>
                    {estimatedFee?.tokens ? (
                      <Tokens
                        amount={estimatedFee?.tokens}
                        decimals={nativeToken?.decimals}
                        symbol={nativeToken?.symbol}
                      />
                    ) : (
                      "N/A"
                    )}
                    {estimatedFee && nativeTokenRates ? (
                      <>
                        {" "}
                        / <Fiat amount={estimatedFee?.fiat("usd")} noCountUp currency="usd" />
                      </>
                    ) : null}
                  </>
                }
              />
              <ViewDetailsGridRow
                left="Maximum"
                right={
                  <>
                    {maximumFee?.tokens ? (
                      <Tokens
                        amount={maximumFee?.tokens}
                        decimals={nativeToken?.decimals}
                        symbol={nativeToken?.symbol}
                      />
                    ) : (
                      "N/A"
                    )}
                    {maximumFee && nativeTokenRates ? (
                      <>
                        {" "}
                        / <Fiat amount={maximumFee?.fiat("usd")} noCountUp currency="usd" />
                      </>
                    ) : null}
                  </>
                }
              />
            </ViewDetailsGrid>
          ) : (
            "N/A"
          )}
        </ViewDetailsField>
        <ViewDetailsField label="Error" error={error} />
        {request.data && (
          <ViewDetailsField
            label={
              <button
                onClick={handleCopyByteCode}
                className="text-body-secondary text-left hover:text-white"
              >
                <CopyIcon className="inline transition-none" /> Copy byte code
              </button>
            }
          >
            <Message
              readOnly
              rows={6}
              className="bg-grey-800 w-full rounded-sm"
              value={request.data?.toString()}
            />
          </ViewDetailsField>
        )}
      </div>
      <Button onClick={onClose}>Close</Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetailsEth = () => {
  const { isOpen, open, close } = useOpenClose()
  const { isLoading } = useEthSignTransactionRequest()

  return (
    <>
      <PillButton size="sm" onClick={open}>
        View Details
      </PillButton>
      <Drawer anchor="bottom" open={isOpen && !isLoading} onClose={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
