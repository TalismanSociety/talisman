import { addressFormatOf, copiedNetworkId, type ReceiveEntry } from "@common/analytics/funds"
import type { Network } from "@talismn/chaindata-provider"
import { detectAddressEncoding, encodeAnyAddress, normalizeAddress } from "@talismn/crypto"
import { track } from "@ui/api/track"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useNetworksMapById } from "@ui/state/chaindata"
import { copyAddress } from "@ui/util/copyAddress"
import { useCallback } from "react"

import type { CopyAddressOpenInputs } from "./types"

const [useCopyAddressOpenClose] = createGlobalOpenClose<CopyAddressOpenInputs>()

const copyShortcut = async (
  entry: ReceiveEntry,
  address: string,
  network: Network | null | undefined,
  onQrClick: (() => void) | undefined
) => {
  if (await copyAddress(address, onQrClick))
    track("address_copied", {
      entry,
      network_id: copiedNetworkId(network),
      address_format: addressFormatOf(address),
    })
}

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen, args } = useCopyAddressOpenClose()
  const chainsMap = useNetworksMapById({ platform: "polkadot" })
  const inputs = args ?? {}

  const open = useCallback(
    (opts: CopyAddressOpenInputs) => {
      // skip wizard if we have all information we need, unless qr is explicitely requested
      if (opts.address && !opts.qr) {
        const onQrClick =
          opts.qr !== false ? () => open({ ...opts, entry: "copy_toast", qr: true }) : undefined

        if (!opts.address) return

        const chain = opts.networkId ? chainsMap[opts.networkId] : null

        const addressEncoding = detectAddressEncoding(opts.address)

        switch (addressEncoding) {
          case "ss58": {
            // `chainId === null` is valid and means we want to display the substrate (generic) format
            if (opts.networkId === null || chain) {
              copyShortcut(
                opts.entry,
                encodeAnyAddress(opts.address, { ss58Format: chain?.prefix }),
                chain,
                onQrClick
              )
              return
            }
            break
          }
          case "ethereum":
          case "base58solana": {
            copyShortcut(opts.entry, normalizeAddress(opts.address), null, onQrClick)
            return
          }
        }
      }

      // display the wizard
      innerOpen(opts)
    },
    [chainsMap, innerOpen]
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
