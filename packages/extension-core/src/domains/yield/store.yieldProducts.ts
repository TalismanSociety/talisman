import { splitSubject } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip, take } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldDto } from "./types"

export interface YieldProductsStorage {
  products: Array<{
    network: string
    products: YieldDto[]
  }>
}

const blobStore = getBlobStore<YieldProductsStorage>("yield-products")

const DEFAULT_DATA: YieldProductsStorage = {
  products: [],
}

// yield products store
const [setYieldProducts, yieldProductsStore$] = splitSubject(
  new ReplaySubject<YieldProductsStorage>(1),
)
export { yieldProductsStore$ }

// Initialize store immediately with default data so ReplaySubject has a value
setYieldProducts(DEFAULT_DATA)

export const updateYieldProductsStore = (data: YieldProductsStorage) => {
  setYieldProducts({
    products: data.products
      .map((item) => ({
        network: item.network,
        products: item.products,
      }))
      // enforce consistent ordering by network to allow for easier change comparison
      .sort((a, b) => a.network.localeCompare(b.network)),
  })
}

// Helper function to get cached products for a network
export const getCachedProductsForNetwork = (
  store: YieldProductsStorage,
  network: string,
): YieldDto[] => {
  const networkData = store.products.find((item) => item.network === network)
  return networkData?.products || []
}

// Helper function to update products for a network in the store
export const updateProductsForNetwork = (network: string, products: YieldDto[]) => {
  yieldProductsStore$.pipe(take(1)).subscribe((store) => {
    const existingIndex = store.products.findIndex((item) => item.network === network)
    const updatedProducts = [...store.products]

    if (existingIndex >= 0) {
      updatedProducts[existingIndex] = { network, products }
    } else {
      updatedProducts.push({ network, products })
    }

    updateYieldProductsStore({ products: updatedProducts })
  })
}

// once wallet is ready, initialize the yield products store
walletReady.then(() => {
  // provision store data from db
  blobStore
    .get()
    .then((blobData) => {
      if (!blobData) return setYieldProducts(DEFAULT_DATA)

      setYieldProducts({
        ...DEFAULT_DATA,
        products: blobData.products,
      })
    })
    .catch((error) => {
      log.error("[yield-products] failed to load yield products store on startup", error)
      // need at least one emit on startup as it's a replay subject
      setYieldProducts(DEFAULT_DATA)
    })

  // persist data to db when store is updated
  yieldProductsStore$
    .pipe(skip(1), debounceTime(2_000), distinctUntilChanged<YieldProductsStorage>(isEqual))
    .subscribe((storage) => {
      log.debug(`[yield-products] updating db blob with data (networks:${storage.products.length})`)
      blobStore.set(storage)
    })
})
