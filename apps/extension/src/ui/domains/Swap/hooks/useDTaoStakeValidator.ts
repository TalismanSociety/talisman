import { log } from "@common/log"
import type { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { notify } from "@ui/components/Notifications"
import { parseDTaoTokenId } from "@ui/domains/Staking/Bittensor/utils/dTaoLeg"
import { getDefaultValidatorHotkey } from "@ui/domains/Staking/Bittensor/utils/getDefaultValidatorHotkey"
import { useBalances, useIsBalanceInitializing } from "@ui/state/balances"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

/** how long the swap may take to list a position the wallet just registered */
const LISTING_TIMEOUT_MS = 20_000

type Choice = {
  /** the destination the choice replaces: the choice is dropped if it changes meanwhile */
  from: TokenId
  /** null while the wallet registers the position's token */
  position: TokenId | null
}

type Props = {
  toTokenId: TokenId | null
  /** the account the stake lands on */
  address: string | null
  /** the tokens the swap can deliver: a position is selectable once it is one of them */
  toAssetIds: readonly TokenId[] | undefined
  setToTokenId: (tokenId: TokenId) => void
}

/**
 * A stake's validator is the hotkey of its destination token. A subnet's own token has none, so
 * this replaces it with the position of the default validator, and with the position of any
 * validator the user picks. The wallet only knows the positions it found a stake on: the others
 * are registered first, and selected once the swap lists them.
 */
export const useDTaoStakeValidator = ({ toTokenId, address, toAssetIds, setToTokenId }: Props) => {
  const { t } = useTranslation()
  const balances = useBalances("owned")
  const isBalanceInitialising = useIsBalanceInitializing()
  const remoteConfig = useRemoteConfig()
  const [choice, setChoice] = useState<Choice | null>(null)

  const choose = useCallback(
    async (hotkey: string) => {
      const target = parseDTaoTokenId(toTokenId)
      if (!toTokenId || !target) return
      const from = toTokenId
      setChoice({ from, position: null })
      try {
        const position = await api.registerDTaoPosition({
          networkId: target.networkId,
          netuid: target.netuid,
          hotkey,
        })
        setChoice((current) => (current?.from === from ? { from, position } : current))
      } catch (cause) {
        setChoice((current) => (current?.from === from ? null : current))
        throw cause
      }
    },
    [toTokenId]
  )

  const chooseValidator = useCallback(
    (hotkey: string) =>
      choose(hotkey).catch((cause) =>
        notify({ type: "error", title: t("Failed to select the validator"), cause })
      ),
    [choose, t]
  )

  // a default that could not be registered is not asked for again: it would loop
  const failedDefaults = useRef(new Set<string>())

  useEffect(() => {
    if (!choice) return
    if (choice.from !== toTokenId) return setChoice(null)
    if (!choice.position) return
    if (toAssetIds?.includes(choice.position)) {
      setToTokenId(choice.position)
      return setChoice(null)
    }
    // the swap lists a new token on its next refresh: without one, the choice must not hold the form
    const timeout = setTimeout(() => {
      failedDefaults.current.add(`${choice.from}|${address}`)
      setChoice(null)
    }, LISTING_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [choice, toTokenId, toAssetIds, setToTokenId, address])

  useEffect(() => {
    const target = parseDTaoTokenId(toTokenId)
    if (!toTokenId || !target || target.hotkey || !address || choice || isBalanceInitialising)
      return
    // a subnet the swap cannot deliver from this source has no position to list either
    if (!toAssetIds?.includes(toTokenId)) return
    const attempt = `${toTokenId}|${address}`
    if (failedDefaults.current.has(attempt)) return
    const hotkey = getDefaultValidatorHotkey(
      target.networkId,
      target.netuid,
      remoteConfig,
      balances,
      address,
      "featured"
    )
    if (hotkey)
      choose(hotkey).catch((cause) => {
        failedDefaults.current.add(attempt)
        log.error("Failed to choose the default validator of a subnet", cause)
      })
  }, [
    toTokenId,
    address,
    choice,
    isBalanceInitialising,
    toAssetIds,
    remoteConfig,
    balances,
    choose,
  ])

  return { chooseValidator, isChoosingValidator: !!choice }
}
