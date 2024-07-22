import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountJsonAny, SubstrateLedgerAppType } from "extension-core"
import { log } from "extension-shared"
import {
  ChangeEventHandler,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, FormFieldInputText, Tooltip, TooltipTrigger } from "talisman-ui"

import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefSubstrateGeneric } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { SubstrateMigrationApp } from "@ui/hooks/ledger/useLedgerSubstrateMigrationApps"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import useAccounts from "@ui/hooks/useAccounts"

import { Fiat } from "../Asset/Fiat"
import { AccountIcon } from "./AccountIcon"
import { Address } from "./Address"
import { BalancesSummaryTooltipContent } from "./BalancesSummaryTooltipContent"
import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"
import { LedgerConnectionStatus } from "./LedgerConnectionStatus"

const useLedgerSubstrateGenericAccounts = (
  selectedAccounts: LedgerAccountDefSubstrateGeneric[],
  pageIndex: number,
  itemsPerPage: number,
  app?: SubstrateMigrationApp | null
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()

  const [ledgerAccounts, setLedgerAccounts] = useState<
    (LedgerSubstrateGenericAccount | undefined)[]
  >([...Array(itemsPerPage)])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string>()

  const { isReady, ledger, getAddress, ...connectionStatus } = useLedgerSubstrateGeneric({ app })

  const loadPage = useCallback(async () => {
    if (!ledger || !isReady) return

    setIsBusy(true)
    setError(undefined)

    const skip = pageIndex * itemsPerPage

    try {
      const newAccounts: (LedgerSubstrateGenericAccount | undefined)[] = [...Array(itemsPerPage)]

      for (let i = 0; i < itemsPerPage; i++) {
        const accountIndex = skip + i
        const addressOffset = 0

        const path = getPolkadotLedgerDerivationPath({ accountIndex, addressOffset, app })

        const genericAddress = await getAddress(path, app?.ss58_addr_type ?? 42)
        if (!genericAddress) throw new Error("Unable to get address")

        newAccounts[i] = {
          accountIndex,
          addressOffset,
          address: genericAddress.address,
          name: t("Ledger {{appName}} {{accountIndex}}", {
            appName: app?.chain?.name ?? "Polkadot",
            accountIndex: accountIndex + 1,
          }),
          migrationAppName: app?.name,
        } as LedgerSubstrateGenericAccount

        setLedgerAccounts([...newAccounts])
      }
    } catch (err) {
      log.error("Failed to load page", { err })
      setError((err as Error).message)
    }

    setIsBusy(false)
  }, [app, isReady, itemsPerPage, ledger, getAddress, pageIndex, t])

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      ledgerAccounts.filter(Boolean).length === itemsPerPage
        ? ledgerAccounts
            .filter((acc): acc is LedgerSubstrateGenericAccount => !!acc)
            .map((acc) => ({ address: acc.address, type: "ed25519" }))
        : [],
    [itemsPerPage, ledgerAccounts]
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts: (LedgerSubstrateGenericAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const address = convertAddress(acc.address, null)
        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === address
        )

        const accountBalances = balances.balances.find(
          (b) => convertAddress(b.address, null) === address
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
          isBalanceLoading: balances.status === "initialising" || balances.status === "cached",
        }
      }),
    [ledgerAccounts, walletAccounts, balances, selectedAccounts]
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    ledger,
    accounts,
    isBusy,
    error,
    connectionStatus,
  }
}

type LedgerSubstrateGenericAccountPickerProps = {
  onChange?: (accounts: LedgerAccountDefSubstrateGeneric[]) => void
  app?: SubstrateMigrationApp | null
}

type LedgerSubstrateGenericAccount = DerivedAccountBase & LedgerAccountDefSubstrateGeneric

