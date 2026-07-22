import type { BitcoinUtxo } from "@talismn/bitcoin"
import { CheckCircleIcon, CircleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { PillButton } from "@ui/components/PillButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { getBtcUtxoKey } from "./useSendFundsTransactionBtc"

const formatBtc = (sats: bigint) => {
  const btc = Number(sats) / 1e8
  return `${btc.toLocaleString(undefined, { maximumFractionDigits: 8 })} BTC`
}

type BtcCoinControlProps = {
  utxos: BitcoinUtxo[]
  selectedUtxoKeys: string[] | null
  onChange: (keys: string[] | null) => void
  drawerContainerId?: string
  className?: string
}

const UtxoRow: FC<{
  utxo: BitcoinUtxo
  selected: boolean
  onToggle: () => void
}> = ({ utxo, selected, onToggle }) => {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center gap-6 rounded-sm border-none px-6 py-4 text-left outline-hidden hover:bg-grey-700",
        selected ? "bg-grey-750 text-body" : "bg-grey-800 text-body-secondary"
      )}
    >
      {selected ? (
        <CheckCircleIcon className="shrink-0 text-primary" />
      ) : (
        <CircleIcon className="shrink-0 text-body-disabled" />
      )}
      <div className="grow overflow-hidden">
        <div className="text-sm">{formatBtc(utxo.valueSats)}</div>
        <div className="truncate text-body-disabled text-xs">
          {shortenAddress(utxo.address, 8, 8)}
          {utxo.change === 1 ? ` · ${t("change")}` : ""}
          {utxo.tree === "ordinals" ? ` · ${t("ordinals")}` : ""}
        </div>
      </div>
      <div className="shrink-0 text-body-disabled text-xs">
        {utxo.confirmations > 0
          ? t("{{count}} conf", { count: utxo.confirmations })
          : t("unconfirmed")}
      </div>
    </button>
  )
}

/**
 * Manual utxo selection for a bitcoin transfer. Default is automatic selection;
 * a manual pick restricts coin selection to exactly the chosen utxos.
 */
export const BtcCoinControl: FC<BtcCoinControlProps> = ({
  utxos,
  selectedUtxoKeys,
  onChange,
  drawerContainerId,
  className,
}) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  // ordinals-tree utxos are excluded: send never spends them without the dedicated opt-in
  const paymentUtxos = utxos.filter((u) => u.tree !== "ordinals")

  const [draft, setDraft] = useState<string[] | null>(selectedUtxoKeys)
  useEffect(() => {
    if (isOpen) setDraft(selectedUtxoKeys)
  }, [isOpen, selectedUtxoKeys])

  const toggle = useCallback(
    (key: string) => {
      setDraft((prev) => {
        // starting from automatic: first toggle selects just that utxo's complement set
        const current = prev ?? paymentUtxos.map(getBtcUtxoKey)
        return current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
      })
    },
    [paymentUtxos]
  )

  const handleApply = useCallback(() => {
    if (!draft) return
    // selecting everything = automatic
    onChange(draft.length === paymentUtxos.length ? null : draft)
    close()
  }, [draft, onChange, paymentUtxos.length, close])

  const handleAuto = useCallback(() => {
    onChange(null)
    close()
  }, [onChange, close])

  const draftKeys = draft ?? paymentUtxos.map(getBtcUtxoKey)
  const selectedCount = selectedUtxoKeys?.length

  return (
    <>
      <PillButton type="button" onClick={open} className={cn("h-12", className)}>
        {selectedCount !== undefined
          ? t("{{count}} of {{total}} coins", { count: selectedCount, total: paymentUtxos.length })
          : t("Auto")}
      </PillButton>
      <Drawer containerId={drawerContainerId} isOpen={isOpen} anchor="bottom" onDismiss={close}>
        <div className="flex max-h-[60rem] flex-col gap-8 rounded-t-xl bg-black-tertiary p-12 text-body-secondary text-sm">
          <h3 className="mb-0 text-center font-bold text-base text-body">{t("Coin Control")}</h3>
          <div>
            {t(
              "Choose which coins (UTXOs) fund this transaction. Fewer, larger coins cost less in fees; spending coins together links their history on-chain."
            )}
          </div>
          <div className="scrollable flex grow flex-col gap-4 overflow-y-auto">
            {paymentUtxos.map((utxo) => {
              const key = getBtcUtxoKey(utxo)
              return (
                <UtxoRow
                  key={key}
                  utxo={utxo}
                  selected={draftKeys.includes(key)}
                  onToggle={() => toggle(key)}
                />
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Button type="button" onClick={handleAuto}>
              {t("Automatic")}
            </Button>
            <Button type="button" primary disabled={!draftKeys.length} onClick={handleApply}>
              {t("Apply")}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
