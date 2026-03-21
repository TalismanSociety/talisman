import { ArrowRightIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { notify, notifyUpdate } from "@ui/components/Notifications"
import { Spacer } from "@ui/components/Spacer"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { AccountIcon } from "../../AccountIcon"
import { Address } from "../../Address"
import { useSignetConnect } from "./context"

export const ConnectSignetSelectAccounts = () => {
  const { onSuccess, signetUrlOrigin, vaults } = useSignetConnect()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState(
    vaults.reduce(
      (acc, vault) => {
        acc[vault.address] = true
        return acc
      },
      {} as Record<string, boolean>
    )
  )

  const handleToggle = useCallback((address: string) => {
    setSelectedAccounts((prev) => ({
      ...prev,
      [address]: !prev?.[address],
    }))
  }, [])

  useEffect(() => {
    if (vaults.length === 0) navigate("/accounts/add/signet")
  }, [navigate, vaults])

  const selectedAccountsList = Object.entries(selectedAccounts ?? {})
    .filter(([, selected]) => selected)
    .map(([address]) => address)

  const handleImport = useCallback(async () => {
    setImporting(true)
    const selectedVaults = vaults.filter(({ address }) => selectedAccounts[address])
    const notificationId = notify(
      {
        type: "processing",
        title: t("Importing account"),
        subtitle: t("Please wait"),
      },
      { autoClose: false }
    )
    try {
      const [address] = await api.accountAddExternal(
        selectedVaults.map((vault) => ({
          type: "signet",
          name: vault.name,
          address: vault.address,
          genesisHash: vault.chain.genesisHash,
          url: signetUrlOrigin,
        }))
      )

      notifyUpdate(notificationId, {
        type: "success",
        title: t("Account imported"),
        subtitle: null,
      })

      onSuccess(address)
    } catch (e) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(e)
      notifyUpdate(notificationId, {
        type: "error",
        title: "Failed to import accounts",
        subtitle: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setImporting(false)
    }
  }, [onSuccess, selectedAccounts, signetUrlOrigin, t, vaults])

  return (
    <>
      <HeaderBlock title="Confirm Import?" />
      <Spacer large />

      <div className="grid w-full max-w-xl gap-5">
        {vaults.map((vault) => (
          <button
            type="button"
            key={vault.address}
            className="flex h-32 w-full items-center gap-8 rounded-sm bg-grey-850 px-8 text-left text-grey-200 enabled:hover:bg-grey-800 disabled:opacity-50"
            onClick={() => handleToggle(vault.address)}
          >
            <AccountIcon
              address={vault.address}
              genesisHash={vault.chain.genesisHash}
              className="text-xl"
            />
            <div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">{vault.name}</div>
              <div className="text-body-secondary text-sm">
                <Address address={vault.address} startCharCount={6} endCharCount={6} />
              </div>
            </div>
            <Checkbox
              checked={selectedAccounts?.[vault.address] ?? false}
              readOnly
              className="ml-auto [&>input]:border-body-disabled!"
            />
          </button>
        ))}
      </div>
      <Spacer large />
      <Button
        className="mt-8"
        primary
        icon={ArrowRightIcon}
        processing={importing}
        disabled={selectedAccountsList.length === 0}
        onClick={handleImport}
      >
        {t("Confirm")}
      </Button>
    </>
  )
}
