import { deserializeBitcoinUtxo } from "@core/domains/bitcoin/helpers"
import type { Account } from "@core/domains/keyring/exports"
import {
  type BitcoinNetworkName,
  type BtcFeeEstimates,
  type BuildTransferPsbtResult,
  buildTransferPsbt,
  type PsbtAccountMeta,
} from "@talismn/bitcoin"
import { isTokenBtc } from "@talismn/chaindata-provider"
import { isBitcoinXpub } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { useMemo, useState } from "react"

import type { SendFundsTransactionProps } from "./types"

export type BtcFeePriority = "economy" | "medium" | "fast"

export const PRIORITY_TO_ESTIMATE: Record<BtcFeePriority, keyof BtcFeeEstimates> = {
  economy: "economy",
  medium: "halfHour",
  fast: "fastest",
}

const getAccountMeta = (account: Account | null): PsbtAccountMeta | undefined =>
  account && (account.type === "hd-bitcoin" || account.type === "ledger-bitcoin")
    ? {
        masterFingerprint: account.masterFingerprint,
        trees: [
          { tree: "payments", derivationPath: account.keys.payments.derivationPath },
          { tree: "ordinals", derivationPath: account.keys.ordinals.derivationPath },
        ],
      }
    : undefined

export const useSendFundsTransactionBtc = ({
  tokenId,
  from,
  to,
  value = "0",
  sendMax,
}: SendFundsTransactionProps) => {
  const [isLocked, setIsLocked] = useState(false)
  const [priority, setPriority] = useState<BtcFeePriority>("medium")

  const token = useToken(tokenId)
  const isBtc = isTokenBtc(token)
  const networkId = isBtc ? token.networkId : undefined
  const account = useAccountByAddress(from)

  const qFees = useQuery({
    queryKey: ["btcFeeEstimates", networkId],
    queryFn: () => api.btcGetFeeEstimates({ networkId: networkId as string }),
    enabled: isBtc && !!networkId,
    refetchInterval: isLocked ? false : 60_000,
    retry: 1,
  })

  const qUtxos = useQuery({
    queryKey: ["btcUtxos", networkId, from],
    queryFn: () => api.btcGetUtxos({ networkId: networkId as string, address: from as string }),
    enabled: isBtc && !!networkId && !!from,
    // a full UTXO scan is expensive (rate-limited esplora): fetch once and reuse rather
    // than re-scanning on a timer
    refetchInterval: false,
    staleTime: 300_000,
    retry: 1,
  })

  // change always goes to the payments internal chain; WIF accounts (single static
  // address) reuse their own address
  const isWifAccount = account?.type === "keypair"
  const qChange = useQuery({
    queryKey: ["btcChangeAddress", networkId, from, isWifAccount],
    queryFn: async () => {
      if (isWifAccount) return { address: from as string, index: 0 }
      return api.btcGetUnusedAddress({
        networkId: networkId as string,
        address: from as string,
        tree: "payments",
        chain: 1,
      })
    },
    enabled: isBtc && !!networkId && !!from,
    staleTime: 300_000,
    retry: 1,
  })

  // sending to one of our own bitcoin accounts: resolve its xpub identity to a receive address
  const qRecipient = useQuery({
    queryKey: ["btcRecipient", networkId, to],
    queryFn: async () => {
      if (!to) return null
      if (!isBitcoinXpub(to)) return to
      const res = await api.btcGetUnusedAddress({
        networkId: networkId as string,
        address: to,
        tree: "payments",
        chain: 0,
      })
      return res.address
    },
    enabled: isBtc && !!networkId && !!to,
    staleTime: 300_000,
    retry: 1,
  })

  const feeRate = qFees.data?.[PRIORITY_TO_ESTIMATE[priority]]
  const recipient = qRecipient.data
  const changeAddress = qChange.data?.address
  const accountMeta = useMemo(() => getAccountMeta(account), [account])

  const build = useMemo((): { data?: BuildTransferPsbtResult; error?: Error } => {
    if (!isBtc || !networkId || !from || !recipient || !qUtxos.data || !feeRate || !changeAddress)
      return {}
    if (!sendMax && (!value || BigInt(value) <= 0n)) return {}

    try {
      const utxos = qUtxos.data.utxos.map(deserializeBitcoinUtxo)
      return {
        data: buildTransferPsbt({
          utxos,
          recipient,
          amountSats: sendMax ? "max" : BigInt(value),
          feeRateSatVb: feeRate,
          changeAddress,
          network: networkId as BitcoinNetworkName,
          account: accountMeta,
          lockTimeHeight: qUtxos.data.tipHeight,
        }),
      }
    } catch (error) {
      return { error: error as Error }
    }
  }, [
    isBtc,
    networkId,
    from,
    recipient,
    qUtxos.data,
    feeRate,
    changeAddress,
    sendMax,
    value,
    accountMeta,
  ])

  // max amount = sweep: all payments-tree utxos minus the fee of the sweep transaction
  const maxAmount = useMemo(() => {
    if (!isBtc || !networkId || !recipient || !qUtxos.data || !feeRate || !changeAddress)
      return null
    try {
      const utxos = qUtxos.data.utxos.map(deserializeBitcoinUtxo)
      const sweep = buildTransferPsbt({
        utxos,
        recipient,
        amountSats: "max",
        feeRateSatVb: feeRate,
        changeAddress,
        network: networkId as BitcoinNetworkName,
        account: accountMeta,
      })
      return String(sweep.sentSats)
    } catch {
      return null
    }
  }, [isBtc, networkId, recipient, qUtxos.data, feeRate, changeAddress, accountMeta])

  if (!isBtc) return null

  return {
    platform: "bitcoin" as const,

    networkId: token.networkId,
    psbtBase64: build.data?.psbtBase64 ?? null,
    sentSats: build.data ? String(build.data.sentSats) : null,
    usesOrdinalsUtxos: !!build.data?.usesOrdinalsUtxos,
    // actual on-chain output address (recipient xpub identities are resolved to
    // a receive address) — this is what tx history must record, never the xpub
    recipientAddress: recipient ?? null,

    isLoading: qFees.isLoading || qUtxos.isLoading || qChange.isLoading || qRecipient.isLoading,
    isRefetching: qFees.isRefetching || qUtxos.isRefetching,
    error: build.error || qFees.error || qUtxos.error || qChange.error || qRecipient.error,

    maxAmount,
    estimatedFee: build.data ? String(build.data.feeSats) : null,
    feeTokenId: token.id,
    riskAnalysis: undefined,

    feeEstimates: qFees.data ?? null,
    feeRate: feeRate ?? null,
    priority,
    setPriority,

    setIsLocked,
  }
}
