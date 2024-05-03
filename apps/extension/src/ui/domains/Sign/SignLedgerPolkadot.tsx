import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { TypeRegistry } from "@polkadot/types"
import { assert, hexToU8a, u8aToHex } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import {
  AccountJsonHardwarePolkadot,
  SignerPayloadJSON,
  SignerPayloadRaw,
  isJsonPayload,
} from "extension-core"
import { log } from "extension-shared"
// import initMetadataShortener, { cut_metadata_wrapper } from "metadata-shortener-wasm"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"

const LEDGER_NO_ERRORS = "No errors"

const registry = new TypeRegistry()

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

// const getMetadataV15 = async (chainId: string, blockHash?: `0x${string}`) => {
//   const registry = new TypeRegistry()
//   const version = registry.createType("u32", 15)

//   const result = await stateCall(
//     chainId,
//     "Metadata_metadata_at_version",
//     "Option<OpaqueMetadata>",
//     [version],
//     blockHash,
//     true
//   )
//   // const result2 = await stateCallRaw(
//   //   chainId,
//   //   "Metadata_metadata_at_version",
//   //   [$.u32.encode(15)],
//   //   blockHash,
//   //   true
//   // )
//   //console.log("getMetadataV15", { result, result2 })

//   return result.isSome ? result.unwrap() : null
// }

// const $shortSpecs = $.object(
//   $.field("base58prefix", $.u16),
//   $.field("decimals", $.u8),
//   $.field("unit", $.str)
// )

//const getShortSpecs = async (chainId: string, blockHash?: `0x${string}`) => {}

// const useLedgerPolkadotInputs = (payload: SignerPayloadJSON | SignerPayloadRaw | undefined) => {
//   const jsonPayload = payload && isJsonPayload(payload) ? payload : undefined

//   const chain = useChainByGenesisHash(jsonPayload ? jsonPayload.genesisHash : undefined)
//   const nativeToken = useToken(chain?.nativeToken?.id)

//   // const hexShortSpecs = useMemo(
//   //   () =>
//   //     chain && nativeToken
//   //       ? u8aToHex(
//   //           $shortSpecs.encode({
//   //             base58prefix: chain.prefix ?? 0,
//   //             decimals: nativeToken.decimals,
//   //             unit: nativeToken.symbol,
//   //           })
//   //         )
//   //       : null,
//   //   [chain, nativeToken]
//   // )

//   return useQuery({
//     queryKey: ["useLedgerPolkadotInputs", chain, nativeToken, jsonPayload],
//     queryFn: async () => {
//       if (!chain || !nativeToken || !jsonPayload) return null

//       const bytes = await getMetadataV15(chain.id, jsonPayload.blockHash)
//       if (!bytes) return null

//       const metadata = u8aToHex(bytes)

//       const specs = u8aToHex(
//         $shortSpecs.encode({
//           base58prefix: chain.prefix ?? 0,
//           decimals: nativeToken.decimals,
//           unit: nativeToken.symbol,
//         })
//       )

//       const calldata = jsonPayload.method

//       await initMetadataShortener()

//       //console.log("before cut", { calldata, metadata, specs })
//       const res = cut_metadata_wrapper(calldata, metadata, specs)

//       //console.log("useLedgerPolkadotInputs", { res })

//       return res
//       // const registry = new TypeRegistry()
//       // const version = registry.createType("u32", 15)

//       // const resultRaw = await stateCallRaw(
//       //   chain.id,
//       //   "Metadata_metadata_at_version",
//       //   [version],
//       //   jsonPayload?.blockHash,
//       //   true
//       // )

//       // console.log("useLedgerPolkadotInputs.useQuery", { resultRaw })

//       // const result = await stateCall(
//       //   chain.id,
//       //   "Metadata_metadata_at_version",
//       //   "Option<OpaqueMetadata>",
//       //   [version],
//       //   jsonPayload?.blockHash,
//       //   true
//       // )

//       // if (result.isSome) {
//       //   const metadata = result.unwrap()

//       //   // this fails :(
//       //   // const metadatav15 = registry.createType("MetadataV15", metadata)

//       //   // console.log("isDecoded", metadata.isDecoded)
//       //   // console.log("metadata.toHex", { hex: metadata.toHex() })
//       //   console.log("human", { human: metadatav15.toHuman() })

//       //   return result.unwrap().toHex()
//       // }
//     },
//     refetchInterval: false,
//     retry: false,
//   })

//   // useEffect(() => {
//   //   console.log("useLedgerPolkadotInputs.out", { payload, hexMetadataV15, error })
//   // }, [error, hexMetadataV15, payload])

//   // useEffect(() => {
//   //   try {
//   //     console.log({ sup })
//   //     initMetadataShortener()
//   //       .then(() => {
//   //         sup()
//   //       })
//   //       .catch((errInit) => {
//   //         console.error("initMetadataShortener", errInit)
//   //       })
//   //   } catch (err) {
//   //     console.error("useLedgerPolkadotInputs", err)
//   //   }
//   // }, [])

//   // return {
//   //   hexShortSpecs,
//   //   hexMetadataV15
//   // }
// }

