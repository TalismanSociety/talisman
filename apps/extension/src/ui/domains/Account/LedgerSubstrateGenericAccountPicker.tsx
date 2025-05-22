import { normalizeAddress } from "@talismn/crypto"
import { InfoIcon } from "@talismn/icons"
import { classNames, encodeAnyAddress, isNotNil } from "@talismn/util"
import { GenericeResponseAddress, SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import {
  Account,
  ChainId,
  isAccountLedgerPolkadotGeneric,
  LedgerPolkadotCurve,
} from "extension-core"
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
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useChain, useChains } from "@ui/state"

import { Fiat } from "../Asset/Fiat"
import { LedgerAccountDefSubstrate } from "./AccountAdd/AccountAddLedger/context"
import { AccountIcon } from "./AccountIcon"
import { Address } from "./Address"
import { BalancesSummaryTooltipContent } from "./BalancesSummaryTooltipContent"
import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"
import { LedgerConnectionStatus, LedgerConnectionStatusProps } from "./LedgerConnectionStatus"

const useGetLedgerAddress = (curve: LedgerPolkadotCurve, legacyApp?: SubstrateAppParams | null) => {
  const { getAddressEcdsa, getAddressEd25519 } = useLedgerSubstrateGeneric({ legacyApp })

  // derivation path => address cache, usefull when going back to previous page
  const refAddressCache = useRef<Record<string, GenericeResponseAddress>>({})

  const getAddress = useCallback(
    async (accountIndex: number, addressOffset: number) => {
      const derivationPath = getPolkadotLedgerDerivationPath({
        accountIndex,
        addressOffset,
        legacyApp,
      })
      const prefix = legacyApp?.ss58_addr_type ?? 42
      const cacheKey = `${curve}::${prefix}::${derivationPath}`

      if (!refAddressCache.current[cacheKey]) {
        switch (curve) {
          case "ethereum":
            refAddressCache.current[cacheKey] = await getAddressEcdsa(derivationPath)
            break
          case "ed25519":
            refAddressCache.current[cacheKey] = await getAddressEd25519(derivationPath, prefix)
            break
        }
      }

      const result = refAddressCache.current[cacheKey]

      switch (curve) {
        case "ethereum":
          return normalizeAddress(`0x${result.address}`)
        case "ed25519":
          return result.address
      }
    },
    [curve, getAddressEcdsa, getAddressEd25519, legacyApp],
  )

  return { getAddress }
}

const useLedgerSubstrateGenericAccounts = (
  selectedAccounts: LedgerAccountDefSubstrate[],
  pageIndex: number,
  itemsPerPage: number,
  curve: LedgerPolkadotCurve,
  networkName: string,
  legacyApp?: SubstrateAppParams | null,
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()

  const [ledgerAccounts, setLedgerAccounts] = useState<
    (LedgerSubstrateGenericAccount | undefined)[]
  >([...Array(itemsPerPage)])
  const refIsBusy = useRef(false)

  const { getAddress } = useGetLedgerAddress(curve, legacyApp)

  const chains = useChains({ activeOnly: true, includeTestnets: false })
  const withBalances = useMemo(() => chains.some((chain) => chain.hasCheckMetadataHash), [chains])

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

          const address = await getAddress(accountIndex, addressOffset)
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          if (!address) throw new Error("Unable to get address")

          newAccounts[i] = {
            type: "ledger-polkadot",
            address,
            curve,
            app: legacyApp?.name ?? "Polkadot",
            accountIndex,
            addressOffset,
            name: t("Ledger {{networkName}} {{accountIndex}}", {
              networkName,
              accountIndex: accountIndex + 1,
            }),
          }

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
    [t, itemsPerPage, legacyApp, curve, networkName, getAddress],
  )

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const balanceDefs = useMemo(
    () =>
      withBalances && ledgerAccounts.filter(isNotNil).length === itemsPerPage
        ? ledgerAccounts.filter(isNotNil).map((acc): Account => ({ ...acc, createdAt: Date.now() }))
        : [],
    [itemsPerPage, ledgerAccounts, withBalances],
  )
  const balances = useAccountImportBalances(balanceDefs)

  const accounts: (LedgerSubstrateGenericAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        // TODO normalize
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
  const chain = useChain(chainId)
  const curve: LedgerPolkadotCurve = useMemo(
    () => (chain?.account === "secp256k1" ? "ethereum" : "ed25519"),
    [chain],
  )

  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrate[]>([])
  const { accounts, connectionStatus, withBalances } = useLedgerSubstrateGenericAccounts(
    selectedAccounts,
    pageIndex,
    itemsPerPage,
    curve,
    chain?.name ?? "Polkadot",
    app,
  )

  const handleToggleAccount = useCallback(
    (acc: DerivedAccountBase) => {
      const { address, name, accountIndex, addressOffset, app } =
        acc as LedgerSubstrateGenericAccount
      setSelectedAccounts((prev) =>
        prev.some((pa) => pa.address === address)
          ? prev.filter((pa) => pa.address !== address)
          : prev.concat({
              type: "ledger-polkadot",
              address,
              curve,
              name,
              app,
              accountIndex,
              addressOffset,
            }),
      )
    },
    [curve],
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
  networkName: string,
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
    name: `Custom Ledger ${app?.name ? `Migration ${networkName}` : networkName} ${
      nextAccountIndex + 1
    }`,
  }
}

const useLedgerAccountAddress = (
  account: CustomAccountDetails | undefined,
  curve: LedgerPolkadotCurve,
  legacyApp: SubstrateAppParams | null | undefined,
) => {
  const { t } = useTranslation()
  const { getAddress } = useGetLedgerAddress(curve, legacyApp)

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
      const address = await getAddress(accountIndex, addressOffset)

      setState((prev) => ({ ...prev, address }))
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
  }, [account, state.account, state.address, t, getAddress])

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
  const curve: LedgerPolkadotCurve = useMemo(
    () => (chain?.account === "secp256k1" ? "ethereum" : "ed25519"),
    [chain],
  )

  const walletAccounts = useAccounts()
  const [accountDetails, setAccountDetails] = useState<CustomAccountDetails>(() =>
    getNextAccountDetails(walletAccounts, chain?.name ?? "Polkadot", app),
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

  const { address, connectionStatus } = useLedgerAccountAddress(accountDetails, curve, app)

  const accountImportDefs = useMemo<Account[]>(
    () =>
      address
        ? [
            {
              type: "ledger-polkadot",
              name: "",
              address,
              curve,
              accountIndex: accountDetails.accountIndex,
              addressOffset: accountDetails.addressOffset,
              app: app?.name ?? "Polkadot",
              createdAt: Date.now(),
            },
          ]
        : [],
    [accountDetails.accountIndex, accountDetails.addressOffset, address, app?.name, curve],
  )

  const balances = useAccountImportBalances(accountImportDefs)

  const accountDef = useMemo<LedgerSubstrateGenericAccount | null>(() => {
    if (!address) return null

    return {
      type: "ledger-polkadot",
      app: app?.name ?? "Polkadot",
      ...accountDetails,
      address,
      curve,
      balances: balances.balances.find((b) => convertAddress(b.address, null) === address),
      isBalanceLoading: balances.status === "initialising" || balances.status === "cached",
      connected: !!walletAccounts.find((wa) => convertAddress(wa.address, null) === address),
    }
  }, [
    accountDetails,
    address,
    app?.name,
    balances.balances,
    balances.status,
    curve,
    walletAccounts,
  ])

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
