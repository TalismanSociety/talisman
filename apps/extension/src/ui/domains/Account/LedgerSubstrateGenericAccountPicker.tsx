import { InfoIcon } from "@talismn/icons"
import { classNames, encodeAnyAddress, isNotNil } from "@talismn/util"
import { GenericeResponseAddress, SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { Account, ChainId, isAccountLedgerPolkadotGeneric } from "extension-core"
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
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { getTalismanLedgerError, TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useChain, useChains } from "@ui/state"

import { Fiat } from "../Asset/Fiat"
import { LedgerAccountDefSubstrate } from "./AccountAdd/AccountAddLedger/context"
import { AccountIcon } from "./AccountIcon"
import { Address } from "./Address"
import { BalancesSummaryTooltipContent } from "./BalancesSummaryTooltipContent"
import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"
import { LedgerConnectionStatus, LedgerConnectionStatusProps } from "./LedgerConnectionStatus"

const useLedgerSubstrateGenericAccounts = (
  selectedAccounts: LedgerAccountDefSubstrate[],
  pageIndex: number,
  itemsPerPage: number,
  legacyApp?: SubstrateAppParams | null,
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()

  const [ledgerAccounts, setLedgerAccounts] = useState<
    (LedgerSubstrateGenericAccount | undefined)[]
  >([...Array(itemsPerPage)])
  const refIsBusy = useRef(false)

  // derivation path => address cache, used when going back to previous page
  const refAddressCache = useRef<Record<string, GenericeResponseAddress>>({})
  useEffect(() => {
    refAddressCache.current = {} // reset if app changes
  }, [legacyApp])

  const chains = useChains({ activeOnly: true, includeTestnets: false })
  const withBalances = useMemo(() => chains.some((chain) => chain.hasCheckMetadataHash), [chains])

  const { getAddress } = useLedgerSubstrateGeneric({ legacyApp })

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account addresses..."),
  })

  // keep page index as ref to allow for cancelling current page load when changing page
  const refPageIndex = useRef(pageIndex)
  useEffect(() => {
    refPageIndex.current = pageIndex
  }, [pageIndex])

  const loadPage = useCallback(
    async (pageIndex: number, force = false) => {
      if (!force && refIsBusy.current) return
      refIsBusy.current = true

      //  setError(undefined)
      setConnectionStatus({
        status: "connecting",
        message: t("Fetching account addresses..."),
      })

      const skip = pageIndex * itemsPerPage

      try {
        const newAccounts: (LedgerSubstrateGenericAccount | undefined)[] = [...Array(itemsPerPage)]
        setLedgerAccounts([...newAccounts])

        for (let i = 0; i < itemsPerPage; i++) {
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)

          const accountIndex = skip + i
          const addressOffset = 0

          const path = getPolkadotLedgerDerivationPath({
            accountIndex,
            addressOffset,
            legacyApp: legacyApp,
          })

          const genericAddress =
            refAddressCache.current[path] ??
            (await getAddress(path, legacyApp?.ss58_addr_type ?? 42))
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          if (!genericAddress) throw new Error("Unable to get address")
          refAddressCache.current[path] = genericAddress

          newAccounts[i] = {
            app: legacyApp?.name,
            accountIndex,
            addressOffset,
            address: genericAddress.address,
            name: t("Ledger {{appName}} {{accountIndex}}", {
              appName: legacyApp?.name ?? "Polkadot",
              accountIndex: accountIndex + 1,
            }),
          } as LedgerSubstrateGenericAccount

          setLedgerAccounts([...newAccounts])
        }

        setConnectionStatus({
          status: "ready",
          message: t("Ledger is ready."),
        })
      } catch (err) {
        const error = getTalismanLedgerError(err)
        log.error("Failed to load page", { err })
        setConnectionStatus({
          status: "error",
          message: error.message,
          onRetryClick: () => loadPage(pageIndex),
        })
      } finally {
        refIsBusy.current = false
      }
    },
    [t, itemsPerPage, legacyApp, getAddress],
  )

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const balanceDefs = useMemo<AccountImportDef[]>(
    () =>
      withBalances && ledgerAccounts.filter(isNotNil).length === itemsPerPage
        ? ledgerAccounts.filter(isNotNil).map((acc) => ({ address: acc.address, curve: "ed25519" }))
        : [],
    [itemsPerPage, ledgerAccounts, withBalances],
  )
  const balances = useAccountImportBalances(balanceDefs)

  const accounts: (LedgerSubstrateGenericAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const address = convertAddress(acc.address, null)
        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === address,
        )

        const accountBalances = balances.balances.find(
          (b) => convertAddress(b.address, null) === address,
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
          isBalanceLoading:
            withBalances && (balances.status === "initialising" || balances.status === "cached"),
        }
      }),
    [ledgerAccounts, walletAccounts, balances, selectedAccounts, withBalances],
  )

  useEffect(() => {
    // refresh on every page change
    loadPage(pageIndex)
  }, [loadPage, pageIndex])

  return {
    accounts,
    connectionStatus,
    withBalances,
  }
}