const useLedgerPolkadotInputs = (payload: SignerPayloadJSON | SignerPayloadRaw | undefined) => {
  const jsonPayload = payload && isJsonPayload(payload) ? payload : undefined
  const chain = useChainByGenesisHash(jsonPayload ? jsonPayload.genesisHash : undefined)
  const nativeToken = useToken(chain?.nativeToken?.id)

  return useQuery({
    queryKey: ["fetch-shortened-metadata", chain, nativeToken, jsonPayload],
    queryFn: async () => {
      if (!chain || !nativeToken || !jsonPayload) return null

      // console.log("payload", payload)

      // console.log(JSON.stringify(payload, undefined, 2))
      // jsonPayload.signedExtensions.push("CheckMetadataHash")

      const registry = new TypeRegistry()
      registry.setSignedExtensions(jsonPayload.signedExtensions)
      const extPayload = registry.createType("ExtrinsicPayload", jsonPayload, {
        version: jsonPayload.version,
      })

      const req = await fetch("https://api.zondax.ch/polkadot/transaction/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          chain: { id: "dot-hub" }, //TODO id mapping list :jean:
          txBlob: u8aToHex(extPayload.toU8a(true)),
        }),
      })

      if (!req.ok) {
        log.error("Failed to fetch shortened metadata", {
          status: req.status,
          statusText: req.statusText,
        })
        throw new Error("Failed to fetch shortened metadata")
      }

      const { txMetadata } = (await req.json()) as { txMetadata: HexString }
      //  console.log("res", txMetadata)
      // const bytes = await getMetadataV15(chain.id, jsonPayload.blockHash)

      return { shortMetadata: txMetadata, ticker: "dot", extPayload }
    },
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  })
}

const SignLedgerPolkadot: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
}) => {
  const account = useAccountByAddress(payload?.address)
  useLedgerPolkadotInputs(payload)

  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  //const [unsigned, setUnsigned] = useState<Uint8Array>()
  //const [isRaw, setIsRaw] = useState<boolean>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedgerPolkadot()

  // reset
  useEffect(() => {
    setIsSigned(false)
  }, [payload])

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? t("Please approve from your Ledger.") : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry, t]
  )

  // useEffect(() => {
  //   if (!payload) return

  //   if (isRawPayload(payload)) {
  //     console.log("payload", payload)
  //     setUnsigned(wrapBytes(payload.data))
  //     setIsRaw(true)
  //     return
  //   }

  //   if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
  //   const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
  //     version: payload.version,
  //   })
  //   setUnsigned(extrinsicPayload.toU8a(true))
  //   setIsRaw(false)
  // }, [payload, t])

  // const onRefresh = useCallback(() => {
  //   refresh()
  //   setError(null)
  // }, [refresh, setError])

  const { data: inputs, error: errorInputs } = useLedgerPolkadotInputs(payload)

  const inputsReady = useMemo(
    () => !!payload && (!isJsonPayload(payload) || inputs),
    [payload, inputs]
  )

  const signLedger = useCallback(async () => {
    if (!ledger || !onSigned || !account || !inputsReady || !payload) return

    try {
      const derivationPath = (account as AccountJsonHardwarePolkadot).path
      assert(derivationPath, "Account derivation path not found")
      log.log("signing", { payload, account })

      if (isRawPayload(payload)) {
        setError(null)
        const signResult = await ledger.signRaw(
          derivationPath,
          Buffer.from(wrapBytes(payload.data))
        )

        if (signResult.errorMessage !== LEDGER_NO_ERRORS) throw new Error(signResult.errorMessage)
        const signature = ("0x" + signResult.signature.toString("hex")) as `0x${string}`
        await onSigned({ signature })
      } else {
        if (errorInputs && (errorInputs as Error)?.message) {
          setError((errorInputs as Error).message)
          return
        }
        if (!inputs) {
          setError("Metadata not found")
          return
        }

        const { shortMetadata, extPayload } = inputs

        setError(null)
        if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)

        const signResult = await ledger.sign(
          derivationPath,
          Buffer.from(extPayload.toU8a(true)),
          Buffer.from(hexToU8a(shortMetadata))
        )

        if (signResult.errorMessage !== LEDGER_NO_ERRORS) throw new Error(signResult.errorMessage)
        const signature = ("0x" + signResult.signature.toString("hex")) as `0x${string}`
        await onSigned({ signature })
        throw new Error("not implemented")
      }
    } catch (error) {
      const message = (error as Error)?.message

      switch (message) {
        // TODO tx rejected
        case "Transaction rejected":
          window.close() // closing the popup rejects the tx
          return

        // case "Txn version not supported":
        //   return setError(
        //     t(
        //       "This type of transaction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
        //     )
        //   )

        // case "Instruction not supported":
        //   return setError(
        //     t(
        //       "This instruction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
        //     )
        //   )

        default:
          log.error("ledger sign Polkadot : " + message, { error })
          setError(message)
      }
    }
  }, [ledger, onSigned, account, inputsReady, payload, errorInputs, inputs])

  const _onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const handleSendClick = useCallback(() => {
    setIsSigning(true)
    onSentToDevice?.(true)
    signLedger()
      .catch(() => onSentToDevice?.(false))
      .finally(() => setIsSigning(false))
  }, [onSentToDevice, signLedger])

  const handleCloseDrawer = useCallback(() => setError(null), [setError])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <>
          {isReady ? (
            <Button
              className="w-full"
              disabled={!inputsReady}
              primary
              processing={isSigning}
              onClick={handleSendClick}
            >
              {t("Approve on Ledger")}
            </Button>
          ) : (
            !isSigned && (
              <LedgerConnectionStatus {...{ ...connectionStatus }} refresh={_onRefresh} />
            )
          )}
        </>
      )}
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      )}
      {error && (
        <Drawer anchor="bottom" isOpen={true} containerId={containerId}>
          <LedgerSigningStatus
            message={error ? error : ""}
            status={error ? "error" : isSigning ? "signing" : undefined}
            confirm={handleCloseDrawer}
          />
        </Drawer>
      )}
    </div>
  )
}

// default export to allow for lazy loading
export default SignLedgerPolkadot
