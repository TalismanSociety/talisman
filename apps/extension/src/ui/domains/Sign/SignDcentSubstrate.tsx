import { isJsonPayload, isRawPayload } from "@extension/core"
import { SignerPayloadJSON, SignerPayloadRaw } from "@extension/core"
import { log } from "@extension/shared"
import { classNames, planckToTokens } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import { DcentError, dcent } from "@ui/util/dcent"
import { useBringPopupBackInFront } from "@ui/util/dcent/useBringPopupBackInFront"
import { getFrontendTypeRegistry } from "@ui/util/getFrontendTypeRegistry"
import DcentWebConnector from "dcent-web-connector"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"

export type DcentSubstratePayload = {
  coinType: string
  sigHash: string
  fee: string
  path: string
  symbol: string
  decimals: number
}

const useTypeRegistry = (chainIdOrHash: string | null) => {
  return useQuery({
    queryKey: ["useTypeRegistry", chainIdOrHash],
    queryFn: async () => {
      if (!chainIdOrHash) return null
      return await getFrontendTypeRegistry(chainIdOrHash)
    },
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  })
}

const useDcentPayload = (payload?: SignerPayloadRaw | SignerPayloadJSON, fee?: string) => {
  const { t } = useTranslation()
  const isJson = payload && isJsonPayload(payload)
  const account = useAccountByAddress(payload?.address)
  const chain = useChainByGenesisHash(isJson ? payload.genesisHash : null)
  const { data: chainRegistry } = useTypeRegistry(chain?.genesisHash ?? null)

  const token = useToken(chain?.nativeToken?.id)

  const { isValid, sigHash, errorMessage } = useMemo(() => {
    if (!isJson || !chainRegistry)
      return { isValid: false, sigHash: undefined, errorMessage: undefined }

    if (payload.signedExtensions)
      chainRegistry.registry.setSignedExtensions(payload.signedExtensions)

    // specVersion & transactionVersion have to be passed in a runtimeVersion property, weird.
    const signerPayload = chainRegistry.registry.createType("SignerPayload", {
      ...payload,
      runtimeVersion: {
        specVersion: payload.specVersion,
        transactionVersion: payload.transactionVersion,
      },
    })

    try {
      return {
        isValid: true,
        sigHash: signerPayload.toRaw().data,
        errorMessage: undefined,
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to create unsigned payload", { err })
      return {
        isValid: false,
        sigHash: undefined,
        errorMessage: (err as Error).message || t("Invalid payload"),
      }
    }
  }, [chainRegistry, isJson, payload, t])

  const dcentTx = useMemo(
    () =>
      sigHash && account && token
        ? ({
            coinType: DcentWebConnector.coinType.POLKADOT,
            sigHash,
            path: account.path,
            symbol: token.symbol,
            fee: planckToTokens(fee ?? "0", token.decimals),
            decimals: token.decimals,
          } as DcentSubstratePayload)
        : null,
    [account, fee, sigHash, token]
  )

  return {
    isValid, //tx may be valid, will be true even if metadata breaks
    errorMessage,
    dcentTx,
  }
}

export const SignDcentSubstrate: FC<SignHardwareSubstrateProps> = ({
  payload,
  fee,
  containerId,
  className,
  onCancel,
  onSentToDevice,
  onSigned,
}) => {
  const { t } = useTranslation("admin")
  const { errorMessage, dcentTx } = useDcentPayload(payload, fee)

  const [displayedErrorMessage, setDisplayedErrorMessage] = useState<string>()
  const [isSigning, setIsSigning] = useState(false)
  const { startListening, stopListening } = useBringPopupBackInFront()

  const handleSendClick = useCallback(async () => {
    if (!dcentTx) return
    setIsSigning(true)
    setDisplayedErrorMessage(undefined)
    onSentToDevice?.(true)

    try {
      // this will open the bridge page that may hide Talisman popup => bring talisman back in front
      startListening()
      const { signed_tx } = await dcent.getPolkadotSignedTransaction(dcentTx)
      stopListening()

      // add prefix for ed25519 signature (0x00)
      return onSigned({ signature: `0x00${signed_tx.substring(2)}` })
    } catch (err) {
      stopListening()
      log.error("Failed to sign", { err })
      if (err instanceof DcentError) {
        if (err.code !== "user_cancel") setDisplayedErrorMessage(err.message)
      } else setDisplayedErrorMessage((err as Error).message ?? t("Failed to sign"))

      onSentToDevice?.(false)
      setIsSigning(false)
      dcent.popupWindowClose()
    }
  }, [dcentTx, onSentToDevice, onSigned, startListening, stopListening, t])

  useEffect(() => {
    // error from constructing payload
    if (errorMessage) setDisplayedErrorMessage(errorMessage)
  }, [errorMessage])

  const showCannotSignTextMessages = useMemo(() => payload && isRawPayload(payload), [payload])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      <Tooltip placement="top">
        <TooltipTrigger asChild>
          <div>
            <Button
              className="w-full"
              disabled={!dcentTx || showCannotSignTextMessages}
              processing={isSigning}
              primary
              onClick={handleSendClick}
            >
              {t("Approve on D'CENT")}
            </Button>
          </div>
        </TooltipTrigger>
        {showCannotSignTextMessages && (
          <TooltipContent>
            {t("D'CENT currently cannot sign text messages for Polkadot")}
          </TooltipContent>
        )}
      </Tooltip>
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      )}
      <ErrorMessageDrawer
        message={displayedErrorMessage}
        containerId={containerId}
        onDismiss={() => setDisplayedErrorMessage(undefined)}
      />
    </div>
  )
}
