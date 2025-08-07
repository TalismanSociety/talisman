import Transport from "@ledgerhq/hw-transport"
import TransportWebHID from "@ledgerhq/hw-transport-webhid"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CoinsIcon,
  DollarSignIcon,
  EyeOffIcon,
  FlagIcon,
  RefreshCwIcon,
  ToolIcon,
  UsbIcon,
  UserIcon,
  XIcon,
} from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { LedgerTransportType } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, CtaButton, Dropdown, Modal, ModalDialog, Toggle } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useRuntimeReload } from "@ui/hooks/useRuntimeReload"
import { useSetting } from "@ui/state"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "General",
}

export const GeneralPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)

const Content = () => {
  const { t } = useTranslation()
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [hideDust, setHideDust] = useSetting("hideDust")
  const [identiconType, setIdenticonType] = useSetting("identiconType")
  const [allowNotifications, setAllowNotifications] = useSetting("allowNotifications")
  const [hasRuntimeReloadFn, runtimeReload] = useRuntimeReload(ANALYTICS_PAGE)
  const [developerMode, setDeveloperMode] = useSetting("developerMode")

  return (
    <>
      <HeaderBlock title={t("General")} text={t("General settings")} />
      <div className="mt-16 flex flex-col gap-4">
        {hasRuntimeReloadFn ? (
          <Setting
            iconLeft={RefreshCwIcon}
            title={t("Reload Talisman")}
            subtitle={t("Close and restart Talisman, this can help to resolve error states")}
          >
            <Button primary small onClick={runtimeReload}>
              {t("Reload")}
            </Button>
          </Setting>
        ) : null}
        <Setting
          iconLeft={BellIcon}
          title={t("Allow notifications")}
          subtitle={t("Allow Talisman to send you notifications about transactions in progress")}
        >
          <Toggle
            checked={allowNotifications}
            onChange={(e) => setAllowNotifications(e.target.checked)}
          />
        </Setting>
        <Setting
          iconLeft={EyeOffIcon}
          title={t("Blur balances")}
          subtitle={t("Conceal your portfolio and account balances")}
        >
          <Toggle checked={hideBalances} onChange={(e) => setHideBalances(e.target.checked)} />
        </Setting>
        <Setting
          iconLeft={CoinsIcon}
          title={t("Hide small balances")}
          subtitle={t("Hide tokens with a balance below US$1")}
        >
          <Toggle checked={hideDust} onChange={(e) => setHideDust(e.target.checked)} />
        </Setting>
        <CtaButton
          iconLeft={FlagIcon}
          iconRight={ChevronRightIcon}
          title={t("Language")}
          subtitle={t("Change the wallet display language")}
          to={`/settings/general/language`}
        />
        <CtaButton
          iconLeft={DollarSignIcon}
          iconRight={ChevronRightIcon}
          title={t("Currency")}
          subtitle={t("Set currencies for viewing your portolio value")}
          to={`/settings/general/currency`}
        />
        <Setting
          iconLeft={UserIcon}
          title={t("Account avatars")}
          subtitle={t("Choose between the Talisman orbs or Polkadot.js identicons")}
        >
          <AvatarTypeSelect selectedType={identiconType} onChange={setIdenticonType} />
        </Setting>
        <Setting
          iconLeft={UsbIcon}
          title={t("Ledger interface")}
          subtitle={t("Select which connection type to use with Ledger hardware wallets")}
        >
          <LedgerTransportTypeSelect />
        </Setting>
        <Setting
          iconLeft={ToolIcon}
          title={t("Developer mode")}
          subtitle={t("Allow connecting to dapps with watch-only accounts")}
        >
          <Toggle checked={developerMode} onChange={(e) => setDeveloperMode(e.target.checked)} />
        </Setting>
      </div>
    </>
  )
}

type LedgerTransportStatusCheck = { ok: true } | { ok: false; error: string }

