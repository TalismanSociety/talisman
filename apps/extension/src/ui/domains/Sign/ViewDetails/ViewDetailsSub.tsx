import { isJsonPayload } from "@extension/core"
import {
  BalanceFormatter,
  SignerPayloadJSON,
  SignerPayloadRaw,
  TransactionMethod,
} from "@extension/core"
import { TypeRegistry } from "@polkadot/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetailsAddress } from "./ViewDetailsAddress"
import { ViewDetailsAmount } from "./ViewDetailsAmount"
import { ViewDetailsButton } from "./ViewDetailsButton"
import { ViewDetailsField } from "./ViewDetailsField"
import { ViewDetailsTxDesc } from "./ViewDetailsTxDesc"
import { ViewDetailsTxObject } from "./ViewDetailsTxObject"

const ViewDetailsContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation("request")
  const { genericEvent } = useAnalytics()
  const { chain, payload, extrinsic, errorDecodingExtrinsic, fee, errorFee } =
    usePolkadotSigningRequest()
  const nativeToken = useToken(chain?.nativeToken?.id)
  const nativeTokenRates = useTokenRates(nativeToken?.id)

  const isExtrinsic = isJsonPayload(payload)

  const { data, type } = (payload || {}) as SignerPayloadRaw
  const { tip: tipRaw } = (payload || {}) as SignerPayloadJSON

  const tip = useMemo(
    () =>
      nativeToken && tipRaw
        ? new BalanceFormatter(tipRaw, nativeToken?.decimals, nativeTokenRates)
        : undefined,
    [nativeToken, nativeTokenRates, tipRaw]
  )

  const { estimatedFee, estimatedFeeError } = useMemo(
    () => ({
      estimatedFee:
        fee !== undefined && fee !== null
          ? new BalanceFormatter(fee, nativeToken?.decimals, nativeTokenRates)
          : undefined,
      estimatedFeeError: errorFee ? t("Failed to calculate fee.") : "",
    }),
    [fee, errorFee, nativeToken?.decimals, nativeTokenRates, t]
  )

  const decodedPayload = useMemo(() => {
    try {
      const typeRegistry = new TypeRegistry()
      return typeRegistry.createType("ExtrinsicPayload", payload)
    } catch (err) {
      return null
    }
  }, [payload])

  const { methodName, args, decodedMethod } = useMemo(() => {
    if (!extrinsic) return { methodName: t("Unknown") }

    const methodName = `${extrinsic.method.section} : ${extrinsic.method.method}`

    const decodedMethod = extrinsic.method.toHuman(true) as TransactionMethod
    const decoded = extrinsic.method.toHuman() as TransactionMethod
    const args = decoded?.args

    return { methodName, args, decodedMethod }
  }, [extrinsic, t])

  useEffect(() => {
    genericEvent("open sign transaction view details", { type: "substrate" })
  }, [genericEvent])

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto overflow-x-hidden pr-4 text-sm leading-[2rem]">
        <div className="text-body-secondary">{t("Details")}</div>
        <ViewDetailsAddress
          label={t("From")}
          address={payload.address}
          chainPrefix={chain?.prefix}
          blockExplorerUrl={chain?.subscanUrl}
        />

        {isExtrinsic ? (
          <>
            <ViewDetailsField label={t("Network")}>{chain?.name ?? t("Unknown")}</ViewDetailsField>
            <ViewDetailsAmount
              label={t("Fees")}
              error={estimatedFeeError}
              amount={estimatedFee}
              token={nativeToken}
            />
            <ViewDetailsAmount label={t("Tip")} amount={tip} token={nativeToken} />
            <ViewDetailsField
              label={t("Decoding error")}
              error={errorDecodingExtrinsic ? t("Failed to decode method.") : ""}
            />
            <ViewDetailsField label={t("Method")}>{methodName}</ViewDetailsField>
            <ViewDetailsTxDesc label={t("Description")} method={decodedMethod} />
            <ViewDetailsTxObject label={t("Arguments")} obj={args} />
            <ViewDetailsTxObject label={t("Payload")} obj={decodedPayload?.toHuman()} />
          </>
        ) : (
          <>
            <ViewDetailsField label={t("Type")}>{type}</ViewDetailsField>
            <ViewDetailsField label={t("Data")}>
              {data && (
                <div className="mt-2 pr-2">
                  <pre className="text-body-secondary scrollable scrollable-700 bg-black-secondary rounded-xs w-full overflow-x-auto p-4">
                    {data}
                  </pre>
                </div>
              )}
            </ViewDetailsField>
          </>
        )}
      </div>
      <Button className="shrink-0" onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}

export const ViewDetailsSub: FC = () => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <ViewDetailsButton onClick={open} hide={isOpen} />
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
