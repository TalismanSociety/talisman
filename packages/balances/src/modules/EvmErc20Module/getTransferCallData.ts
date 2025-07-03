import { IBalanceModule } from "../IBalanceModule"

export const getTransferCallData: IBalanceModule<"evm-erc20">["getTransferCallData"] = () =>
  //   {
  //   from,
  //   to,
  //   planck,
  //   token,
  //   metadataRpc,
  // }
  {
    throw new Error("Not implemented")
    // // there is only one transfer method, no existential deposit handling.
    // // => leave this to the frontend and dry runs
    // const builder = getDynamicBuilder(getLookupFn(unifyMetadata(decAnyMetadata(metadataRpc))))
    // const { codec, location } = builder.buildCall("Currencies", "transfer")
    // const args = {
    //   dest: to,
    //   currency_id: token.onChainId,
    //   amount: BigInt(planck),
    // }

    // const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), codec.enc(args)]))
    // return {
    //   address: from,
    //   method: callData.asHex() as `0x${string}`,
    // }
  }
