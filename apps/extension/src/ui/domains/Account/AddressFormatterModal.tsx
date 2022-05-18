import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useEffect, useState } from "react"
import AddressFormatter from "./AddressFormatter"

const useAddressFormatterModalProvider = () => {
  const [address, setAddress] = useState<string>()

  const close = useCallback(() => setAddress(undefined), [])

  return {
    open: setAddress,
    close,
    address,
  }
}

export const [AddressFormatterModalProvider, useAddressFormatterModal] = provideContext(
  useAddressFormatterModalProvider
)

export const AddressFormatterModal = () => {
  const { address, close } = useAddressFormatterModal()

  // keep previous address so popup can fade out smoothly
  const [displayAddress, setDisplayAddress] = useState<string>()
  useEffect(() => {
    if (address) setDisplayAddress(address)
  }, [address])

  return (
    <Modal open={Boolean(address)} onClose={close}>
      <ModalDialog title="Copy address" onClose={close}>
        <AddressFormatter address={displayAddress} onClose={close} />
      </ModalDialog>
    </Modal>
  )
}
