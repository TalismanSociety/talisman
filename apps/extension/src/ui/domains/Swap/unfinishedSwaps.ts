import { log } from "@common/log"
import { appStore, type UnfinishedSwap } from "@core/domains/app/store.app"
import { isAddressEqual } from "@talismn/crypto"

import { offerFrom, recoveryOffer } from "./components/swapTxCards"
import type { SwapRun } from "./swap-modules/swap-run"

type HeldFunds = Pick<UnfinishedSwap, "fromAddress" | "fromTokenId">

const heldFundsOffer = (run: SwapRun) => {
  if (run.legs.some((leg) => leg.at === "stopped")) return recoveryOffer(run)
  const waiting = run.legs.findIndex((leg) => leg.at === "queued" || leg.at === "ready")
  return waiting >= 0 ? offerFrom(run, waiting) : null
}

export const unfinishedSwapOf = (run: SwapRun): UnfinishedSwap | null => {
  const offer = heldFundsOffer(run)
  const start = run.quote.legs[0]
  const isWhereItStarted =
    offer?.fromTokenId === start.fromTokenId && offer.fromAddress === start.signer
  return offer && !isWhereItStarted ? { runId: run.id, ...offer } : null
}

export const withRunNote = (
  list: readonly UnfinishedSwap[],
  runId: string,
  note: UnfinishedSwap | null
): UnfinishedSwap[] => {
  const others = list.filter((entry) => entry.runId !== runId)
  if (!note) return others
  return [...others.filter((entry) => !isAddressEqual(entry.fromAddress, note.fromAddress)), note]
}

const withRunUpdate = (
  list: readonly UnfinishedSwap[],
  runId: string,
  note: UnfinishedSwap | null
): UnfinishedSwap[] =>
  list.some((entry) => entry.runId === runId) ? withRunNote(list, runId, note) : [...list]

export const withoutHeldFunds = (
  list: readonly UnfinishedSwap[],
  held: HeldFunds
): UnfinishedSwap[] =>
  list.filter(
    (entry) =>
      entry.fromTokenId !== held.fromTokenId || !isAddressEqual(entry.fromAddress, held.fromAddress)
  )

const updateUnfinishedSwaps = (update: (list: readonly UnfinishedSwap[]) => UnfinishedSwap[]) =>
  appStore
    .mutate((state) => ({ ...state, unfinishedSwaps: update(state.unfinishedSwaps ?? []) }))
    .catch((cause) => log.error("Failed to update the unfinished swaps", { cause }))

export const addUnfinishedSwap = (run: SwapRun) =>
  updateUnfinishedSwaps((list) => withRunNote(list, run.id, unfinishedSwapOf(run)))

export const updateUnfinishedSwap = (run: SwapRun) =>
  updateUnfinishedSwaps((list) => withRunUpdate(list, run.id, unfinishedSwapOf(run)))

export const clearUnfinishedSwap = (runId: string) =>
  updateUnfinishedSwaps((list) => withRunNote(list, runId, null))

export const clearUnfinishedSwapsHolding = (held: HeldFunds) =>
  updateUnfinishedSwaps((list) => withoutHeldFunds(list, held))
