import type { EthNetworkId } from "@talismn/chaindata-provider"
import type { Account } from "@talismn/keyring"
import type { RpcTransactionRequest } from "viem"
import { requestStore } from "../../libs/requests/store"
import type { Port } from "../../types/base"
import type { EthRequestSignArguments } from "../ethereum/types"
import type {
  EthSignRequest,
  SolSignRequest,
  SolSignResult,
  SubstrateSigningRequest,
  VrfSigningRequest,
} from "./types"

export const signAndSendEth = (
  url: string,
  request: RpcTransactionRequest,
  ethChainId: EthNetworkId,
  account: Account,
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
  params: EthRequestSignArguments["params"],
  request: EthSignRequest["request"],
  ethChainId: EthNetworkId,
  account: Account,
  port: Port
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
    port
  )
}

export const signSubstrate = (
  url: string,
  request: SubstrateSigningRequest["request"],
  account: Account,
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

export const signVrf = (
  url: string,
  request: VrfSigningRequest["request"],
  account: Account,
  port: Port
) => {
  return requestStore.createRequest(
    {
      type: "vrf-sign",
      url,
      request,
      account,
    },
    port
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
  request: Req
): Promise<Res> => {
  return requestStore.createRequest(
    {
      type: "sol-sign",
      url,
      request,
      account,
    },
    port
  ) as Promise<Res>
}
