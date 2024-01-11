import { RequestUpsertCustomChain } from "@core/domains/chains/types"
import { SignerPayloadGenesisHash } from "@core/domains/signing/types"

export type SubNetworkFormBaseProps = {
  onSubmitted?: () => void
}

type SubNetworkFormRpcField = RequestUpsertCustomChain["rpcs"][number] & {
  genesisHash?: SignerPayloadGenesisHash
}

export type SubNetworkFormData = RequestUpsertCustomChain & {
  rpcs: SubNetworkFormRpcField[]
}
