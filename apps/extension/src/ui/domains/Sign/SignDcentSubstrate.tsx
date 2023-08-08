import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { log } from "@core/log"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { HexString } from "@polkadot/util/types"
import { classNames, planckToTokens } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import { DcentError, dcent } from "@ui/util/dcent"
import DcentWebConnector from "dcent-web-connector"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"

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
      return await getTypeRegistry(chainIdOrHash)
    },
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  })
}

const useDcentPayload = (payload: SignerPayloadRaw | SignerPayloadJSON, fee?: string) => {
  const { t } = useTranslation()
  const isJson = isJsonPayload(payload)
  const account = useAccountByAddress(payload.address)
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

export const SignDcentSubstrate: FC<{
  payload: SignerPayloadRaw | SignerPayloadJSON
  fee?: string
  containerId?: string
  className?: string
  showCancelButton?: boolean
  onCancel: () => void
  onSignaturePending?: (pending: boolean) => void
  onSigned: (result: { signature: HexString }) => Promise<void> | void
}> = ({
  payload,
  fee,
  showCancelButton,
  containerId,
  className,
  onCancel,
  onSignaturePending,
  onSigned,
}) => {
  const { t } = useTranslation("admin")
  const { errorMessage, dcentTx } = useDcentPayload(payload, fee)

  const [displayedErrorMessage, setDisplayedErrorMessage] = useState<string>()
  const [isSigning, setIsSigning] = useState(false)

  const handleSendClick = useCallback(async () => {
    if (!dcentTx) return
    setIsSigning(true)
    setDisplayedErrorMessage(undefined)
    onSignaturePending?.(true)

    try {
      const { signed_tx } = await dcent.getPolkadotSignedTransaction(dcentTx)

      // add prefix for ed25519 signature (0x00)
      return onSigned({ signature: `0x00${signed_tx.substring(2)}` })
    } catch (err) {
      log.error("Failed to sign", { err })
      if (err instanceof DcentError) {
        if (err.code === "user_cancel") onCancel?.()
        else setDisplayedErrorMessage(err.message ?? t("Failed to sign"))
      } else setDisplayedErrorMessage((err as Error).message ?? t("Failed to sign"))

      onSignaturePending?.(false)
      setIsSigning(false)
    }
  }, [dcentTx, onCancel, onSignaturePending, onSigned, t])

  useEffect(() => {
    // error from constructing payload
    if (errorMessage) setDisplayedErrorMessage(errorMessage)
  }, [errorMessage])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      <Button
        className="w-full"
        disabled={!dcentTx}
        processing={isSigning}
        primary
        onClick={handleSendClick}
      >
        {t("Approve on D'CENT")}
      </Button>
      {showCancelButton && (
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
