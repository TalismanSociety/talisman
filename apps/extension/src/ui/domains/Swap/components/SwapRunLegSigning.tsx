import { log } from "@common/log"
import { db } from "@core/db"
import {
  evmNativeTokenId,
  networkIdFromTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { getErrorMessage } from "@talismn/util"
import { queryOptions, skipToken, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { withPricing } from "@ui/domains/Ethereum/withPricing"
import type {
  TxSubmitButtonTransactionDot,
  TxSubmitButtonTransactionEth,
} from "@ui/domains/Sign/TxSubmitButton/types"
import { getMevShieldFeeEstimate } from "@ui/domains/Staking/Bittensor/hooks/useMevShieldFeeEstimate"
import { useAccountByAddress } from "@ui/state/accounts"
import { getToken$ } from "@ui/state/chaindata"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { firstValueFrom } from "rxjs"
import type { Hex, PublicClient } from "viem"

import {
  type ApprovalInfo,
  type BuiltLeg,
  platformFromTokenId,
  type QuoteLeg,
} from "../swap-modules/common.swap-module"
import {
  type AllowanceStep,
  approveRequest,
  type MinedApproval,
} from "../swap-modules/erc20-approval"
import { prepareTransactionRequestWithGasCheck } from "../swap-modules/evm-gas-check"
import { getEvmPublicClient } from "../swap-modules/evm-network"
import { type LegStep, nextLegStep, type SwapRun } from "../swap-modules/swap-run"
import { uiSwapEnv } from "../swapEnv.ui"
import { type SwapModuleEntry, swapModules } from "../swaps.api"
import { useLegMevShield } from "./BittensorLegDetails"
import { SwapTxSubmitButton } from "./SwapTxSubmitButton"
import type { RunLegSigning } from "./swapTxCards"

/** the leg as built on what the previous leg landed, not as quoted */
type BuiltLegFacts = Pick<QuoteLeg, "inputAmount" | "outputAmount" | "fees"> &
  Pick<BuiltLeg, "acceptedOutput">

/**
 * What the user signs next for a leg: the leg itself, or first the allowance its spender needs.
 */
type LegSignRequest =
  | { signs: "leg"; tx: TxSubmitButtonTransactionEth; built: BuiltLegFacts }
  | {
      signs: "leg"
      tx: TxSubmitButtonTransactionDot
      built: BuiltLegFacts
      fee: { tokenId: TokenId; planck: bigint }
    }
  | {
      signs: "approval"
      step: Exclude<AllowanceStep, "none">
      symbol: string
      tx: TxSubmitButtonTransactionEth
    }

const APPROVAL_WAIT_MS = 2 * 60_000
const SUBSTRATE_REBUILD_MS = 2 * 60_000

type MinedLegApproval = Pick<MinedApproval, "blockNumber" | "nonce">

type SignedStep = Exclude<AllowanceStep, "none"> | "leg"

type SignAttempt = { step: SignedStep; nonce: number }

const nextNonce = (count: number, mined: MinedLegApproval | undefined) =>
  mined ? Math.max(count, mined.nonce + 1) : count

const isApprovalAttemptMined = (attempt: SignAttempt, mined: MinedLegApproval | undefined) =>
  attempt.step !== "leg" && mined !== undefined && mined.nonce >= attempt.nonce

const pinnedNonce = (
  attempt: SignAttempt | undefined,
  signs: SignedStep,
  mined: MinedLegApproval | undefined
) =>
  attempt?.step === signs && !isApprovalAttemptMined(attempt, mined) ? attempt.nonce : undefined

/** A leg of this run mined on the nonce may be the attempt the node took, so it does not count */
const isNonceMinedOutsideRun = async (
  run: SwapRun,
  networkId: string,
  signer: Hex,
  nonce: number
) => {
  const firstLeg = run.legs[0]
  const firstLegHash = "hash" in firstLeg ? firstLeg.hash : undefined
  const mined = await db.transactionsV2
    .filter(
      (tx) =>
        tx.platform === "ethereum" &&
        tx.networkId === networkId &&
        tx.nonce === nonce &&
        tx.blockNumber !== undefined &&
        isAddressEqual(tx.account, signer) &&
        !(firstLegHash && tx.txInfo?.swapRun?.firstLegHash === firstLegHash)
    )
    .first()
  return mined !== undefined
}

const buildApprovalTransaction = async (
  client: PublicClient,
  leg: QuoteLeg,
  approval: NonNullable<ApprovalInfo>,
  step: Exclude<AllowanceStep, "none">,
  nonce: number
): Promise<LegSignRequest> => {
  const networkId = networkIdFromTokenId(leg.fromTokenId)
  const signer = leg.signer as Hex
  const { call, txInfo } = approveRequest(leg.fromTokenId, approval, step)
  const [token, { to, data, value, gas }] = await Promise.all([
    firstValueFrom(getToken$(leg.fromTokenId)),
    prepareTransactionRequestWithGasCheck(client, evmNativeTokenId(networkId), {
      chain: null,
      account: signer,
      ...call,
    }),
  ])
  return {
    signs: "approval",
    step,
    symbol: token?.symbol ?? "",
    tx: {
      platform: "ethereum",
      networkId,
      payload: { from: signer, to, data, value, gas, nonce },
      txInfo,
    },
  }
}

type BuiltStep = Extract<LegStep, { signs: "leg" }>

const signedLeg = (run: SwapRun, index: number, { built, input }: BuiltStep) => {
  const firstLeg = run.legs[0]
  const swapRun = {
    firstLegHash: "hash" in firstLeg ? firstLeg.hash : undefined,
    isLastLeg: index === run.quote.legs.length - 1,
  }
  const facts: BuiltLegFacts = {
    inputAmount: input,
    outputAmount: built.expectedOutput,
    fees: built.fees,
    acceptedOutput: built.acceptedOutput,
  }
  return { txInfo: { ...built.txInfo, swapRun }, built: facts }
}

const buildSubstrateLegSignRequest = async (
  run: SwapRun,
  index: number,
  module: SwapModuleEntry,
  withMevShield: boolean
): Promise<LegSignRequest> => {
  const { signer, fromTokenId } = run.quote.legs[index]
  if (!signer) throw new Error("This leg has no signer")
  const networkId = networkIdFromTokenId(fromTokenId)
  const sapi = await uiSwapEnv.substrateApi(networkId)
  const step = await nextLegStep({
    run,
    index,
    module,
    chain: {
      platform: "polkadot",
      sapi,
      feeOnTop: withMevShield
        ? (payload) => getMevShieldFeeEstimate(sapi, signer, payload)
        : undefined,
    },
  })
  if (
    step.signs !== "leg" ||
    step.built.transaction.platform !== "polkadot" ||
    step.fee === undefined
  )
    throw new Error("Only a substrate transaction is signed on a substrate leg")

  const { txInfo, built } = signedLeg(run, index, step)
  const { payload, txMetadata } = step.built.transaction
  return {
    signs: "leg",
    tx: { platform: "polkadot", payload, txMetadata, txInfo },
    built,
    fee: { tokenId: subNativeTokenId(networkId), planck: step.fee },
  }
}

const buildLegSignRequest = async (
  run: SwapRun,
  index: number,
  mined: MinedLegApproval | undefined,
  failedAttempt: SignAttempt | undefined,
  withMevShield: boolean
): Promise<LegSignRequest> => {
  const leg = run.quote.legs[index]
  const module = swapModules.find((candidate) => candidate.protocol === leg.protocol)
  if (!module) throw new Error("This swap provider is unavailable")
  if (platformFromTokenId(leg.fromTokenId) === "polkadot")
    return buildSubstrateLegSignRequest(run, index, module, withMevShield)

  const networkId = networkIdFromTokenId(leg.fromTokenId)
  const signer = leg.signer as Hex
  const client = await getEvmPublicClient(networkId)
  const [step, count] = await Promise.all([
    nextLegStep({
      run,
      index,
      module,
      chain: { platform: "ethereum", client },
      allowanceAt: mined?.blockNumber,
    }),
    api.ethGetTransactionsCount(signer, networkId),
  ])
  const signs: SignedStep = step.signs === "approval" ? step.allowance : "leg"
  const pinned = pinnedNonce(failedAttempt, signs, mined)
  const nonce =
    pinned === undefined
      ? nextNonce(count, mined)
      : (await isNonceMinedOutsideRun(run, networkId, signer, pinned))
        ? Math.max(nextNonce(count, mined), pinned + 1)
        : pinned
  if (step.signs === "approval")
    return buildApprovalTransaction(client, leg, step.approval, step.allowance, nonce)

  if (step.built.transaction.platform !== "ethereum")
    throw new Error("Only an EVM leg is signed on screen")
  const { to, data, value, gas } = step.built.transaction.transaction
  const { txInfo, built } = signedLeg(run, index, step)
  return {
    signs: "leg",
    tx: {
      platform: "ethereum",
      networkId,
      payload: { from: signer, to, data, value, gas, nonce },
      txInfo,
    },
    built,
  }
}

const errorSummary = (error: unknown, fallback: string) =>
  (error as { shortMessage?: string }).shortMessage || getErrorMessage(error, fallback)

const legSignQuery = (
  run: SwapRun,
  index: number | null,
  mined: MinedLegApproval | undefined,
  failedAttempt: SignAttempt | undefined,
  withMevShield: boolean
) =>
  queryOptions({
    queryKey: [
      "swap-run-leg",
      run.id,
      index,
      mined?.blockNumber.toString(),
      mined?.nonce,
      failedAttempt?.step,
      failedAttempt?.nonce,
      withMevShield,
    ],
    queryFn:
      index !== null
        ? () => buildLegSignRequest(run, index, mined, failedAttempt, withMevShield)
        : skipToken,
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
    refetchInterval: ({ state }) =>
      state.data?.tx.platform === "polkadot" ? SUBSTRATE_REBUILD_MS : false,
    retry: false,
  })

const waitForApproval = async (tx: TxSubmitButtonTransactionEth, hash: Hex) => {
  try {
    const client = await getEvmPublicClient(tx.networkId)
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: APPROVAL_WAIT_MS })
    return receipt.blockNumber
  } catch (cause) {
    log.warn("Could not wait for the approval to mine", { cause, hash })
    return undefined
  }
}

