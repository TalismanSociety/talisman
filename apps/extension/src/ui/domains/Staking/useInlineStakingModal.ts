import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

export const useInlineStakingModal = () => {
  const { account: selectedAccount } = useSelectedAccount()
  const { reset } = useInlineStakingWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("inlineStakingModal")
  const accountPicker = useGlobalOpenClose("inlineStakingAccountPicker")

  const open = useCallback(
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) => {
      reset({ address: address ?? selectedAccount?.address ?? null, tokenId: tokenId ?? null })
      accountPicker.close()

      // then open the modal
      innerOpen()
    },
    [accountPicker, innerOpen, reset, selectedAccount?.address]
  )

  return { isOpen, open, close }
}
