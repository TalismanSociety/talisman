import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { atom, useAtomValue, useSetAtom } from "jotai"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { accountsByAddressAtomFamily, tokenByIdAtomFamily } from "@ui/atoms"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"

const inlineStakingAddressState = atom<Address | null>(null)
const inlineStakingTokenIdState = atom<TokenId | null>(null)

const inlineStakingState = atom(async (get) => {
  const [account, token] = await Promise.all([
    get(accountsByAddressAtomFamily(get(inlineStakingAddressState))),
    get(tokenByIdAtomFamily(get(inlineStakingTokenIdState))),
  ])

  return { account, token }
})

export const useInlineStakingForm = () => {
  const { account, token } = useAtomValue(inlineStakingState)

  const setAddress = useSetAtom(inlineStakingAddressState)
  const setTokenId = useSetAtom(inlineStakingTokenIdState)

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
      accountPicker.close()
      setAddress(address ?? selectedAccount?.address ?? null)
      setTokenId(tokenId ?? null)
      innerOpen()
    },
    [accountPicker, innerOpen, selectedAccount?.address, setAddress, setTokenId]
  )

  return { isOpen, open, close }
}
