import { JSONParser } from "@recoiljs/refine"
import { isNil } from "lodash"
import { AtomEffect } from "recoil"
import { Storage } from "webextension-polyfill/namespaces/storage"

export const storageEffect =
  <TValue, TParsedValue extends TValue>(
    storage: Storage.StorageArea,
    options?: {
      // TODO: recursion to support list of key paths
      // might be overkill though
      key?: string
      subKey?: string
      parser?: JSONParser<Readonly<TParsedValue> | null | undefined>
      // Refine json parser doesn't yet support set
      isSet?: boolean
    }
  ): AtomEffect<TValue> =>
  ({ node, setSelf, onSet }) => {
    const storageKey = options?.key ?? node.key

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractValue = (record: Record<string, any>) => {
      const value = record[storageKey]
      return options?.subKey !== undefined ? value[options.subKey] : value
    }

    const effect = async () => {
      const savedValue = extractValue(await storage.get(storageKey))

      if (savedValue !== null && extractValue !== undefined) {
        if (options?.isSet) {
          // @ts-expect-error hack for es6 set
          setSelf(new Set(JSON.parse(savedValue)))
        } else if (options?.parser !== undefined) {
          const value = options.parser(savedValue)
          if (!isNil(value)) {
            setSelf(value)
          }
        } else {
          setSelf(JSON.parse(savedValue))
        }
      }
    }

    void effect()

    storage.onChanged.addListener(effect)

    onSet(async (newValue, _, isReset) => {
      if (isReset) {
        if (options?.subKey === undefined) {
          await storage.remove(storageKey)
        } else {
          const record = (await storage.get(storageKey))[storageKey]
          delete record[options.subKey]
          await storage.set({ [storageKey]: record })
        }
      } else {
        const parsedNewValue = JSON.stringify(
          newValue instanceof Set ? Array.from(newValue.values()) : newValue
        )

        if (options?.subKey === undefined) {
          await storage.set({
            [storageKey]: parsedNewValue,
          })
        } else {
          const record = (await storage.get(storageKey))[storageKey]
          await storage.set({
            [storageKey]: {
              ...record,
              [options.subKey]: parsedNewValue,
            },
          })
        }
      }
    })

    return () => {
      storage.onChanged.removeListener(effect)
    }
  }
