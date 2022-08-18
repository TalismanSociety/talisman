import type { AccountJson } from "@core/domains/accounts/types"
import { EvmNetworkId } from "@core/domains/ethereum/types"
import type {
  EthSignRequest,
  ResponseSigning,
  SubstrateSigningRequest,
} from "@core/domains/signing/types"
import type { TransactionRequest } from "@ethersproject/providers"

import { RequestStore } from "./BaseRequestStore"

export class SigningRequestsStore extends RequestStore {
  private getBaseEthRequest(url: string, ethChainId: EvmNetworkId, account: AccountJson) {
    return {
      url,
      ethChainId,
      account,
    }
  }

  public signAndSendEth(
    url: string,
    request: TransactionRequest,
    ethChainId: EvmNetworkId,
    account: AccountJson
  ) {
    return this.createRequest({
      ...this.getBaseEthRequest(url, ethChainId, account),
      request,
      type: "eth-send",
      method: "eth_sendTransaction",
    })
  }

  public signEth(
    url: string,
    method:
      | "personal_sign"
      | "eth_signTypedData"
      | "eth_signTypedData_v1"
      | "eth_signTypedData_v3"
      | "eth_signTypedData_v4",
    request: EthSignRequest["request"],
    ethChainId: EvmNetworkId,
    account: AccountJson
  ) {
    return this.createRequest({
      ...this.getBaseEthRequest(url, ethChainId, account),
      type: "eth-sign",
      method,
      request,
    })
  }

  public sign(
    url: string,
    request: SubstrateSigningRequest["request"],
    account: AccountJson
  ): Promise<ResponseSigning> {
    return this.createRequest({
      type: "substrate-sign",
      url,
      request,
      account,
    }) as Promise<ResponseSigning>
  }
}
