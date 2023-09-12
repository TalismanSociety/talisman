import { AccountJsonQr, AccountType, AccountTypes } from "@core/domains/accounts/types"
import { InfoIcon, LoaderIcon } from "@talisman/theme/icons"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { SignHardwareSubstrate } from "@ui/domains/Sign/SignHardwareSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

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
                "We are unable to detect which currency will be used for fees in this transaction."
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
            <TooltipTrigger>{t("Unknown")}</TooltipTrigger>
            <TooltipContent>{t("Failed to compute fee")}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={fee ?? undefined} tokenId={feeToken?.id} />
        )}
      </div>
    </div>
  )
}

export const FooterContent = ({ withFee = false }: { withFee?: boolean }) => {
  const { t } = useTranslation("request")
  const { fee, request, approve, reject, account, chain, approveHardware, approveQr, status } =
    usePolkadotSigningRequest()

  const processing = useMemo(() => status === "PROCESSING", [status])

  if (!account || !request) return null
  return (
    <>
      {withFee && <EstimatedFeesRow />}
      {account.origin === AccountTypes.TALISMAN && (
        <div className="grid w-full grid-cols-2 gap-12">
          <Button disabled={processing} onClick={reject}>
            {t("Cancel")}
          </Button>
          <Button disabled={processing} processing={processing} primary onClick={approve}>
            {t("Approve")}
          </Button>
        </div>
      )}
      {account.origin &&
        ([AccountTypes.DCENT, AccountTypes.LEDGER] as AccountType[]).includes(account.origin) && (
          <Suspense fallback={null}>
            <SignHardwareSubstrate
              fee={withFee ? fee?.toString() : undefined}
              payload={request.payload}
              onSigned={approveHardware}
              onCancel={reject}
              containerId="main"
            />
          </Suspense>
        )}
      {account.origin === AccountTypes.QR && (
        <Suspense fallback={null}>
          <QrSubstrate
            payload={request.payload}
            account={account as AccountJsonQr}
            genesisHash={chain?.genesisHash ?? account?.genesisHash ?? undefined}
            onSignature={approveQr}
            onReject={reject}
            containerId="main"
          />
        </Suspense>
      )}
    </>
  )
}
