import { RpcTransactionRequest } from "viem"

import { requestStore } from "../../libs/requests/store"
import type { Port } from "../../types/base"
import type { AccountJson } from "../accounts/types"
import { EvmNetworkId } from "../ethereum/types"
import type { EthSignRequest, SubstrateSigningRequest } from "./types"

export const signAndSendEth = (
  url: string,
  request: RpcTransactionRequest,
  ethChainId: EvmNetworkId,
  account: AccountJson,
  port: Port
) => {
  return requestStore.createRequest(
    {
      url,
      ethChainId,
      account,
      request,
      type: "eth-send",
      method: "eth_sendTransaction",
    },
    port
  )
}

export const signEth = (
  url: string,
  method:
    | "personal_sign"
    | "eth_signTypedData"
    | "eth_signTypedData_v1"
    | "eth_signTypedData_v3"
    | "eth_signTypedData_v4",
  request: EthSignRequest["request"],
  ethChainId: EvmNetworkId,
  account: AccountJson,
  port: Port
) => {
  return requestStore.createRequest(
    {
      url,
      ethChainId,
      account,
      type: "eth-sign",
      method,
      request,
    },
    port
  )
}

export const signSubstrate = (
  url: string,
  request: SubstrateSigningRequest["request"],
  account: AccountJson,
  port: Port
) => {
  return requestStore.createRequest(
    {
      type: "substrate-sign",
      url,
      request,
      account,
    },
    port
  )
}
