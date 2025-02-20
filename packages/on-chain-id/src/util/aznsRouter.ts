import { Abi } from "@polkadot/api-contract"
import { ProviderInterface } from "@polkadot/rpc-provider/types"
import { Result, Tuple, TypeRegistry, Vec } from "@polkadot/types"
import { AccountId } from "@polkadot/types/interfaces"
import { ContractExecResult } from "@polkadot/types/interfaces/contracts"
import { u8aConcatStrict, u8aToHex } from "@polkadot/util"

import aznsRouterAbiJson from "../abis/aznsRouter.json"

const ROUTER_ABI = new Abi(aznsRouterAbiJson)

type ProviderOptions = {
  chainId: string
  provider: ProviderInterface
  registry: TypeRegistry
}

const ROUTER_ADDRESS: Record<string, string> = {
  "alephzero": "5FfRtDtpS3Vcr7BTChjPiQNrcAKu3VLv4E1NGF6ng6j3ZopJ",
  "alephzero-testnet": "5HXjj3xhtRMqRYCRaXTDcVPz3Mez2XBruyujw6UEkvn8PCiA",
}

const readContract = async (
  provider: ProviderInterface,
  registry: TypeRegistry,
  from: string,
  contractAddress: string,
  data: Uint8Array,
) => {
  const rawResult = await provider.send("state_call", [
    "ContractsApi_call",
    u8aToHex(
      u8aConcatStrict([
        // origin
        registry.createType("AccountId", from).toU8a(),
        // dest
        registry.createType("AccountId", contractAddress).toU8a(),
        // value
        registry.createType("Balance", 0).toU8a(),
        // gasLimit
        registry.createType("Option<WeightV2>").toU8a(),
        // storageDepositLimit
        registry.createType("Option<Balance>").toU8a(),
        // inputData
        data,
      ]),
    ),
  ])

  return registry.createType<ContractExecResult>("ContractExecResult", rawResult)
}

export const resolveDomainToAddress = async (
  domain: string,
  { provider, registry, chainId }: ProviderOptions,
) => {
  try {
    const routerAddress = ROUTER_ADDRESS[chainId]
    if (!routerAddress) throw new Error(`No azns router address found for chainId: ${chainId}`)

    const message = ROUTER_ABI.findMessage("get_address")
    if (!message) throw new Error(`No get_address message found in aznsRouter abi`)

    const { result } = await readContract(
      provider,
      registry,
      routerAddress,
      routerAddress,
      message.toU8a([domain]),
    )

    if (!result.isOk) throw result.asErr

    const resultType = message.returnType!.lookupName ?? message.returnType!.type

    const returnValue = registry.createTypeUnsafe<
      // we dont have the error types: Result<Result<AccountId, AznsRegistryError>, InkPrimitivesLangError>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Result<Result<AccountId, any>, any>
    >(resultType, [result.asOk.data.toU8a(true)], { isPedantic: true })

    if (!returnValue.isOk) throw returnValue.asErr
    if (!returnValue.asOk.isOk) throw returnValue.asOk.asErr

    return returnValue.asOk.asOk.toString()
  } catch (cause) {
    throw new Error(`Failed to resolve azns domain ${domain} on ${chainId}`, { cause })
  }
}

export const resolveAddressToDomain = async (
  address: string,
  { provider, registry, chainId }: ProviderOptions,
) => {
  try {
    const routerAddress = ROUTER_ADDRESS[chainId]
    if (!routerAddress) throw new Error(`No azns router address found for chainId: ${chainId}`)

    const message = ROUTER_ABI.findMessage("get_primary_domains")
    if (!message) throw new Error(`No get_address get_primary_domains found in aznsRouter abi`)

    const { result } = await readContract(
      provider,
      registry,
      routerAddress,
      routerAddress,
      message.toU8a([address, undefined]),
    )

    if (!result.isOk) throw result.asErr

    const resultType = message.returnType!.lookupName ?? message.returnType!.type

    const returnValue = registry.createTypeUnsafe<
      // we dont have the error types: Result<Vec<(AccountId,Text)>, InkPrimitivesLangError>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Result<Vec<Tuple>, any>
    >(resultType, [result.asOk.data.toU8a(true)], { isPedantic: true })

    if (!returnValue.isOk) throw returnValue.asErr

    return returnValue.asOk[0]?.[1]?.toString() ?? null
  } catch (cause) {
    throw new Error(`Failed to lookup azns domain for ${address} on ${chainId}`, { cause })
  }
}
