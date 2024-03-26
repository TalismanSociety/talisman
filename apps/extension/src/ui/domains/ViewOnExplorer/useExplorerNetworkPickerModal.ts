import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { atom, useAtom } from "jotai"

type ExplorerNetworkPickerModalInputs = { address: string }

const inputsAtom = atom<ExplorerNetworkPickerModalInputs | null>(null)

export const useExplorerNetworkPickerModal = () => {
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("blockExplorerNetworkPickerModal")
  const [inputs, setInputs] = useAtom(inputsAtom)

  const open = (opts: ExplorerNetworkPickerModalInputs) => {
    setInputs(opts)
    innerOpen()
  }

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
