import { EvmNetworkId } from "extension-core"
import { Atom, atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"
import { AtomFamily } from "jotai/vanilla/utils/atomFamily"
import { PublicClient } from "viem"

import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$, getToken$ } from "@ui/state"

export const publicClientAtomFamily: AtomFamily<
  EvmNetworkId | undefined,
  Atom<Promise<PublicClient | undefined>>
> = atomFamily((evmNetworkId) =>
  atom(async (get) => {
    const evmNetwork = await get(atomWithObservable(() => getNetworkById$(evmNetworkId)))
    const nativeToken = await get(atomWithObservable(() => getToken$(evmNetwork?.nativeTokenId)))
    if (!evmNetwork || nativeToken?.type !== "evm-native" || evmNetwork.platform !== "ethereum")
      return

    return getExtensionPublicClient(evmNetwork, nativeToken)
  }),
)