const LedgerSubstrateGenericAccountPickerDefault: FC<LedgerSubstrateGenericAccountPickerProps> = ({
  onChange,
  app,
}) => {
  const { t } = useTranslation()
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrateGeneric[]>([])
  const { accounts, error, isBusy, connectionStatus } = useLedgerSubstrateGenericAccounts(
    selectedAccounts,
    pageIndex,
    itemsPerPage,
    app
  )

  // if ledger was busy when changing tabs, connection needs to be refreshed once on mount
  const refInitialized = useRef(false)
  useEffect(() => {
    if (!refInitialized.current && connectionStatus.status === "error") {
      refInitialized.current = true
      connectionStatus.refresh()
      return
    }
  }, [connectionStatus])

  const handleToggleAccount = useCallback(
    (acc: DerivedAccountBase) => {
      const { address, name, accountIndex, addressOffset } = acc as LedgerSubstrateGenericAccount
      setSelectedAccounts((prev) =>
        prev.some((pa) => pa.address === address)
          ? prev.filter((pa) => pa.address !== address)
          : prev.concat({
              ledgerApp: SubstrateLedgerAppType.Generic,
              address,
              name,
              accountIndex,
              addressOffset,
              migrationAppName: app?.name,
            })
      )
    },
    [app?.name]
  )

  useEffect(() => {
    if (onChange) onChange(selectedAccounts)
  }, [onChange, selectedAccounts])

  const handlePageFirst = useCallback(() => setPageIndex(0), [])
  const handlePagePrev = useCallback(() => setPageIndex((prev) => prev - 1), [])
  const handlePageNext = useCallback(() => setPageIndex((prev) => prev + 1), [])

  return (
    <>
      <div className="mb-8">
        <LedgerConnectionStatus {...connectionStatus} />
      </div>
      <DerivedAccountPickerBase
        accounts={accounts}
        withBalances
        disablePaging={isBusy}
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
      <p className="text-alert-error">
        {error ? t("An error occured, Ledger might be locked.") : null}
      </p>
    </>
  )
}

type CustomAccountDetails = { accountIndex: number; addressOffset: number; name: string }

const getNextAccountDetails = (
  accounts: AccountJsonAny[],
  app: SubstrateMigrationApp | null | undefined
): CustomAccountDetails => {
  let nextAccountIndex = 0
  const existingAccountIndexes = accounts
    .filter(
      (a) =>
        a.ledgerApp === SubstrateLedgerAppType.Generic &&
        a.migrationAppName === app?.name &&
        a.addressOffset === 0
    )
    .filter((a) => typeof a.accountIndex === "number")
    .map((a) => a.accountIndex as number)
  for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++)
    if (!existingAccountIndexes.includes(i)) {
      nextAccountIndex = i
      break
    }

  return {
    accountIndex: nextAccountIndex,
    addressOffset: 0,
    name: `Custom Ledger ${app?.name ? `Migration ${app.name}` : "Polkadot"} ${
      nextAccountIndex + 1
    }`,
  }
}

const useLedgerAccountAddress = (
  account: CustomAccountDetails | undefined,
  app: SubstrateMigrationApp | null | undefined
) => {
  const { isReady, ledger, ...connectionStatus } = useLedgerSubstrateGeneric({ app })

  // if ledger was busy when changing tabs, connection needs to be refreshed once on mount
  const refInitialized = useRef(false)
  useEffect(() => {
    if (!refInitialized.current && connectionStatus.status === "error") {
      refInitialized.current = true
      connectionStatus.refresh()
      return
    }
  }, [connectionStatus])

  const [state, setState] = useState<{
    isBusy: boolean
    error: string | undefined
    account: CustomAccountDetails | undefined
    address: string | undefined
  }>({
    isBusy: false,
    error: undefined,
    account: account,
    address: undefined,
  })

  // this system makes sure that if input changes, we don't fetch the address until ledger has returned previous result
  const loadAccountInfo = useCallback(async () => {
    if (!ledger || !isReady || !account || state.isBusy) return
    if (state.account === account && state.address) return // result is up to date

    setState({ account, isBusy: true, error: undefined, address: undefined })

    try {
      const { accountIndex, addressOffset } = account
      const path = getPolkadotLedgerDerivationPath({ accountIndex, addressOffset, app })

      const res = await ledger.getAddress(path, app?.ss58_addr_type ?? 42, false)

      setState((prev) => ({ ...prev, address: res.address, isBusy: false }))
    } catch (err) {
      log.error("Failed to load account info", { err })
      setState((prev) => ({ ...prev, error: (err as Error).message, isBusy: false }))
    }
  }, [ledger, isReady, account, state.isBusy, state.account, state.address, app])

  useEffect(() => {
    loadAccountInfo()
  }, [loadAccountInfo])

  return useMemo(() => {
    return {
      isBusy: state.isBusy,
      address: state.account === account ? state.address : undefined,
      error: state.account === account ? state.error : undefined,
      connectionStatus,
    }
  }, [state, account, connectionStatus])
}

