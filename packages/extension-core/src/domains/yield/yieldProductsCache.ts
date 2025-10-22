import { log } from "extension-shared"

import { getBlobStore } from "../../db/blobs"
import { YieldDto } from "./types"

export interface YieldProductsCacheData {
  [network: string]: {
    products: YieldDto[]
    timestamp: number
  }
}

export class YieldProductsCache {
  private readonly blobStore = getBlobStore<YieldProductsCacheData>("yield-products")
  private readonly defaultTtl = 5 * 60 * 1000 // 5 minutes in milliseconds

  /**
   * Store yield products for a specific network
   */
  async set(network: string, products: YieldDto[]): Promise<void> {
    try {
      const existingData = (await this.blobStore.get()) || {}

      const updatedData = {
        ...existingData,
        [network]: {
          products,
          timestamp: Date.now(),
        },
      }

      await this.blobStore.set(updatedData)
      log.debug("[YieldProductsCache] Stored products for network", {
        network,
        productCount: products.length,
      })
    } catch (error) {
      log.error("[YieldProductsCache] Failed to store products", { network, error })
      throw error
    }
  }

  /**
   * Get cached yield products for a network
   */
  async get(network: string, maxAge?: number): Promise<YieldDto[] | null> {
    try {
      const data = await this.blobStore.get()
      if (!data || !data[network]) {
        return null
      }

      const networkData = data[network]
      const ttl = maxAge ?? this.defaultTtl
      const isExpired = Date.now() - networkData.timestamp > ttl

      if (isExpired) {
        log.debug("[YieldProductsCache] Cache expired for network", { network })
        return null
      }

      log.debug("[YieldProductsCache] Retrieved cached products for network", {
        network,
        productCount: networkData.products.length,
      })
      return networkData.products
    } catch (error) {
      log.error("[YieldProductsCache] Failed to get cached products", { network, error })
      return null
    }
  }

  /**
   * Clear cache for a specific network or all networks
   */
  async clear(network?: string): Promise<void> {
    try {
      if (network) {
        const data = await this.blobStore.get()
        if (data && data[network]) {
          delete data[network]
          await this.blobStore.set(data)
          log.debug("[YieldProductsCache] Cleared cache for network", { network })
        }
      } else {
        await this.blobStore.set({})
        log.debug("[YieldProductsCache] Cleared all cache")
      }
    } catch (error) {
      log.error("[YieldProductsCache] Failed to clear cache", { network, error })
      throw error
    }
  }

  /**
   * Check if cache exists and is fresh for a network
   */
  async isFresh(network: string, maxAge?: number): Promise<boolean> {
    const products = await this.get(network, maxAge)
    return products !== null
  }
}

// Export singleton instance
export const yieldProductsCache = new YieldProductsCache()
