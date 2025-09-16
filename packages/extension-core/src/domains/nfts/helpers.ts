// import { isAccountAddressEthereum } from "@talismn/keyring"
// import { combineLatest, firstValueFrom, map } from "rxjs"

// import { chaindataProvider } from "../../rpcs/chaindata"
// import { activeNetworksStore, isNetworkActive } from "../balances/store.activeNetworks"
// import { keyringStore } from "../keyring/store"
// import { NftCollection } from "./types"

// export const getNftsAccountsList = async () => {
//   const accounts = await keyringStore.getAccounts()
//   return accounts
//     .filter(isAccountAddressEthereum)
//     .map(({ address }) => address)
//     .sort()
// }

// export const getNftsNetworkIdsList = async () => {
//   const activeNetworks = await firstValueFrom(
//     combineLatest([chaindataProvider.networks$, activeNetworksStore.observable]).pipe(
//       map(([networks, activeNetworks]) =>
//         networks.filter((n) => isNetworkActive(n, activeNetworks)),
//       ),
//     ),
//   )
//   return activeNetworks.map((n) => n.id).sort()
// }

// export const getNftCollectionFloorUsd = (collection: NftCollection): number | null => {
//   return (
//     collection.marketplaces
//       .filter((m) => m.floorUsd)
//       .map((mp) => mp.floorUsd ?? 0)
//       .sort((a, b) => a - b)[0] ?? null
//   )
// }