const signedStep = (request: LegSignRequest): SignedStep =>
  request.signs === "approval" ? request.step : request.signs

const ethTxOf = (request: LegSignRequest | undefined) =>
  request?.tx.platform === "ethereum" ? request.tx : undefined

const attemptOf = (request: LegSignRequest | undefined): SignAttempt | undefined => {
  const nonce = ethTxOf(request)?.payload.nonce
  return request && nonce !== undefined ? { step: signedStep(request), nonce } : undefined
}

type LegFee = {
  tokenId: TokenId | undefined
  planck: bigint | null
  isLoading: boolean
  hasError: boolean
}

const legFee = (
  request: LegSignRequest | undefined,
  ethTx: ReturnType<typeof useEthTransaction>
): LegFee => {
  if (request && "fee" in request) return { ...request.fee, isLoading: false, hasError: false }
  const networkId = ethTxOf(request)?.networkId
  return {
    tokenId: networkId && evmNativeTokenId(networkId),
    planck: ethTx.txDetails?.estimatedFee ?? null,
    isLoading: !!ethTx.isLoading,
    hasError: !!ethTx.error && !ethTx.txDetails,
  }
}

type LegNote<T> = { leg: number; value: T }

const noteFor = <T,>(note: LegNote<T> | undefined, leg: number | null) =>
  note && note.leg === leg ? note.value : undefined

