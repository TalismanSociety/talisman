import { log } from "@common/log"
import { getBtcLedgerPaths } from "@core/domains/bitcoin/helpers"
import { normalizeXpub } from "@talismn/crypto"
import { api } from "@ui/api"
import type { LedgerAccountDefBitcoin } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerBitcoin } from "@ui/hooks/ledger/useLedgerBitcoin"
import { useAccounts } from "@ui/state/accounts"
import { type FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { type DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"
import { LedgerConnectionStatus, type LedgerConnectionStatusProps } from "./LedgerConnectionStatus"

type LedgerBitcoinAccount = DerivedAccountBase &
  LedgerAccountDefBitcoin & { previewSats?: string; previewTxCount?: number }

const useLedgerBitcoinAccounts = (
  name: string,
  selectedAccounts: LedgerAccountDefBitcoin[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const { t } = useTranslation()
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<(LedgerBitcoinAccount | undefined)[]>([
    ...Array(itemsPerPage),
  ])

  const refIsBusy = useRef(false)
  const { getMasterFingerprint, getExtendedPubkey } = useLedgerBitcoin()

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account addresses..."),
  })

  const refCache = useRef<Record<number, LedgerBitcoinAccount>>({})
  const refPageIndex = useRef(pageIndex)
  useEffect(() => {
    refPageIndex.current = pageIndex
  }, [pageIndex])

  const loadPage = useCallback(
    async (pageIndex: number, force = false) => {
      if (!force && refIsBusy.current) return
      refIsBusy.current = true

      setConnectionStatus({ status: "connecting", message: t("Fetching account addresses...") })
      const skip = pageIndex * itemsPerPage

      try {
        const masterFingerprint = `0x${await getMasterFingerprint()}` as `0x${string}`
        const newAccounts: (LedgerBitcoinAccount | undefined)[] = [...Array(itemsPerPage)]
        setDerivedAccounts([...newAccounts])

        for (let i = 0; i < itemsPerPage; i++) {
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)

          const accountIndex = skip + i
          let account = refCache.current[accountIndex]

          if (!account) {
            const paths = getBtcLedgerPaths(accountIndex)
            const [paymentsXpub, ordinalsXpub] = await Promise.all([
              getExtendedPubkey(paths.payments),
              getExtendedPubkey(paths.ordinals),
            ])
            if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)

            const identity = normalizeXpub(paymentsXpub)
            const preview = await api
              .btcAccountPreview({ networkId: "bitcoin", paymentsXpub })
              .catch(() => null)

            account = {
              type: "ledger-bitcoin",
              name: `${name.trim()} ${accountIndex + 1}`,
              address: identity,
              accountIndex,
              masterFingerprint,
              keys: {
                payments: { derivationPath: paths.payments, xpub: identity },
                ordinals: { derivationPath: paths.ordinals, xpub: ordinalsXpub },
              },
              previewSats: preview?.totalSats,
              previewTxCount: preview?.txCount,
            }
            refCache.current[accountIndex] = account
          }

          newAccounts[i] = account
          setDerivedAccounts([...newAccounts])
        }

        setConnectionStatus({ status: "ready", message: t("Ledger is ready.") })
      } catch (err) {
        const error = getTalismanLedgerError(err)
        log.error("Failed to load bitcoin ledger page", { err })
        setConnectionStatus({
          status: "error",
          message: error.message,
          onRetryClick: () => loadPage(pageIndex),
        })
      } finally {
        refIsBusy.current = false
      }
    },
    [getExtendedPubkey, getMasterFingerprint, itemsPerPage, name, t]
  )

  const accounts = derivedAccounts.map((acc) => {
    if (!acc) return null
    const existing = walletAccounts?.find((wa) => wa.address === acc.address)
    return {
      ...acc,
      name: existing?.name ?? acc.name,
      connected: !!existing,
      selected: selectedAccounts.some((sa) => sa.accountIndex === acc.accountIndex),
    }
  })

  useEffect(() => {
    loadPage(pageIndex)
  }, [loadPage, pageIndex])

  return { accounts, connectionStatus }
}

type LedgerBitcoinAccountPickerProps = {
  name: string
  onChange?: (accounts: LedgerAccountDefBitcoin[]) => void
}

export const LedgerBitcoinAccountPicker: FC<LedgerBitcoinAccountPickerProps> = ({
  name,
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefBitcoin[]>([])
  const { accounts, connectionStatus } = useLedgerBitcoinAccounts(
    name,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { accountIndex, name, address, masterFingerprint, keys } = acc as LedgerBitcoinAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.accountIndex === accountIndex)
        ? prev.filter((pa) => pa.accountIndex !== accountIndex)
        : prev.concat({
            type: "ledger-bitcoin",
            name,
            address,
            accountIndex,
            masterFingerprint,
            keys,
          })
    )
  }, [])

  useEffect(() => {
    if (onChange) onChange(selectedAccounts)
  }, [onChange, selectedAccounts])

  return (
    <>
      <div className="mb-8">
        <LedgerConnectionStatus {...connectionStatus} />
      </div>
      <DerivedAccountPickerBase
        accounts={accounts}
        withBalances={false}
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={() => setPageIndex(0)}
        onPagerPrevClick={() => setPageIndex((p) => p - 1)}
        onPagerNextClick={() => setPageIndex((p) => p + 1)}
      />
    </>
  )
}
