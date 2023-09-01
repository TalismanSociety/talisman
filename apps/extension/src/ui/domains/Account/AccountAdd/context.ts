import { provideContext } from "@talisman/util/provideContext"
import { useState } from "react"

export type MethodTypes = "new" | "import" | "connect" | "watched"

const useAccountCreate = () => {
  const [methodType, setMethodType] = useState<MethodTypes>("new")

  return {
    methodType,
    setMethodType,
  }
}

const [AccountCreateContextProvider, useAccountCreateContext] = provideContext(useAccountCreate)

export { AccountCreateContextProvider, useAccountCreateContext }
