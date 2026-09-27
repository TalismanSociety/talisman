import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

type ExplorerNetworkPickerModalInputs = { address: string }

const [useExplorerNetworkPickerOpenClose] =
  createGlobalOpenClose<ExplorerNetworkPickerModalInputs>()

export const useExplorerNetworkPickerModal = () => {
  const { isOpen, open, close, args: inputs } = useExplorerNetworkPickerOpenClose()

  return { isOpen, open, close, inputs }
}
