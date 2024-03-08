import { RequestUpsertCustomChain } from "@extension/core"
import { SignerPayloadGenesisHash } from "@extension/core"

export type SubNetworkFormBaseProps = {
  onSubmitted?: () => void
}

type SubNetworkFormRpcField = RequestUpsertCustomChain["rpcs"][number] & {
  genesisHash?: SignerPayloadGenesisHash
}

export type SubNetworkFormData = RequestUpsertCustomChain & {
  rpcs: SubNetworkFormRpcField[]
}
