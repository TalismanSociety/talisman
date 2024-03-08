import { log } from "@extension/shared"
import DcentWebConnector from "dcent-web-connector"

import {
  DcentAccountAddress,
  DcentAccountInfo,
  DcentDeviceInfo,
  DcentError,
  DcentEthereumSignedData,
  DcentEthereumSignedMessage,
  DcentEthereumSignedTransaction,
  DcentInfo,
  DcentSubstratePayload,
  DcentSubstrateSignature,
} from "./types"

type DcentResponseStatus = "success" | "error"

type DcentResponseHeader<S extends DcentResponseStatus> = {
  version: string
  request_from: string
  status: S
}

type DcentResponseBodySuccess<T> = {
  command: string
  parameter: T
}

type DcentResponseBodyError = {
  command: string
  error: {
    code: string
    message: string
  }
}

type DcentResponseSuccess<T> = {
  header: DcentResponseHeader<"success">
  body: DcentResponseBodySuccess<T>
}

type DcentResponseError = {
  header: DcentResponseHeader<"error">
  body: DcentResponseBodyError
}

type DcentResponse<T> = DcentResponseSuccess<T> | DcentResponseError

const isDcentResponseError = <T>(
  response: DcentResponse<T> | unknown
): response is DcentResponseError => {
  try {
    return (response as DcentResponse<T>).header.status === "error"
  } catch (err) {
    return false
  }
}

const isDcentResponseSuccess = <T>(
  response: DcentResponse<T>
): response is DcentResponseSuccess<T> => {
  return response.header.status === "success"
}

const dcentCall = async <T>(func: () => Promise<DcentResponse<T>>): Promise<T> => {
  try {
    const res = (await func()) as DcentResponse<T>
    if (isDcentResponseSuccess(res)) return res.body.parameter
    if (isDcentResponseError(res)) throw new DcentError(res.body.error.code, res.body.error.message)

    log.error("Unexpected D'CENT response", { res })
    throw new Error("Unexpected D'CENT response")
  } catch (err) {
    // could be a timeout, they are thrown as a dcent error payload
    if (isDcentResponseError(err)) throw new DcentError(err.body.error.code, err.body.error.message)
    throw err
  }
}

// typed api that hides the response envelopes
export const dcent = {
  getAccountInfo: () => dcentCall<DcentAccountInfo>(DcentWebConnector.getAccountInfo),

  getAddress: (coinType: string, keyPath: string) =>
    dcentCall<DcentAccountAddress>(() => DcentWebConnector.getAddress(coinType, keyPath)),

  getDeviceInfo: () => dcentCall<DcentDeviceInfo>(DcentWebConnector.getDeviceInfo),

  getEthereumSignedData: (accountPath: string, version: string, payload: unknown) =>
    dcentCall<DcentEthereumSignedData>(() =>
      DcentWebConnector.getSignedData(accountPath, { version, payload })
    ),

  getEthereumSignedMessage: (accountPath: string, text: string) =>
    dcentCall<DcentEthereumSignedMessage>(() =>
      DcentWebConnector.getEthereumSignedMessage(text, accountPath)
    ),

  getEthereumSignedTransaction: (...args: unknown[]) =>
    dcentCall<DcentEthereumSignedTransaction>(() =>
      DcentWebConnector.getEthereumSignedTransaction(...args)
    ),

  getInfo: () => dcentCall<DcentInfo>(DcentWebConnector.info),

  getPolkadotSignedTransaction: (payload: DcentSubstratePayload) =>
    dcentCall<DcentSubstrateSignature>(() =>
      DcentWebConnector.getPolkadotSignedTransaction(payload)
    ),

  popupWindowClose: () => {
    DcentWebConnector.popupWindowClose()
  },
}
