import { bind } from "@react-rxjs/core"
import { detectAddressEncoding, encodeAnyAddress, normalizeAddress } from "@talismn/crypto"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useNetworksMapById } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputs$ = new BehaviorSubject<CopyAddressWizardInputs>({})

const setCopyAddressInputs = (inputs: CopyAddressWizardInputs) => {
  copyAddressInputs$.next(inputs)
}

const [useCopyAddressInputs] = bind(copyAddressInputs$)

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const chainsMap = useNetworksMapById({ platform: "polkadot" })
  const inputs = useCopyAddressInputs()

  const open = useCallback(
    (opts: CopyAddressWizardInputs = {}) => {
      // skip wizard if we have all information we need, unless qr is explicitely requested
      if (opts?.address && !opts.qr) {
        const onQrClick = opts && opts.qr !== false ? () => open({ ...opts, qr: true }) : undefined

        if (!opts.address) return

        const chain = opts.networkId ? chainsMap[opts.networkId] : null

        const addressEncoding = detectAddressEncoding(opts.address)

        switch (addressEncoding) {
          case "ss58": {
            // `chainId === null` is valid and means we want to display the substrate (generic) format
            if (opts.networkId === null || chain) {
              copyAddress(encodeAnyAddress(opts.address, { ss58Format: chain?.prefix }), onQrClick)
              return
            }
            break
          }
          case "ethereum":
          case "base58solana": {
            copyAddress(normalizeAddress(opts.address), onQrClick)
            return
          }
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
