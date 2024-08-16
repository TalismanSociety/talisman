import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { atom, useAtom, useSetAtom } from "jotai"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useToken from "@ui/hooks/useToken"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"

const inlineStakingAddressState = atom<Address | null>(null)
const inlineStakingTokenIdState = atom<TokenId | null>(null)

export const useInlineStakingForm = () => {
  const [address, setAddress] = useAtom(inlineStakingAddressState)
  const [tokenId, setTokenId] = useAtom(inlineStakingTokenIdState)

  const account = useAccountByAddress(address)
  const token = useToken(tokenId)

  const accountPicker = useGlobalOpenClose("inlineStakingAccountPicker")

  return { account, token, setAddress, setTokenId, accountPicker }
}

export const useInlineStakingModal = () => {
  const setAddress = useSetAtom(inlineStakingAddressState)
  const setTokenId = useSetAtom(inlineStakingTokenIdState)

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("inlineStakingModal")
  const accountPicker = useGlobalOpenClose("inlineStakingAccountPicker")

  const open = useCallback(
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) => {
      // reset all child states
      accountPicker.close()
      setAddress(address ?? selectedAccount?.address ?? null)
      setTokenId(tokenId ?? null)

      // then open the modal
      innerOpen()
    },
    [accountPicker, innerOpen, selectedAccount?.address, setAddress, setTokenId]
  )

  return { isOpen, open, close }
}
