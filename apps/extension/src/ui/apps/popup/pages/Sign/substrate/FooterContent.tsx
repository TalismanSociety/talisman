import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountJsonQr, AccountJsonSignet, AccountType } from "@extension/core"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignHardwareSubstrate } from "@ui/domains/Sign/SignHardwareSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignSignetSubstrate } from "@ui/domains/Sign/SignSignetSubstrate"

const EstimatedFeesRow: FC = () => {
  const { t } = useTranslation("request")
  const { fee, isLoadingFee, errorFee, chain, errorDecodingExtrinsic } = usePolkadotSigningRequest()
  const feeToken = useFeeToken(chain?.nativeToken?.id)

  return (
    <div className="text-body-secondary mb-8 flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>{t("Estimated Fee")} </span>
        {!!chain?.isUnknownFeeToken && (
          <Tooltip>
            <TooltipTrigger className="flex flex-col justify-center">
              <InfoIcon className="inline-block" />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "We are unable to detect which currency will be used for fees in this transaction.",
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div>
        {isLoadingFee ? (
          <LoaderIcon className="animate-spin-slow inline-block" />
        ) : errorFee || errorDecodingExtrinsic ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger type="button">{t("Unknown")}</TooltipTrigger>
            <TooltipContent>{t("Failed to compute fee")}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={fee ?? undefined} tokenId={feeToken?.id} />
        )}
      </div>
    </div>
  )
}

const DryRunRow: FC = () => {
  const { t } = useTranslation("request")
  const { dryRun, dryRunIsLoading, isDryRunAvailable } = usePolkadotSigningRequest()

  if (!isDryRunAvailable) return null

  return (
    <>
      <div className="text-body-secondary mb-2 flex w-full items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>{t("Simulation")} </span>

          <Tooltip>
            <TooltipTrigger className="flex flex-col justify-center">
              <InfoIcon className="inline-block" />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "Dry runs aren't always reliable as they are unaware of details that are only provided in signatures, such as which asset to use to pay for fees.",
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        <div>
          {dryRunIsLoading ? (
            <LoaderIcon className="animate-spin-slow inline-block" />
          ) : dryRun?.available ? (
            dryRun.errorMessage ? (
              <Tooltip placement="bottom-end">
                <TooltipTrigger type="button" className="text-orange">
                  {t("Failed")}
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-alert-error">{dryRun.errorMessage}</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              t("Success")
            )
          ) : (
            <span className="text-disabled">{t("Unavailable")}</span>
          )}
        </div>
      </div>
    </>
  )
}

export const FooterContent = ({ isTransaction = false }: { isTransaction?: boolean }) => {
  const { t } = useTranslation("request")
  const {
    fee,
    request,
    payload,
    approve,
    reject,
    account,
    chain,
    approveHardware,
    approveQr,
    approveSignet,
    status,
    registry,
    shortMetadata,
  } = usePolkadotSigningRequest()

  const processing = useMemo(() => status === "PROCESSING", [status])

  if (!account || !request) return null
  return (
    <>
      {account.origin === AccountType.Watched && (
        <SignAlertMessage className="mb-6" type="error">
          {t("Cannot sign with a watch-only account.")}
        </SignAlertMessage>
      )}
      {isTransaction && (
        <>
          <DryRunRow />
          <EstimatedFeesRow />
        </>
      )}
      {(() => {
        switch (account.origin) {
          case AccountType.Dcent:
          case AccountType.Ledger:
          case // @ts-expect-error incomplete migration, remove once migration is completed
          "HARDWARE":
            return (
              <Suspense fallback={null}>
                <SignHardwareSubstrate
                  fee={isTransaction ? fee?.toString() : undefined}
                  payload={payload}
                  onSigned={approveHardware}
                  onCancel={reject}
                  containerId="main"
                  registry={registry}
                  shortMetadata={shortMetadata}
                />
              </Suspense>
            )
          case AccountType.Qr:
            return (
              <Suspense fallback={null}>
                <QrSubstrate
                  payload={payload}
                  account={account as AccountJsonQr}
                  genesisHash={chain?.genesisHash ?? account?.genesisHash ?? undefined}
                  onSignature={approveQr}
                  onReject={reject}
                  containerId="main"
                />
              </Suspense>
            )
          case AccountType.Signet:
            return (
              <SignSignetSubstrate
                account={account as AccountJsonSignet}
                payload={payload}
                onApprove={approveSignet}
                onCancel={reject}
              />
            )
          case AccountType.Talisman:
          default:
            return (
              <div className="grid w-full grid-cols-2 gap-12">
                <Button disabled={processing} onClick={reject}>
                  {t("Cancel")}
                </Button>
                <Button
                  processing={processing}
                  primary
                  disabled={account.origin === AccountType.Watched}
                  onClick={approve}
                >
                  {t("Approve")}
                </Button>
              </div>
            )
        }
      })()}
    </>
  )
}