/** an approval's gas limit or priority must not carry over to the approval or leg after it */
const useFreshPricingPer = (
  signed: string | undefined,
  { setCustomSettings, setPriority }: ReturnType<typeof useEthTransaction>
) => {
  const [pricedFor, setPricedFor] = useState(signed)
  if (signed && signed !== pricedFor) {
    setPricedFor(signed)
    setCustomSettings(undefined)
    setPriority(undefined)
  }
}

export const useLegSigning = (
  run: SwapRun,
  index: number | null,
  onLegSent: (index: number, hash: Hex, input: bigint) => void
) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [minedApproval, setMinedApproval] = useState<LegNote<MinedLegApproval>>()
  const [failedAttempt, setFailedAttempt] = useState<LegNote<SignAttempt>>()
  const legFailedAttempt = noteFor(failedAttempt, index)
  const leg = index === null ? undefined : run.quote.legs[index]
  const signer = useAccountByAddress(leg?.signer)
  const shield = useLegMevShield({ leg, account: signer, sapi: null, payload: undefined })
  const request = useQuery(
    legSignQuery(run, index, noteFor(minedApproval, index), legFailedAttempt, shield.withMevShield)
  )
  const ethRequest = ethTxOf(request.data)
  const ethTx = useEthTransaction(ethRequest?.payload, ethRequest?.networkId)
  useFreshPricingPer(request.data && `${index}:${signedStep(request.data)}`, ethTx)
  const [approvalHashes, setApprovalHashes] = useState<Readonly<Partial<Record<number, Hex>>>>({})
  const [signFailure, setSignFailure] = useState<LegNote<string>>()
  const [isApprovalPending, setIsApprovalPending] = useState(false)
  const [rejectedSubmissions, setRejectedSubmissions] = useState(0)

  const tx: TxSubmitButtonTransactionEth | TxSubmitButtonTransactionDot | undefined =
    request.data?.tx.platform === "polkadot"
      ? { ...request.data.tx, mode: shield.txMode }
      : ethRequest && ethTx.transaction && !ethTx.error
        ? {
            ...ethRequest,
            payload: { ...ethTx.transaction, nonce: ethRequest.payload.nonce },
            txInfo: ethRequest.txInfo && withPricing(ethRequest.txInfo, ethTx),
          }
        : undefined

  const failure = request.error
    ? errorSummary(request.error, t("Failed to prepare the transaction"))
    : noteFor(signFailure, index)

  const approvalHash = index === null ? undefined : approvalHashes[index]
  const signs = request.data?.signs
  const signing = useMemo<RunLegSigning | null>(
    () => (index === null ? null : { leg: index, signs, approvalHash, isApprovalPending, failure }),
    [approvalHash, failure, index, isApprovalPending, signs]
  )

  const clearFailure = () => setSignFailure(undefined)
  const rebuild = () => request.refetch()

  const onSubmit = async (hash: string) => {
    clearFailure()
    if (!request.data || index === null) return
    if (request.data.signs === "leg")
      return onLegSent(index, hash as Hex, request.data.built.inputAmount)

    const { tx } = request.data
    setApprovalHashes((hashes) => ({ ...hashes, [index]: hash as Hex }))
    setIsApprovalPending(true)
    const blockNumber = await waitForApproval(tx, hash as Hex)
    if (blockNumber !== undefined && tx.payload.nonce !== undefined) {
      const mined = { blockNumber, nonce: tx.payload.nonce }
      await queryClient.prefetchQuery(
        legSignQuery(run, index, mined, legFailedAttempt, shield.withMevShield)
      )
      setMinedApproval({ leg: index, value: mined })
    } else await rebuild()
    setIsApprovalPending(false)
  }

  const attempt = attemptOf(request.data)
  const onError = (cause: unknown) => {
    setRejectedSubmissions((count) => count + 1)
    if (index !== null) {
      setSignFailure({ leg: index, value: errorSummary(cause, t("Failed to submit")) })
      if (attempt) setFailedAttempt({ leg: index, value: attempt })
    }
    rebuild()
  }

  const onPayloadLockChange = (isLocked: boolean) => {
    if (isLocked) clearFailure()
    else rebuild()
  }

  return {
    signing,
    approvalHashes,
    ethTx: ethRequest ? ethTx : undefined,
    shield,
    built: request.data?.signs === "leg" ? request.data.built : undefined,
    fee: legFee(request.data, ethTx),
    blockingError: ethTx.error,
    button: {
      request: request.data,
      tx,
      isLedger: !!signer?.type.startsWith("ledger-"),
      isBuildFailed: request.isError,
      isRetry: !!failure,
      isApprovalPending,
      rejectedSubmissions,
      rebuild,
      onSubmit,
      onError,
      onPayloadLockChange,
    },
  }
}

export type LegSigningState = ReturnType<typeof useLegSigning>

export const LegSignButton: FC<{
  button: LegSigningState["button"]
  containerId?: string
}> = ({ button, containerId }) => {
  const { t } = useTranslation()
  const { request, tx } = button

  if (button.isBuildFailed)
    return (
      <Button color="orange" fullWidth onClick={button.rebuild}>
        {t("Try again")}
      </Button>
    )

  if (!request)
    return (
      <Button primary fullWidth processing>
        {t("Processing")}
      </Button>
    )

  const label =
    request.signs === "approval"
      ? request.step === "revoke"
        ? t("Revoke Approval")
        : t("Approve {{symbol}}", { symbol: request.symbol })
      : button.isLedger
        ? t("Sign on Ledger")
        : t("Sign")

  return (
    <SwapTxSubmitButton
      key={button.rejectedSubmissions}
      containerId={containerId}
      tx={tx}
      label={label}
      isRetry={button.isRetry}
      isFinalStep={request.signs !== "approval"}
      isProcessing={button.isApprovalPending}
      onSubmit={button.onSubmit}
      onError={button.onError}
      onPayloadLockChange={button.onPayloadLockChange}
      disabled={!tx}
    />
  )
}
