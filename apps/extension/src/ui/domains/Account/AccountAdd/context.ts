import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

import { provideContext } from "@talisman/util/provideContext"

const allMethodTypes = ["new", "import", "connect", "watched"] as const satisfies string[]
export type MethodType = (typeof allMethodTypes)[number]

const isMethodType = (item: string | null): item is MethodType =>
  typeof item === "string" && Array.from<string>(allMethodTypes).includes(item)

const useAccountCreate = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchMethodType = searchParams.get("methodType")

  const methodType = isMethodType(searchMethodType) ? searchMethodType : "new"
  const setMethodType = useCallback(
    (newMethodType: MethodType) => {
      setSearchParams((params) => {
        params.set("methodType", newMethodType)
        return params
      })
    },
    [setSearchParams],
  )

  return { methodType, setMethodType }
}

const [AccountCreateContextProvider, useAccountCreateContext] = provideContext(useAccountCreate)

export { AccountCreateContextProvider, useAccountCreateContext }