type LedgerSubstrateGenericAccountPickerProps = {
  onChange?: (accounts: LedgerAccountDefSubstrate[]) => void
  app?: SubstrateAppParams | null
  chainId?: ChainId
}

type LedgerSubstrateGenericAccount = DerivedAccountBase & LedgerAccountDefSubstrate

const LedgerSubstrateGenericAccountPickerDefault: FC<LedgerSubstrateGenericAccountPickerProps> = ({
  onChange,
  app,
  chainId,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrate[]>([])
  const { accounts, connectionStatus, withBalances } = useLedgerSubstrateGenericAccounts(
    selectedAccounts,
    pageIndex,
    itemsPerPage,
    app,
  )
  const chain = useChain(chainId)

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { address, name, accountIndex, addressOffset, app } = acc as LedgerSubstrateGenericAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.address === address)
        ? prev.filter((pa) => pa.address !== address)
        : prev.concat({
            type: "ledger-polkadot",
            address,
            name,
            app,
            accountIndex,
            addressOffset,
          }),
    )
  }, [])

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
        withBalances={withBalances}
        addressPrefix={chain?.prefix}
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
    </>
  )
}

type CustomAccountDetails = { accountIndex: number; addressOffset: number; name: string }

const getNextAccountDetails = (
  accounts: Account[],
  app: SubstrateAppParams | null | undefined,
): CustomAccountDetails => {
  let nextAccountIndex = 0
  const existingAccountIndexes = accounts
    .filter(isAccountLedgerPolkadotGeneric)
    .filter(
      (a) => a.app === app?.name && a.addressOffset === 0 && typeof a.accountIndex === "number",
    )
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
  legacyApp: SubstrateAppParams | null | undefined,
) => {
  const { t } = useTranslation()
  const { getAddress } = useLedgerSubstrateGeneric({ legacyApp })

  const refIsBusy = useRef(false)

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account address..."),
  })

  const [state, setState] = useState<{
    account: CustomAccountDetails | undefined
    address: string | undefined
  }>({
    account: account,
    address: undefined,
  })

  // this system makes sure that if input changes, we don't fetch the address until ledger has returned previous result
  const loadAccountInfo = useCallback(async () => {
    if (!account) return
    if (state.account === account && state.address) return // result is up to date
    if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))
    refIsBusy.current = true

    setState({ account, address: undefined })
    setConnectionStatus({
      status: "connecting",
      message: t("Fetching account address..."),
    })

    try {
      const { accountIndex, addressOffset } = account
      const path = getPolkadotLedgerDerivationPath({
        accountIndex,
        addressOffset,
        legacyApp: legacyApp,
      })

      const res = await getAddress(path, legacyApp?.ss58_addr_type ?? 42)

      setState((prev) => ({ ...prev, address: res.address }))
      setConnectionStatus({
        status: "ready",
        message: t("Ledger is ready."),
      })
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("Failed to load page", { err })
      setConnectionStatus({
        status: "error",
        message: error.message,
        onRetryClick: loadAccountInfo,
      })
      log.error("Failed to load account info", { err })
      setState((prev) => ({ ...prev, error: error.message }))
    } finally {
      refIsBusy.current = false
    }
  }, [account, state.account, state.address, t, legacyApp, getAddress])

  useEffect(() => {
    loadAccountInfo()
  }, [loadAccountInfo])

  return useMemo(() => {
    return {
      address: state.account === account ? state.address : undefined,
      connectionStatus,
    }
  }, [state, account, connectionStatus])
}

