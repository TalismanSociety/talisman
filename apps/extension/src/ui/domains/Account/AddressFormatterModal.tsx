import { isEthereumAddress } from "@polkadot/util-crypto"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useNotification } from "@talisman/components/Notification"
import { provideContext } from "@talisman/util/provideContext"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useCallback, useEffect, useState } from "react"
import AddressFormatter from "./AddressFormatter"

const useAddressFormatterModalProvider = () => {
  const notification = useNotification()
  const [address, setAddress] = useState<string>()

  const close = useCallback(() => setAddress(undefined), [])

  const handleOpen = useCallback(
    (addr: string) => {
      if (isEthereumAddress(addr)) {
        //if ethereum address, do not open the modal, just copy the address
        try {
          navigator.clipboard.writeText(addr)
          notification.success({
            title: `Address copied`,
            subtitle: shortenAddress(addr),
          })
        } catch (err) {
          notification.error({
            title: `Copy failed`,
            subtitle: shortenAddress(addr),
          })
        }
      } else {
        // setting the address will open the substrate copy address modal
        setAddress(addr)
      }
    },
    [notification]
  )

  return {
    open: handleOpen,
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
