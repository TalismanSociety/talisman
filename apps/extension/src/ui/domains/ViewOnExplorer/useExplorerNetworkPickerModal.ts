import { bind } from "@react-rxjs/core"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

type ExplorerNetworkPickerModalInputs = { address: string }

const inputs$ = new BehaviorSubject<ExplorerNetworkPickerModalInputs | null>(null)

const setInputs = (inputs: ExplorerNetworkPickerModalInputs | null) => {
  inputs$.next(inputs)
}

const [useInputs] = bind(inputs$)

export const useExplorerNetworkPickerModal = () => {
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("blockExplorerNetworkPickerModal")

  const inputs = useInputs()

  const open = useCallback(
    (opts: ExplorerNetworkPickerModalInputs) => {
      setInputs(opts)
      innerOpen()
    },
    [innerOpen],
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
