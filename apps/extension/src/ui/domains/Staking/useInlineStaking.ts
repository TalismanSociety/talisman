import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { atom, useAtom, useSetAtom } from "jotai"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useToken from "@ui/hooks/useToken"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"
import { useNominationPool } from "./useNominationPools"

const inlineStakingAddressState = atom<Address | null>(null)
const inlineStakingTokenIdState = atom<TokenId | null>(null)
const inlineStakingPoolIdState = atom<number | null>(null)

export const useInlineStakingForm = () => {
  const [address, setAddress] = useAtom(inlineStakingAddressState)
  const [tokenId, setTokenId] = useAtom(inlineStakingTokenIdState)
  const [poolId, setPoolId] = useAtom(inlineStakingPoolIdState)

  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const pool = useNominationPool(token?.chain?.id, poolId)

  const accountPicker = useGlobalOpenClose("inlineStakingAccountPicker")
  const poolPicker = useGlobalOpenClose("inlineStakingPoolPicker")

  return { account, token, pool, setAddress, setTokenId, setPoolId, accountPicker, poolPicker }
}

export const useInlineStakingModal = () => {
  const setAddress = useSetAtom(inlineStakingAddressState)
  const setTokenId = useSetAtom(inlineStakingTokenIdState)
  const setPoolId = useSetAtom(inlineStakingPoolIdState)

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("inlineStakingModal")
  const accountPicker = useGlobalOpenClose("inlineStakingAccountPicker")

  const open = useCallback(
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) => {
      // reset all child states
      accountPicker.close()
      setAddress(address ?? selectedAccount?.address ?? null)
      setTokenId(tokenId ?? null)
      setPoolId(12)

      // then open the modal
      innerOpen()
    },
    [accountPicker, innerOpen, selectedAccount?.address, setAddress, setPoolId, setTokenId]
  )

  return { isOpen, open, close }
}
