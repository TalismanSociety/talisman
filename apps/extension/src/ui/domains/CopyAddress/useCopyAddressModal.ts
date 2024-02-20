import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { convertAddress } from "@talisman/util/convertAddress"
import { isValidSubstrateAddress } from "@talisman/util/isValidSubstrateAddress"
import { isEthereumAddress } from "@talismn/util"
import useChains from "@ui/hooks/useChains"
import { copyAddress } from "@ui/util/copyAddress"
import { useCallback } from "react"
import { atom, useRecoilState } from "recoil"
import { getAddress } from "viem"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputsState = atom<CopyAddressWizardInputs>({
  key: "copyAddressInputsState",
  default: {},
})

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const { chainsMap } = useChains({ activeOnly: false, includeTestnets: true })
  const [inputs, setInputs] = useRecoilState(copyAddressInputsState)

  const open = useCallback(
    (opts: CopyAddressWizardInputs | null) => {
      // skip wizard if we have all information we need, unless qr is explicitely requested
      if (opts?.address && !opts.qr) {
        const onQrClick = opts && opts.qr !== false ? () => open({ ...opts, qr: true }) : undefined

        if (isEthereumAddress(opts.address)) {
          const formatted = getAddress(opts.address)
          copyAddress(formatted, onQrClick)
          return
        }

        const chain = opts.chainId ? chainsMap[opts.chainId] : null

        // `chainId === null` is valid and means we want to display the substrate (generic) format
        if (opts.chainId !== undefined || (chain && isValidSubstrateAddress(opts.address))) {
          const formatted = convertAddress(opts.address, chain?.prefix ?? null)
          copyAddress(formatted, onQrClick)
          return
        }
      }

      // display the wizard
      setInputs(opts || {})
      innerOpen()
    },
    [chainsMap, innerOpen, setInputs]
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
