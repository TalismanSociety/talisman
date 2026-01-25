import { createPair } from "@polkadot/keyring"
import type { KeyringPair, KeyringPair$Json } from "@polkadot/keyring/types"
import type { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import { assert, hexToU8a, isHex, u8aToString } from "@polkadot/util"
import {
  base64Decode,
  base64Encode,
  decodeAddress,
  encodeAddress,
  jsonDecrypt,
} from "@polkadot/util-crypto"
import type { EncryptedJson, KeypairType } from "@polkadot/util-crypto/types"
import { provideContext } from "@talisman/util/provideContext"
import { type Address, Balances } from "@talismn/balances"
import { deriveKeypair, encodeAnyAddress, isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { api } from "@ui/api"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useNetworks } from "@ui/state"
import type { Account, LegacyAccountOrigin } from "extension-core"
import { getSecretKeyFromPjsJson } from "extension-core/domains/keyring/getSecretKeyFromPjsJson"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"

export type JsonImportAccount = {
  id: string
  address: string
  name: string
  genesisHash?: `0x${string}`
  origin: LegacyAccountOrigin
  selected: boolean
  isLocked: boolean
  isPrivateKeyAvailable: boolean
  isExisting: boolean
  balances: Balances
  isLoading: boolean
}

type SingleAccountJsonFile = { type: "single"; content: KeyringPair$Json }
type MultiAccountJsonFile = {
  type: "multi"
  content: KeyringPairs$Json
}
type UnknownAccountJsonFile = SingleAccountJsonFile | MultiAccountJsonFile

const isMultiAccountJson = (json: EncryptedJson): json is KeyringPairs$Json => {
  return (json as KeyringPairs$Json).accounts !== undefined
}
const isSingleAccountJson = (json: EncryptedJson): json is KeyringPair$Json => {
  return (json as KeyringPair$Json).address !== undefined
}
// Add support for Polkadot.js array format: [{ address: "...", ... }]
const isArrayAccountJson = (json: EncryptedJson): boolean => {
  return Array.isArray(json) && json.length > 0 && json[0]?.address !== undefined
}

const createPairFromJson = (
  { encoded, encoding, address, meta }: KeyringPair$Json,
  password?: string
) => {
  const cryptoType = Array.isArray(encoding.content) ? encoding.content[1] : "ed25519"
  const encType = Array.isArray(encoding.type) ? encoding.type : [encoding.type]

  // Extract public key from encrypted data (not from address) to avoid scalar validation errors
  let publicKey: Uint8Array
  try {
    if (password) {
      // If we have password, get the correct public key from encrypted data
      const json = { encoded, encoding, address, meta } as KeyringPair$Json
      const keys = getSecretKeyFromPjsJson(json, password)
      publicKey = keys.publicKey
    } else {
      // Fallback to address-derived public key
      publicKey = decodeAddress(address, true)
    }
  } catch (error) {
    log.error("Failed to extract keys from JSON:", error)
    // If extraction fails, use address-derived public key as fallback
    publicKey = decodeAddress(address, true)
  }

  return createPair(
    { toSS58: encodeAddress, type: cryptoType as KeypairType },
    { publicKey },
    meta,
    isHex(encoded) ? hexToU8a(encoded) : base64Decode(encoded),
    encType
  )
}

const useAccountsBalances = (pairs: KeyringPair[] = []) => {
  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accounts = useMemo<Account[]>(
    () =>
      pairs.map(
        (p): Account => ({
          type: "keypair",
          address: p.address,
          curve: p.type,
          name: p.meta.name ?? "",
          createdAt: Date.now(),
        })
      ),
    [pairs]
  )
  const allBalances = useAccountImportBalances(accounts)

  return useMemo(() => {
    return accounts.reduce(
      (acc, { address }) => {
        const individualBalances = allBalances.balances.find({ address })
        const isLoading =
          !individualBalances.count ||
          individualBalances.each.some((b) => b.status === "cache") ||
          allBalances.status === "initialising"
        const balances = new Balances(individualBalances)

        return {
          // biome-ignore lint/performance/noAccumulatingSpread: legacy
          ...acc,
          [address]: { balances, isLoading },
        }
      },
      {} as Record<Address, { balances: Balances; isLoading: boolean }>
    )
  }, [accounts, allBalances])
}

const useJsonAccountImportProvider = () => {
  const existingAccounts = useAccounts()
  const [json, setJson] = useState<string>()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  // warning : array of mutable objects
  const [pairs, setPairs] = useState<KeyringPair[]>()

  // Store original JSON data to send to backend (not re-exported)
  const [originalJsons, setOriginalJsons] = useState<Map<string, KeyringPair$Json>>(new Map())

  // Store the file password to use for key extraction during import
  const [filePassword, setFilePassword] = useState<string>()

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    setSelectedAccounts([])
    setPairs(undefined)
  }, [json])

  const file = useMemo<UnknownAccountJsonFile | undefined>(() => {
    if (!json) return undefined

    try {
      const content = JSON.parse(json) as EncryptedJson

      // Handle Polkadot.js array format (extract first element)
      if (isArrayAccountJson(content)) {
        return { type: "single", content: (content as KeyringPair$Json[])[0] }
      }

      if (isSingleAccountJson(content)) return { type: "single", content }
      if (isMultiAccountJson(content)) return { type: "multi", content }
    } catch (err) {
      log.error("Invalid file", { err })
    }

    return undefined
  }, [json])

  const requiresFilePassword = useMemo(() => file && !pairs, [file, pairs])

  const unlockFile = useCallback(
    async (password: string) => {
      if (!file) return

      // Store file password for later use during import
      setFilePassword(password)

      // hangs UI, do asynchronously
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            if (file.type === "single") {
              // Pass password to get correct public key from encrypted data
              const pair = createPairFromJson(file.content, password)
              pair.decodePkcs8(password)

              setPairs([pair])

              // Store original JSON for backend import
              setOriginalJsons(new Map([[pair.address, file.content]]))

              if (
                !existingAccounts.some((a) => isAddressEqual(a.address, pair.address)) &&
                !pair.meta.isHardware &&
                !pair.meta.isExternal
              )
                setSelectedAccounts([pair.address])
            } else if (file.type === "multi") {
              const data = jsonDecrypt(file.content, password)
              const accounts = JSON.parse(u8aToString(data)) as KeyringPair$Json[]
              const pairs = accounts.map((acc) => createPairFromJson(acc, password))

              setPairs(pairs)

              // Store original JSONs for backend import
              const jsonMap = new Map()
              pairs.forEach((pair, i) => {
                jsonMap.set(pair.address, accounts[i])
              })
              setOriginalJsons(jsonMap)
            } else throw new Error("Invalid file type")

            resolve()
          } catch (err) {
            reject(err)
          }
        }, 1)
      })
    },
    [existingAccounts, file]
  )

  const chains = useNetworks({ platform: "polkadot" })
  const accountBalances = useAccountsBalances(pairs)

  const accounts = useMemo<JsonImportAccount[] | undefined>(() => {
    if (!pairs) return undefined

    const result = pairs.map((pair) => {
      const chain = pair.meta.genesisHash
        ? chains.find((c) => c.genesisHash === pair.meta.genesisHash)
        : undefined

      const address = normalizeAddress(pair.address)
      const isExisting = existingAccounts.some((a) => isAddressEqual(a.address, address))

      const { balances, isLoading } = accountBalances[address] ?? {
        balances: new Balances([]),
        isLoading: true,
      }

      return {
        id: pair.address,
        address: encodeAnyAddress(pair.address, { ss58Format: chain?.prefix }),
        name: pair.meta.name as string,
        genesisHash: pair.meta.genesisHash as `0x${string}` | undefined,
        origin: pair.meta.origin as LegacyAccountOrigin,
        isExisting,
        selected: !isExisting && selectedAccounts.includes(pair.address),
        isLocked: pair.isLocked,
        isPrivateKeyAvailable: !pair.meta.isExternal && !pair.meta.isHardware,
        balances,
        isLoading,
      }
    })

    return result
  }, [accountBalances, chains, existingAccounts, pairs, selectedAccounts])

  const selectNone = useCallback(() => {
    setSelectedAccounts([])
  }, [])

  const selectAll = useCallback(() => {
    if (!accounts) return
    setSelectedAccounts(
      accounts?.filter((a) => a.isPrivateKeyAvailable && !a.isExisting).map((a) => a.id)
    )
  }, [accounts])

  const selectAccount = useCallback(
    (id: string, select: boolean) => {
      if (!accounts?.length || !id) return
      setSelectedAccounts((prev) => {
        if (select && accounts?.some((acc) => acc.id === id)) return [...prev, id]
        return prev.filter((a) => a !== id)
      })
    },
    [accounts]
  )

  const requiresAccountUnlock = useMemo(
    () => !!accounts?.filter((a) => a.selected && a.isLocked).length,
    [accounts]
  )

  // track progress to display a progress bar
  const [unlockAttemptProgress, setUnlockAttemptProgress] = useState(0)

  const unlockAccounts = useCallback(
    async (password: string) => {
      if (!pairs || !accounts) return

      setUnlockAttemptProgress(accounts.filter((a) => a.selected && !a.isLocked).length)

      for (const account of accounts.filter((a) => a.selected && a.isLocked)) {
        setUnlockAttemptProgress((prev) => prev + 1)

        const pair = pairs.find((p) => p.address === account.id)
        if (!pair) continue

        const unlocked = await new Promise((resolve) => {
          setTimeout(() => {
            let success = false

            try {
              pair.unlock(password)
              success = true
            } catch {
              // ignore
            }

            resolve(success)
          }, 50)
        })

        if (unlocked) {
          setPairs([...pairs])
        }
      }

      setUnlockAttemptProgress(0)
    },
    [accounts, pairs]
  )

  const canImport = useMemo<boolean>(() => {
    if (!pairs || !selectedAccounts.length) return false
    for (const address of selectedAccounts) {
      const pair = pairs.find((p) => p.address === address)
      if (!pair || pair.meta.isExternal || pair.isLocked) return false
    }
    return true
  }, [pairs, selectedAccounts])

  const importAccounts = useCallback(() => {
    assert(selectedAccounts.length, "No accounts selected")
    assert(pairs, "Pairs unavailable")
    assert(filePassword, "File password not available")

    const pairsToImport = selectedAccounts.map(
      (address) => pairs.find((p) => p.address === address) as KeyringPair
    )
    for (const pair of pairsToImport) {
      assert(pair, "Pair not found")
      assert(!pair.meta.isExternal, "Cannot import external account")
      assert(!pair.isLocked, "Account is locked")
    }

    // CRITICAL FIX: Convert Polkadot.js 64-byte format to Talisman format!
    //
    // Polkadot.js PKCS8 format: [32 bytes SEED] + [32 bytes PUBLIC KEY]
    // Talisman sr25519 format: [32 bytes privateKey] + [32 bytes nonce] (from secretFromSeed)
    //
    // These are DIFFERENT! We must:
    // 1. Extract seed (first 32 bytes) from Polkadot.js JSON
    // 2. Derive proper secretKey using Talisman's deriveKeypair (like addAccountDerive does)
    // 3. Use that derived secretKey (which has correct format)
    const options = pairsToImport.map((pair) => {
      const original = originalJsons.get(pair.address)
      assert(original, `Original JSON not found for ${pair.address}`)

      // Extract keys from Polkadot.js JSON
      const keys = getSecretKeyFromPjsJson(original, filePassword)

      // Extract SEED (first 32 bytes)
      const seed = keys.secretKey.subarray(0, 32)

      // Derive proper secretKey using Talisman's derivation (like addAccountDerive does)
      const curve = Array.isArray(original.encoding.content)
        ? original.encoding.content[1]
        : "ed25519"
      const derived = deriveKeypair(seed, "", curve) // Empty derivation path for base account

      return {
        name: pair.meta?.name || "Json Import",
        curve,
        secretKey: base64Encode(derived.secretKey), // Now in correct Talisman format!
      }
    })

    return api.accountAddKeypair(options)
  }, [pairs, selectedAccounts, originalJsons, filePassword])

  return {
    accounts,
    isMultiAccounts: file?.type === "multi",
    requiresFilePassword,
    requiresAccountUnlock,
    canImport,
    unlockAttemptProgress,
    setJson,
    selectAccount,
    unlockFile,
    unlockAccounts,
    importAccounts,
    selectAll,
    selectNone,
  }
}

export const [JsonAccountImportProvider, useJsonAccountImport] = provideContext(
  useJsonAccountImportProvider
)
