import { isEthereumAddress } from "@polkadot/util-crypto"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { provideContext } from "@talisman/util/provideContext"
import { copyAddress } from "@ui/util/copyAddress"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

import AddressFormatter from "./AddressFormatter"

type Props = {
  onCopy?: (chainId: string) => void
}

const useAddressFormatterModalProvider = () => {
  const [address, setAddress] = useState<string>()

  const close = useCallback(() => setAddress(undefined), [])

  const handleOpen = useCallback((addr: string) => {
    if (isEthereumAddress(addr)) {
      //if ethereum address, do not open the modal, just copy the address
      copyAddress(addr)
    } else {
      // setting the address will open the substrate copy address modal
      setAddress(addr)
    }
  }, [])

  return {
    open: handleOpen,
    close,
    address,
  }
}

export const [AddressFormatterModalProvider, useAddressFormatterModal] = provideContext(
  useAddressFormatterModalProvider
)

const ModalContainer = styled(Modal)`
  // change so it's the inner address list that must be scrollable, not the body
  .modal-content {
    height: 600px;

    .modal-dialog {
      height: 100%;
    }

    .content {
      overflow: hidden;
      position: relative;
    }
  }
`

/** @deprecated use CopyAddressModal instead */
export const AddressFormatterModal = () => {
  const { address, close } = useAddressFormatterModal()

  // keep previous address so popup can fade out smoothly
  const [displayAddress, setDisplayAddress] = useState<string>()
  useEffect(() => {
    if (address) setDisplayAddress(address)
  }, [address])

  return (
    <ModalContainer open={Boolean(address)} onClose={close}>
      <ModalDialog title="Copy address" onClose={close}>
        <AddressFormatter address={displayAddress} onClose={close} />
      </ModalDialog>
    </ModalContainer>
  )
}