export const LedgerTransportTypeSelect = () => {
  const { t } = useTranslation()
  const [ledgerTransportType, setLedgerTransportType] = useSetting("ledgerTransportType")
  const refTransport = useRef<Transport | null>(null)
  const [checkStatus, setCheckStatus] = useState<LedgerTransportStatusCheck>()

  const ledgerTransportTypeItems = useMemo(
    () =>
      [
        getIsLedgerCapable("hid") ? { value: "hid", label: t("HID") } : null,
        getIsLedgerCapable("usb") ? { value: "usb", label: t("USB") } : null,
      ].filter(isNotNil) as { value: LedgerTransportType; label: string }[],
    [t],
  )

  const ledgerTransportTypeValue = useMemo(() => {
    return (
      ledgerTransportTypeItems.find((item) => item.value === ledgerTransportType) ||
      ledgerTransportTypeItems[0]
    )
  }, [ledgerTransportType, ledgerTransportTypeItems])

  const checkConnectivity = useCallback(async () => {
    try {
      await refTransport.current?.close()

      switch (ledgerTransportType) {
        case "hid":
          refTransport.current = await TransportWebHID.create()
          setCheckStatus({ ok: true })
          break
        case "usb":
          refTransport.current = await TransportWebUSB.create()
          setCheckStatus({ ok: true })
          break
      }
    } catch (err) {
      setCheckStatus({ ok: false, error: (err as Error).message })
    }
  }, [ledgerTransportType])

  useEffect(() => {
    return () => {
      refTransport.current?.close().catch((err) => {
        log.error("Failed to close transport on unmount", { err })
      })
    }
  }, [])

  if (ledgerTransportTypeItems.length === 0)
    return <div className="text-body-disabled text-right">{t("Unavailable")}</div>

  return (
    <div className="flex items-center gap-4">
      <Dropdown
        items={ledgerTransportTypeItems}
        propertyKey="value"
        className="h-20 py-0"
        buttonClassName="h-20 py-0"
        optionClassName="h-20 py-0 flex"
        value={ledgerTransportTypeValue}
        onChange={(v) => setLedgerTransportType(v!.value)}
        renderItem={(item) => item.label}
      />
      <Button primary small onClick={checkConnectivity}>
        {t("Check")}
      </Button>
      <Modal isOpen={!!checkStatus} onDismiss={() => setCheckStatus(undefined)}>
        <LedgerTransportCheckModalDialog
          status={checkStatus}
          transport={ledgerTransportType}
          onClose={() => setCheckStatus(undefined)}
        />
      </Modal>
    </div>
  )
}

const LedgerTransportCheckModalDialog: FC<{
  status?: LedgerTransportStatusCheck
  transport: LedgerTransportType
  onClose: () => void
}> = ({ status, transport, onClose }) => {
  const { t } = useTranslation()
  const [prevStatus, setPrevStatus] = useState<LedgerTransportStatusCheck>()

  useEffect(() => {
    // keep in state to avoid flickering while closing the modal
    if (status) setPrevStatus(status)
  }, [status])

  const s = status ?? prevStatus

  if (!s) return null

  return (
    <ModalDialog title={t("Ledger connectivity check")} onClose={onClose}>
      <div className="flex w-full items-center gap-6">
        <div
          className={classNames(
            "flex size-24 shrink-0 items-center justify-center rounded-full",
            s.ok ? "text-alert-success bg-alert-success/10" : "text-alert-warn bg-alert-warn/10",
          )}
        >
          {s.ok ? <CheckIcon className="size-12" /> : <XIcon className="size-12" />}
        </div>
        <div className="grow">
          <p className="text-body">
            {s.ok
              ? t("{{transport}} connection successful", {
                  transport: transport.toUpperCase(),
                })
              : t("{{transport}} connection failed: {{error}}", {
                  error: s.error,
                  transport: transport.toUpperCase(),
                })}
          </p>
        </div>
      </div>
      {!s.ok && (
        <p className="text-body-secondary mt-8">
          {t(
            "You may need to reload this page before being able to try again, some browsers prevent multiple {{transport}} connection attempts.",
            { transport: transport.toUpperCase() },
          )}
        </p>
      )}

      <div className="mt-12 flex w-full justify-end gap-8">
        {!s.ok && (
          <Button
            onClick={() => {
              window.location.href = window.location.href.toString()
            }}
          >
            {t("Reload")}
          </Button>
        )}
        <Button primary onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </ModalDialog>
  )
}
