import { Balances } from "@talismn/balances"
import { uniq } from "lodash-es"
import { useCallback, useMemo } from "react"

import { useYieldxyzTalismanInputTokenIds } from "@ui/state"

import { useYieldxyzEnterModal } from "../Earn/yieldxyz/enter/useYieldxyzEnterModal"

export const usePortfolioEarnButton = (balances: Balances) => {
  const { open: openYieldxyzModal } = useYieldxyzEnterModal()
  const yieldxyzInputTokenIds = useYieldxyzTalismanInputTokenIds()

  // all tokenIds that match a yieldxyz product
  const yieldxyzTokenIds = useMemo(() => {
    const tokenIds = uniq(balances.each.map(({ tokenId }) => tokenId))
    return tokenIds.filter((tokenId) => yieldxyzInputTokenIds.includes(tokenId))
  }, [balances, yieldxyzInputTokenIds])

  const openEarnModal = useCallback(() => {
    if (yieldxyzTokenIds) openYieldxyzModal({ pickerTokenIds: yieldxyzTokenIds })

    // if(seekTokenId) {
    //     // TODO
    // }
  }, [yieldxyzTokenIds, openYieldxyzModal])

  return {
    // in the future we will support other earn providers
    canEarn: !!yieldxyzTokenIds.length, // || seekTokenId
    openEarnModal,
  }
}
