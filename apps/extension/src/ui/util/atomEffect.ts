import { JSONParser } from "@recoiljs/refine"
import { isNil } from "lodash"
import { AtomEffect } from "recoil"

export const storageEffect =
  <TValue, TParsedValue extends TValue>(
    storage: Storage,
    options?: {
      key?: string
      parser?: JSONParser<Readonly<TParsedValue> | null | undefined>
      // Refine json parser doesn't yet support set
      isSet?: boolean
    }
  ): AtomEffect<TValue> =>
  ({ node, setSelf, onSet }) => {
    const storageKey = options?.key ?? node.key
    const savedValue = storage.getItem(node.key)

    if (savedValue !== null) {
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

    onSet((newValue, _, isReset) => {
      isReset
        ? storage.removeItem(storageKey)
        : storage.setItem(
            storageKey,
            JSON.stringify(newValue instanceof Set ? Array.from(newValue.values()) : newValue)
          )
    })
  }
