import { EthNetworkId } from "@talismn/chaindata-provider"
import { Account } from "@talismn/keyring"
import { RpcTransactionRequest } from "viem"

import type { Port } from "../../types/base"
import type {
  EthSignRequest,
  SolSignRequest,
  SolSignResult,
  SubstrateSigningRequest,
} from "./types"
import { requestStore } from "../../libs/requests/store"
import { EthRequestSignArguments } from "../ethereum/types"

export const signAndSendEth = (
  url: string,
  request: RpcTransactionRequest,
  ethChainId: EthNetworkId,
  account: Account,
  port: Port,
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
    port,
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
  params: EthRequestSignArguments["params"],
  request: EthSignRequest["request"],
  ethChainId: EthNetworkId,
  account: Account,
  port: Port,
) => {
  return requestStore.createRequest(
    {
      url,
      ethChainId,
      account,
      type: "eth-sign",
      method,
      params,
      request,
    },
    port,
  )
}

export const signSubstrate = (
  url: string,
  request: SubstrateSigningRequest["request"],
  account: Account,
  port: Port,
) => {
  return requestStore.createRequest(
    {
      type: "substrate-sign",
      url,
      request,
      account,
    },
    port,
  )
}

export const signSolana = <
  T extends SolSignRequest["type"],
  Req = Extract<SolSignRequest, { type: T }>,
  Res = Extract<SolSignResult, { type: T }>,
>(
  url: string,
  port: Port,
  account: Account,
  request: Req,
): Promise<Res> => {
  return requestStore.createRequest(
    {
      type: "sol-sign",
      url,
      request,
      account,
    },
    port,
  ) as Promise<Res>
}
