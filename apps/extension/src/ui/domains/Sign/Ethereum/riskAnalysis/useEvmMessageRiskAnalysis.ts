import { EvmSignTypedDataData, ScanMessageEvm200Response } from "@blowfishxyz/api-client/v20230605"
import { EthSignMessageMethod } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { BLOWFISH_API_KEY, log } from "extension-shared"
import urlJoin from "url-join"

import { getBlowfishApiUrl, getBlowfishClient, getBlowfishLanguage } from "./blowfish"
import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"

const getTypedDataPayload = (msg: string): EvmSignTypedDataData | null => {
  try {
    // parse and remove unsupported fields
    const { domain, message, primaryType, types } = JSON.parse(msg) as EvmSignTypedDataData
    return { domain, message, primaryType, types }
  } catch (err) {
    // most likely a text message
    return null
  }
}

type UseEvmMessageRiskAnalysisProps = {
  evmNetworkId: EvmNetworkId | undefined
  method: EthSignMessageMethod | undefined
  message: string | undefined
  account: string | undefined
  origin: string
  disableAutoRiskScan?: boolean
}

// TODO delete once client.scanMessage supports personal_sign
const fetchPersonalSignMessageScan = async (
  evmNetworkId: EvmNetworkId,
  message: string,
  account: string,
  origin: string
) => {
  try {
    const apiUrl = getBlowfishApiUrl(evmNetworkId)
    if (!apiUrl) return null

    const search = new URLSearchParams({ language: getBlowfishLanguage(), method: "personal_sign" })

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Api-Version": "2023-06-05",
    }
    if (BLOWFISH_API_KEY) headers["X-Api-Key"] = BLOWFISH_API_KEY

    const req = await fetch(`${urlJoin(apiUrl, "/scan/message")}?${search.toString()}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: {
          kind: "PERSONAL_SIGN",
          rawMessage: message,
        },
        metadata: {
          origin,
        },
        userAccount: account,
      }),
    })

    if (!req.ok) throw new Error(req.statusText)

    return req.json() as Promise<ScanMessageEvm200Response>
  } catch (err) {
    log.error("Failed to scan message", { err })
    throw new Error((err as Error).message)
  }
}

export const useEvmMessageRiskAnalysis = ({
  evmNetworkId,
  method,
  message,
  account,
  origin,
  disableAutoRiskScan,
}: UseEvmMessageRiskAnalysisProps) => {
  return useEvmRiskAnalysisBase({
    type: "message",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: ["useEvmMessageRiskAnalysis", evmNetworkId, method, message, account, origin],
    queryFn: () => {
      if (!evmNetworkId || !method || !message || !account) return null

      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      switch (method) {
        case "personal_sign": {
          // client.scanMessage doesn't support personal_sign yet
          // return client.scanMessage(message, account, { origin })

          // workaround while waiting on fix
          return fetchPersonalSignMessageScan(evmNetworkId, message, account, origin)
        }
        case "eth_signTypedData":
        case "eth_signTypedData_v4": {
          const payload = getTypedDataPayload(message)
          if (!payload) return null
          return client.scanSignTypedData(payload, account, { origin })
        }
        default:
          throw new Error("Unsupported message type. Proceed with caution")
      }
    },
    enabled: !!method && !!message && !!account && !!evmNetworkId,
  })
}
