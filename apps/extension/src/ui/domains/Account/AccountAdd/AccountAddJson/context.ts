import { log } from "@common/log"
import type { LegacyAccountOrigin } from "@core/domains/accounts/types"
import type { Account } from "@core/domains/keyring/exports"
import type { PjsKeyringPairJson, PjsKeyringPairsJson } from "@core/types/pjsInterop"
import { type Address, Balances } from "@talismn/balances"
import {
  base64,
  decryptPjsKeystore,
  encodeAddressEthereum,
  encodeAnyAddress,
  isAddressEqual,
  type KeypairCurve,
  normalizeAddress,
} from "@talismn/crypto"
import { assert, hexToU8a, isHexString, u8aConcat, u8aToString } from "@talismn/util"
import { api } from "@ui/api"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts } from "@ui/state/accounts"
import { useNetworks } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
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

type SingleAccountJsonFile = { type: "single"; content: PjsKeyringPairJson }
type MultiAccountJsonFile = {
  type: "multi"
  content: PjsKeyringPairsJson
}
type UnknownAccountJsonFile = SingleAccountJsonFile | MultiAccountJsonFile

type UnknownJson = { address?: string; accounts?: unknown[] }

const isMultiAccountJson = (json: UnknownJson): json is UnknownJson & PjsKeyringPairsJson => {
  return json.accounts !== undefined
}
const isSingleAccountJson = (json: UnknownJson): json is UnknownJson & PjsKeyringPairJson => {
  return json.address !== undefined
}

// values picked from polkadot keyring (decodePair)
const PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0])
const PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32])
const SEC_LENGTH = 64
const SEED_LENGTH = 32

/** local replacement for the polkadot-js KeyringPair used by the previous implementation */
type JsonImportPair = {
  json: PjsKeyringPairJson
  address: string
  type: string
  meta: PjsKeyringPairJson["meta"]
  isLocked: boolean
  secretKey: Uint8Array | null
  publicKey: Uint8Array | null
}

const u8aStartsWith = (bytes: Uint8Array, prefix: Uint8Array, offset = 0) =>
  prefix.every((byte, i) => bytes[offset + i] === byte)

/** pjs keystores may carry `content`/`type` as plain strings (v1/v2) - normalize to arrays */
const normalizeEncoding = (encoding: PjsKeyringPairJson["encoding"]) => ({
  ...encoding,
  content: Array.isArray(encoding.content) ? encoding.content : [encoding.content],
  type: Array.isArray(encoding.type) ? encoding.type : [encoding.type],
})

/** parses a decrypted pkcs8 blob into secret + public keys (same layouts as polkadot-js decodePair) */
const decodePkcs8 = (decrypted: Uint8Array): { secretKey: Uint8Array; publicKey: Uint8Array } => {
  assert(u8aStartsWith(decrypted, PKCS8_HEADER), "Invalid Pkcs8 header found in body")

  // current format (v3): 64-byte secret
  const secOffset = PKCS8_HEADER.length
  let secLength = SEC_LENGTH
  if (!u8aStartsWith(decrypted, PKCS8_DIVIDER, secOffset + secLength)) {
    // legacy format: 32-byte secret
    secLength = SEED_LENGTH
    assert(
      u8aStartsWith(decrypted, PKCS8_DIVIDER, secOffset + secLength),
      "Invalid Pkcs8 divider found in body"
    )
  }

  const secretKey = decrypted.subarray(secOffset, secOffset + secLength)
  const publicKey = decrypted.subarray(secOffset + secLength + PKCS8_DIVIDER.length)

  return { secretKey, publicKey }
}

/** pjs keystores may store the public key (compressed or not) as address for ethereum accounts */
const getPairAddress = (json: PjsKeyringPairJson, cryptoType: string) => {
  if (
    cryptoType === "ethereum" &&
    isHexString(json.address) &&
    [68, 132].includes(json.address.length)
  )
    return encodeAddressEthereum(hexToU8a(json.address))
  return json.address
}

const createPairFromJson = (json: PjsKeyringPairJson): JsonImportPair => {
  const cryptoType = Array.isArray(json.encoding.content) ? json.encoding.content[1] : "ed25519"

  return {
    json,
    address: getPairAddress(json, cryptoType),
    type: cryptoType,
    meta: json.meta ?? {},
    isLocked: true,
    secretKey: null,
    publicKey: null,
  }
}

const unlockPair = (pair: JsonImportPair, password: string) => {
  const { encoded, encoding } = pair.json

  // pjs also supports hex-encoded keystores - normalize to base64 for the decrypt helper
  const encodedB64 = isHexString(encoded) ? base64.encode(hexToU8a(encoded)) : encoded

  const decrypted = decryptPjsKeystore(
    { encoded: encodedB64, encoding: normalizeEncoding(encoding) },
    password
  )
  const { secretKey, publicKey } = decodePkcs8(decrypted)

  pair.secretKey = new Uint8Array(secretKey)
  pair.publicKey = new Uint8Array(publicKey)
  pair.isLocked = false
}

const useAccountsBalances = (pairs: JsonImportPair[] = []) => {
  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accounts = useMemo<Account[]>(
    () =>
      pairs.map(
        (p): Account => ({
          type: "keypair",
          address: p.address,
          curve: p.type as KeypairCurve,
          name: (p.meta.name as string) ?? "",
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
  const [pairs, setPairs] = useState<JsonImportPair[]>()

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    setSelectedAccounts([])
    setPairs(undefined)
  }, [json])

  const file = useMemo<UnknownAccountJsonFile | undefined>(() => {
    if (!json) return undefined

    try {
      const content = JSON.parse(json) as UnknownJson

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

      // hangs UI, do asynchronously
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            if (file.type === "single") {
              const pair = createPairFromJson(file.content)
              unlockPair(pair, password)

              setPairs([pair])

              if (
                !existingAccounts.some((a) => isAddressEqual(a.address, pair.address)) &&
                !pair.meta.isHardware &&
                !pair.meta.isExternal
              )
                setSelectedAccounts([pair.address])
            } else if (file.type === "multi") {
              const { encoded, encoding } = file.content
              const data = decryptPjsKeystore(
                { encoded, encoding: normalizeEncoding(encoding) },
                password
              )
              const accounts = JSON.parse(u8aToString(data)) as PjsKeyringPairJson[]
              const pairs = accounts.map(createPairFromJson)

              setPairs(pairs)
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
              unlockPair(pair, password)
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

    const pairsToImport = selectedAccounts.map(
      (address) => pairs.find((p) => p.address === address) as JsonImportPair
    )
    for (const pair of pairsToImport) {
      assert(pair, "Pair not found")
      assert(!pair.meta.isExternal, "Cannot import external account")
      assert(!pair.isLocked, "Account is locked")
    }

    // same shape as pjs pair.toJson() without password: unencrypted pkcs8, base64-encoded
    const unlockedPairs = pairsToImport.map((pair): PjsKeyringPairJson => {
      assert(pair.secretKey && pair.publicKey, "Account is locked")
      const pkcs8 = u8aConcat(PKCS8_HEADER, pair.secretKey, PKCS8_DIVIDER, pair.publicKey)
      return {
        address: pair.address,
        encoded: base64.encode(pkcs8),
        encoding: {
          content: ["pkcs8", pair.type],
          type: ["none"],
          version: "3",
        },
        meta: pair.meta,
      }
    })

    return api.accountCreateFromJson(unlockedPairs)
  }, [pairs, selectedAccounts])

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
