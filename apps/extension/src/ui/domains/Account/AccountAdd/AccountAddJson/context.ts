import { AccountType } from "@extension/core"
import { AssetDiscoveryMode } from "@extension/core"
import { log } from "@extension/shared"
import { createPair } from "@polkadot/keyring"
import { KeyringPair, KeyringPair$Json } from "@polkadot/keyring/types"
import { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import { assert, hexToU8a, isHex, u8aToString } from "@polkadot/util"
import { base64Decode, decodeAddress, encodeAddress, jsonDecrypt } from "@polkadot/util-crypto"
import { EncryptedJson, KeypairType } from "@polkadot/util-crypto/types"
import { provideContext } from "@talisman/util/provideContext"
import { Address, Balances } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import useAccounts from "@ui/hooks/useAccounts"
import useChains from "@ui/hooks/useChains"
import { useCallback, useEffect, useMemo, useState } from "react"

export type JsonImportAccount = {
  id: string
  address: string
  name: string
  genesisHash: string
  origin: AccountType
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

const createPairFromJson = ({ encoded, encoding, address, meta }: KeyringPair$Json) => {
  const cryptoType = Array.isArray(encoding.content) ? encoding.content[1] : "ed25519"
  const encType = Array.isArray(encoding.type) ? encoding.type : [encoding.type]
  return createPair(
    { toSS58: encodeAddress, type: cryptoType as KeypairType },
    { publicKey: decodeAddress(address, true) },
    meta,
    isHex(encoded) ? hexToU8a(encoded) : base64Decode(encoded),
    encType
  )
}

const useAccountsBalances = (pairs: KeyringPair[] = []) => {
  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accounts = useMemo<AccountImportDef[]>(
    () =>
      pairs
        .filter((p): p is KeyringPair & { type: string } => !!p.type)
        .map((p) => ({ address: p.address, type: p.type, genesisHash: p.meta?.genesisHash })),
    [pairs]
  )
  const allBalances = useAccountImportBalances(accounts)

  return useMemo(() => {
    return accounts.reduce((acc, { address }) => {
      const individualBalances = allBalances.balances.find({ address })
      const isLoading =
        !individualBalances.count ||
        individualBalances.each.some((b) => b.status === "cache") ||
        allBalances.status === "initialising"
      const balances = new Balances(individualBalances)

      return {
        ...acc,
        [address]: { balances, isLoading },
      }
    }, {} as Record<Address, { balances: Balances; isLoading: boolean }>)
  }, [accounts, allBalances])
}

const useJsonAccountImportProvider = () => {
  const existingAccounts = useAccounts()
  const [json, setJson] = useState<string>()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  // warning : array of mutable objects
  const [pairs, setPairs] = useState<KeyringPair[]>()

  useEffect(() => {
    setSelectedAccounts([])
    setPairs(undefined)
  }, [json])

  const file = useMemo<UnknownAccountJsonFile | undefined>(() => {
    if (!json) return undefined

    try {
      const content = JSON.parse(json) as EncryptedJson

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
              pair.decodePkcs8(password)

              setPairs([pair])

              if (
                !existingAccounts.some(
                  (a) => encodeAnyAddress(a.address) === encodeAnyAddress(pair.address)
                ) &&
                !pair.meta.isHardware &&
                !pair.meta.isExternal
              )
                setSelectedAccounts([pair.address])
            } else if (file.type === "multi") {
              const data = jsonDecrypt(file.content, password)
              const accounts = JSON.parse(u8aToString(data)) as KeyringPair$Json[]
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

  const { chains } = useChains({ activeOnly: false, includeTestnets: true })
  const accountBalances = useAccountsBalances(pairs)

  const accounts = useMemo<JsonImportAccount[] | undefined>(() => {
    if (!pairs) return undefined

    const result = pairs.map((pair) => {
      const chain = pair.meta.genesisHash
        ? chains.find((c) => c.genesisHash === pair.meta.genesisHash)
        : undefined

      const address = encodeAnyAddress(pair.address)
      const isExisting = existingAccounts.some((a) => encodeAnyAddress(a.address) === address)

      const { balances, isLoading } = accountBalances[address] ?? {
        balances: new Balances([]),
        isLoading: true,
      }

      return {
        id: pair.address,
        address: encodeAnyAddress(pair.address, chain?.prefix ?? undefined),
        name: pair.meta.name as string,
        genesisHash: pair.meta.genesisHash as string,
        origin: pair.meta.origin as AccountType,
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
            } catch (err) {
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

  const importAccounts = useCallback(async () => {
    assert(selectedAccounts.length, "No accounts selected")
    assert(pairs, "Pairs unavailable")

    const pairsToImport = selectedAccounts.map(
      (address) => pairs.find((p) => p.address === address) as KeyringPair
    )
    for (const pair of pairsToImport) {
      assert(pair, "Pair not found")
      assert(!pair.meta.isExternal, "Cannot import external account")
      assert(!pair.isLocked, "Account is locked")
    }

    const unlockedPairs = pairsToImport.map((p) => p.toJson())

    const addresses = await api.accountCreateFromJson(unlockedPairs)

    api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, addresses)

    return addresses
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
