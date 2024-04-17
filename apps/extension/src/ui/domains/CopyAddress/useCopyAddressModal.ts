import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { convertAddress } from "@talisman/util/convertAddress"
import { isEthereumAddress, isValidSubstrateAddress } from "@talismn/util"
import { useAllChainsMap } from "@ui/hooks/useChains"
import { copyAddress } from "@ui/util/copyAddress"
import { atom, useAtom } from "jotai"
import { useCallback } from "react"
import { getAddress } from "viem"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputsState = atom<CopyAddressWizardInputs>({})

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const chainsMap = useAllChainsMap()
  const [inputs, setInputs] = useAtom(copyAddressInputsState)

  const open = useCallback(
    (opts: CopyAddressWizardInputs = {}) => {
      // skip wizard if we have all information we need, unless qr is explicitely requested
      if (opts?.address && !opts.qr) {
        const onQrClick = opts && opts.qr !== false ? () => open({ ...opts, qr: true }) : undefined

        if (isEthereumAddress(opts.address)) {
          const formatted = getAddress(opts.address)
          copyAddress(formatted, onQrClick)
          return
        }

        const chain = opts.networkId ? chainsMap[opts.networkId] : null

        // `chainId === null` is valid and means we want to display the substrate (generic) format
        if ((opts.networkId === null || chain) && isValidSubstrateAddress(opts.address)) {
          const formatted = convertAddress(opts.address, chain?.prefix ?? null)
          copyAddress(formatted, onQrClick)
          return
        }
      }

      // display the wizard
      setInputs(opts)
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
