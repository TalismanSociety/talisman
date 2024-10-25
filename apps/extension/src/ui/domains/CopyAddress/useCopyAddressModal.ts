import { bind } from "@react-rxjs/core"
import { isEthereumAddress, isValidSubstrateAddress } from "@talismn/util"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"
import { getAddress } from "viem"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { convertAddress } from "@talisman/util/convertAddress"
import { useChainsMap } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputs$ = new BehaviorSubject<CopyAddressWizardInputs>({})

const setCopyAddressInputs = (inputs: CopyAddressWizardInputs) => {
  copyAddressInputs$.next(inputs)
}

const [useCopyAddressInputs] = bind(copyAddressInputs$)

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const chainsMap = useChainsMap()
  const inputs = useCopyAddressInputs()

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
      setCopyAddressInputs(opts)
      innerOpen()
    },
    [chainsMap, innerOpen],
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
