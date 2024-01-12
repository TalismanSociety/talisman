import { provideContext } from "@talisman/util/provideContext"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"

const allMethodTypes = ["new", "import", "connect", "watched"] as const
export type MethodTypes = (typeof allMethodTypes)[number]

const isMethodType = (item: string | null): item is MethodTypes =>
  typeof item === "string" && Array.from<string>(allMethodTypes).includes(item)

const useAccountCreate = () => {
  const [searchParams] = useSearchParams()
  const [methodType, setMethodType] = useState<MethodTypes>(() => {
    const searchMethodType = searchParams.get("methodType")
    return isMethodType(searchMethodType) ? searchMethodType : "new"
  })

  return {
    methodType,
    setMethodType,
  }
}

const [AccountCreateContextProvider, useAccountCreateContext] = provideContext(useAccountCreate)

export { AccountCreateContextProvider, useAccountCreateContext }
