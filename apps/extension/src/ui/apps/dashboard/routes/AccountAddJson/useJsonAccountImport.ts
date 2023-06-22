import { DEBUG } from "@core/constants"
import { AccountType } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { createPair } from "@polkadot/keyring"
import { KeyringPair, KeyringPair$Json } from "@polkadot/keyring/types"
import { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import { assert, hexToU8a, isHex, u8aToString } from "@polkadot/util"
import { base64Decode, decodeAddress, encodeAddress, jsonDecrypt } from "@polkadot/util-crypto"
import { KeypairType } from "@polkadot/util-crypto/types"
import { encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import useAccounts from "@ui/hooks/useAccounts"
import useChains from "@ui/hooks/useChains"
import { useCallback, useEffect, useMemo, useState } from "react"

import testImport from "./GITIGNORE.json"
import { JsonImportAccount } from "./JsonAccountsList"

// let DO_NOT_MERGE_ABOVE_IMPORT: any

type SingleAccountJson = KeyringPair$Json
type MultiAccountJson = KeyringPairs$Json
type UnknownAccountJson = SingleAccountJson | MultiAccountJson

type SingleAccountJsonFile = { type: "single"; content: SingleAccountJson }
type MultiAccountJsonFile = {
  type: "multi"
  content: MultiAccountJson
}
type UnknownAccountJsonFile = SingleAccountJsonFile | MultiAccountJsonFile

const isMultiAccountJson = (json: UnknownAccountJson): json is MultiAccountJson => {
  return (json as KeyringPairs$Json).accounts !== undefined
}
const isSingleAccountJson = (json: UnknownAccountJson): json is SingleAccountJson => {
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

export const useJsonAccountImport = () => {
  // TODO REMOVE BEFORE MERGE
  const [fileContent, setFileContent] = useState(DEBUG ? JSON.stringify(testImport) : undefined)
  //const [fileContent, setFileContent] = useState<string>()
  // do we really need to save this ?
  const [masterPassword, setMasterPassword] = useState<string>()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const existingAccounts = useAccounts()

  const [pairs, setPairs] = useState<KeyringPair[]>()

  useEffect(() => {
    setMasterPassword(undefined)
    setPairs(undefined)
    setSelectedAccounts([])
  }, [fileContent])

  const file = useMemo<UnknownAccountJsonFile | undefined>(() => {
    if (!fileContent) return undefined

    try {
      const content = JSON.parse(fileContent) as UnknownAccountJson

      if (isSingleAccountJson(content)) return { type: "single", content }
      if (isMultiAccountJson(content)) return { type: "multi", content }
    } catch (err) {
      log.error("Invalid file", { err })
    }

    return undefined
  }, [fileContent])

  const requiresFilePassword = useMemo(() => file && !masterPassword, [file, masterPassword])

  const unlockFile = useCallback(
    async (password: string) => {
      if (!file) return

      // hangs UI, do asynchronously
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            if (file.type === "single") {
              const pair = createPairFromJson(file.content)
              // check password, throws if invalid
              pair.decodePkcs8(password)

              setMasterPassword(password)
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
              const accounts = JSON.parse(
                u8aToString(jsonDecrypt(file.content, password))
              ) as KeyringPair$Json[]
              const pairs = accounts.map(createPairFromJson)

              // try to unlock each pair with master password
              // pairs
              //   .filter((p) => !p.meta.isExternal)
              //   .forEach((pair) => {
              //     try {
              //       pair.decodePkcs8(password)
              //       console.log("password match", pair.meta.name)
              //     } catch (err) {
              //       console.log("password invalid", pair.meta.name)
              //       // ignore
              //     }
              //   })

              setMasterPassword(password)
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

  const { chains } = useChains(true)

  const accounts = useMemo<JsonImportAccount[] | undefined>(() => {
    if (!pairs) return undefined

    return pairs.map((pair) => {
      const chain = pair.meta.genesisHash
        ? chains.find((c) => c.genesisHash === pair.meta.genesisHash)
        : undefined

      const isExisting = existingAccounts.some(
        (a) => encodeAnyAddress(a.address) === encodeAnyAddress(pair.address)
      )

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
      }
    })
  }, [chains, existingAccounts, pairs, selectedAccounts])

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
            let unlocked = false

            try {
              pair.unlock(password)
              unlocked = true
            } catch (err) {
              // ignore
            }

            resolve(unlocked)
          }, 50)
        })

        if (unlocked) {
          setPairs([...pairs])
        }
      }

      setUnlockAttemptProgress(0)
      // // hangs UI, do asynchronously
      // return await new Promise<boolean>((resolve, reject) => {
      //   setTimeout(() => {
      //     try {
      //       let unlocked = false
      //       for (const account of accounts.filter((a) => a.selected && a.isLocked)) {
      //         const pair = pairs.find((p) => p.address === account.id)
      //         if (!pair) continue
      //         try {
      //           pair.unlock(password)

      //           // TODO react18 transition so UI updates as soon as one is unlocked
      //           // update state so UI updates
      //           setPairs([...pairs])
      //           unlocked = true
      //         } catch (err) {
      //           // ignore
      //         }
      //       }

      //       resolve(unlocked)
      //     } catch (err) {
      //       reject(err)
      //     }
      //   }, 1)
      // })
    },
    [accounts, pairs]
  )

  const requiresAccountUnlock = useMemo(
    () => !!accounts?.filter((a) => a.selected && a.isLocked).length,
    [accounts]
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

    const pairsToImport = selectedAccounts.map((address) =>
      pairs.find((p) => p.address === address)
    )
    for (const pair of pairsToImport) {
      assert(pair, "Pair not found")
      assert(!pair.meta.isExternal, "Cannot import external account")
      assert(!pair.isLocked, "Account is locked")
    }

    for (const pair of pairsToImport) {
      const json = pair?.toJson()
      // empty password will do as account is already unlocked
      await api.accountCreateFromJson(JSON.stringify(json), "")
    }

    return selectedAccounts[0]
  }, [pairs, selectedAccounts])

  const selectAll = useCallback(() => {
    if (!accounts) return
    setSelectedAccounts(
      accounts?.filter((a) => a.isPrivateKeyAvailable && !a.isExisting).map((a) => a.id)
    )
  }, [accounts])

  const selectNone = useCallback(() => {
    setSelectedAccounts([])
  }, [])

  return {
    isMultiAccounts: file?.type === "multi",
    accounts,
    requiresFilePassword,
    requiresAccountUnlock,
    canImport,
    unlockAttemptProgress,
    setFileContent,
    selectAccount,
    unlockFile,
    unlockAccounts,
    importAccounts,
    selectAll,
    selectNone,
  }
}
