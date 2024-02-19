import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { isEthereumAddress } from "@talismn/util"
import { copyAddress } from "@ui/util/copyAddress"
import { useCallback } from "react"
import { atom, useRecoilState } from "recoil"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputsState = atom<CopyAddressWizardInputs>({
  key: "copyAddressInputsState",
  default: {},
})

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const [inputs, setInputs] = useRecoilState(copyAddressInputsState)

  const open = useCallback(
    (opts: CopyAddressWizardInputs | null) => {
      // skip wizard for evm addresses
      if (opts && isEthereumAddress(opts.address) && !opts.qr) {
        // if qr isn't explicitely set to false, assume we need to display the copy qr button
        const onQrClick = opts.qr !== false ? () => open({ ...opts, qr: true }) : undefined
        copyAddress(opts.address, onQrClick)
      } else {
        // display the wizard
        setInputs(opts || {})
        innerOpen()
      }
    },
    [innerOpen, setInputs]
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