const LedgerSubstrateGenericAccountPickerCustom: FC<LedgerSubstrateGenericAccountPickerProps> = ({
  onChange,
  app,
}) => {
  const { t } = useTranslation()

  const walletAccounts = useAccounts()
  const [accountDetails, setAccountDetails] = useState<CustomAccountDetails>(() =>
    getNextAccountDetails(walletAccounts, app)
  )

  const handleAccountIndexChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAccountDetails((prev) => ({ ...prev, accountIndex: Number(e.target.value) }))
  }, [])

  const handleAddressOffsetChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAccountDetails((prev) => ({ ...prev, addressOffset: Number(e.target.value) }))
  }, [])

  const handleNameChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAccountDetails((prev) => ({ ...prev, name: e.target.value }))
  }, [])

  const { address, error, connectionStatus } = useLedgerAccountAddress(accountDetails, app)

  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      address
        ? [
            {
              address,
              type: "ed25519",
              genesisHash: null,
            },
          ]
        : [],
    [address]
  )

  const balances = useAccountImportBalances(accountImportDefs)

  const accountDef = useMemo<LedgerSubstrateGenericAccount | null>(() => {
    if (!address) return null

    return {
      ledgerApp: SubstrateLedgerAppType.Generic,
      ...accountDetails,
      address,
      balances: balances.balances.find((b) => convertAddress(b.address, null) === address),
      isBalanceLoading: balances.status === "initialising" || balances.status === "cached",
      connected: !!walletAccounts.find((wa) => convertAddress(wa.address, null) === address),
      migrationAppName: app?.name,
    }
  }, [accountDetails, address, app?.name, balances.balances, balances.status, walletAccounts])

  useEffect(() => {
    if (onChange) onChange(accountDef ? [accountDef] : [])
  }, [accountDef, onChange])

  return (
    <div className="mt-8">
      <div className="mb-8 flex flex-col gap-4">
        <div className="text-alert-warn bg-alert-warn/5  flex items-center gap-6 rounded-sm p-8 text-sm">
          <div className="bg-alert-warn/10 rounded-full p-4">
            <InfoIcon className="shrink-0 text-lg" />
          </div>
          <div className="leading-paragraph">
            {t(
              "Custom mode is for advanced users only: it provides access to accounts that may not be available on other interfaces such as Ledger Live."
            )}
          </div>
        </div>
        <div>
          <LedgerConnectionStatus {...connectionStatus} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <FormFieldContainer label={t("Account index")}>
          <FormFieldInputText
            type="number"
            step={0}
            min={0}
            placeholder={accountDetails.accountIndex.toString()}
            defaultValue={accountDetails.accountIndex}
            onChange={handleAccountIndexChange}
          />
        </FormFieldContainer>
        <FormFieldContainer label={t("Address index")}>
          <FormFieldInputText
            type="number"
            step={0}
            min={0}
            placeholder={accountDetails.addressOffset.toString()}
            defaultValue={accountDetails.addressOffset}
            onChange={handleAddressOffsetChange}
          />
        </FormFieldContainer>
        <FormFieldContainer label={t("Account name")}>
          <FormFieldInputText
            placeholder={t("Account name")}
            defaultValue={accountDetails.name}
            onChange={handleNameChange}
          />
        </FormFieldContainer>

        <div className="col-span-2">
          <FormFieldContainer label={t("Preview")}>
            <div className="bg-black-tertiary flex h-32 w-full items-center gap-8 rounded-sm px-8  py-4">
              {accountDef ? (
                <>
                  <AccountIcon address={accountDef.address} className="text-xl" />
                  <div className="flex flex-grow flex-col gap-2 overflow-hidden">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {accountDef.name}
                    </div>
                    <div className="text-body-secondary text-sm">
                      <Address address={accountDef.address} startCharCount={6} endCharCount={6} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {balances.status === "initialising" ? (
                      <div className="rounded-xs bg-grey-750 h-[1.8rem] w-[6.8rem] animate-pulse"></div>
                    ) : (
                      <Tooltip placement="bottom-end">
                        <TooltipTrigger asChild>
                          <span
                            className={classNames(balances.status !== "live" && "animate-pulse")}
                          >
                            <Fiat
                              className="leading-none"
                              amount={balances.balances.sum.fiat("usd").total}
                              isBalance
                            />
                          </span>
                        </TooltipTrigger>
                        <BalancesSummaryTooltipContent balances={balances.balances} />
                      </Tooltip>
                    )}
                  </div>
                </>
              ) : !error ? (
                <>
                  <div className="bg-grey-750 size-[3.2rem] animate-pulse rounded-full" />
                  <div className="flex flex-grow flex-col gap-2 overflow-hidden">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="bg-grey-750 text-grey-750 rounded-xs animate-pulse select-none">
                        Account Name
                      </span>
                    </div>
                    <div className="text-body-secondary text-sm">
                      <span className="bg-grey-750 text-grey-750 rounded-xs animate-pulse select-none">
                        AAAAAA…AAAAAA
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <div className="bg-grey-750 text-grey-750 rounded-xs animate-pulse select-none">
                      00.00$
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-alert-warn">{error}</div>
              )}
            </div>
          </FormFieldContainer>
        </div>
      </div>
    </div>
  )
}

