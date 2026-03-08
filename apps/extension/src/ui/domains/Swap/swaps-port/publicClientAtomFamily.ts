import type { EthNetworkId } from "@talismn/chaindata-provider"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$, getToken$ } from "@ui/state/chaindata"
import { type Atom, atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"
import type { AtomFamily } from "jotai/vanilla/utils/atomFamily"
import type { PublicClient } from "viem"

export const publicClientAtomFamily: AtomFamily<
  EthNetworkId | undefined,
  Atom<Promise<PublicClient | undefined>>
> = atomFamily((evmNetworkId) =>
  atom(async (get) => {
    const evmNetwork = await get(atomWithObservable(() => getNetworkById$(evmNetworkId)))
    const nativeToken = await get(atomWithObservable(() => getToken$(evmNetwork?.nativeTokenId)))
    if (!evmNetwork || nativeToken?.type !== "evm-native" || evmNetwork.platform !== "ethereum")
      return

    return getExtensionPublicClient(evmNetwork)
  })
)