const LedgerSubstrateGenericAccountPickerCustom: FC<LedgerSubstrateGenericAccountPickerProps> = ({
  onChange,
  app,
  chainId,
}) => {
  const { t } = useTranslation()
  const chain = useChain(chainId)
  const walletAccounts = useAccounts()
  const [accountDetails, setAccountDetails] = useState<CustomAccountDetails>(() =>
    getNextAccountDetails(walletAccounts, app),
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

  const { address, connectionStatus } = useLedgerAccountAddress(accountDetails, app)

  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      address
        ? [
            {
              address,
              curve: "ed25519",
              genesisHash: null,
            },
          ]
        : [],
    [address],
  )

  const balances = useAccountImportBalances(accountImportDefs)

  const accountDef = useMemo<LedgerSubstrateGenericAccount | null>(() => {
    if (!address) return null

    return {
      type: "ledger-polkadot",
      app: app?.name ?? "Polkadot",
      ...accountDetails,
      address,
      balances: balances.balances.find((b) => convertAddress(b.address, null) === address),
      isBalanceLoading: balances.status === "initialising" || balances.status === "cached",
      connected: !!walletAccounts.find((wa) => convertAddress(wa.address, null) === address),
    }
  }, [accountDetails, address, app?.name, balances.balances, balances.status, walletAccounts])

  useEffect(() => {
    if (onChange) onChange(accountDef ? [accountDef] : [])
  }, [accountDef, onChange])

  return (
    <div className="mt-8">
      <div className="mb-8 flex flex-col gap-4">
        <div className="text-alert-warn bg-alert-warn/5 flex items-center gap-6 rounded-sm p-8 text-sm">
          <div className="bg-alert-warn/10 rounded-full p-4">
            <InfoIcon className="shrink-0 text-lg" />
          </div>
          <div className="leading-paragraph">
            {t(
              "Custom mode is for advanced users only: it provides access to accounts that may not be available on other interfaces such as Ledger Live.",
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
            <div className="bg-black-tertiary flex h-32 w-full items-center gap-8 rounded-sm px-8 py-4">
              {accountDef ? (
                <>
                  <AccountIcon address={accountDef.address} className="text-xl" />
                  <div className="flex flex-grow flex-col gap-2 overflow-hidden">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {accountDef.name}
                    </div>
                    <div className="text-body-secondary text-sm">
                      <Address
                        address={encodeAnyAddress(accountDef.address, chain?.prefix ?? undefined)}
                        startCharCount={6}
                        endCharCount={6}
                      />
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
              ) : connectionStatus.status === "connecting" ? (
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
              ) : null}
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
  chainId,
}) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<DerivationMode>("default")

  const handleModeClick = useCallback(
    (newMode: DerivationMode) => () => {
      if (mode === newMode) return
      onChange?.([])
      setMode(newMode)
    },
    [mode, onChange],
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
        <LedgerSubstrateGenericAccountPickerDefault
          onChange={onChange}
          app={app}
          chainId={chainId}
        />
      ) : (
        <LedgerSubstrateGenericAccountPickerCustom
          onChange={onChange}
          app={app}
          chainId={chainId}
        />
      )}
    </div>
  )
}