type DerivationMode = "default" | "custom"

const ModeButton: FC<{ selected: boolean; onClick: () => void; children: ReactNode }> = ({
  selected,
  onClick,
  children,
}) => (
  <button
    type="button"
    className={classNames(selected ? "text-body" : "hover:text-grey-300")}
    onClick={onClick}
  >
    {children}
  </button>
)

export const LedgerSubstrateGenericAccountPicker: FC<LedgerSubstrateGenericAccountPickerProps> = ({
  onChange,
  app,
}) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<DerivationMode>("default")

  const handleModeClick = useCallback(
    (newMode: DerivationMode) => () => {
      if (mode === newMode) return
      onChange?.([])
      setMode(newMode)
    },
    [mode, onChange]
  )

  return (
    <div>
      <div className="text-body-secondary mb-8 flex w-full items-center gap-2">
        <div className="grow">{t("Derivation mode:")}</div>
        <div>
          <ModeButton selected={mode === "default"} onClick={handleModeClick("default")}>
            {t("Recommended")}
          </ModeButton>
        </div>
        <div className="text-[0.8em]">|</div>
        <div>
          <ModeButton selected={mode === "custom"} onClick={handleModeClick("custom")}>
            {t("Custom")}
          </ModeButton>
        </div>
      </div>
      {mode === "default" ? (
        <LedgerSubstrateGenericAccountPickerDefault onChange={onChange} app={app} />
      ) : (
        <LedgerSubstrateGenericAccountPickerCustom onChange={onChange} app={app} />
      )}
    </div>
  )
}
