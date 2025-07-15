import { DotNetwork } from "@talismn/chaindata-provider"
import { encodeAnyAddress, isAddressEqual } from "@talismn/crypto"
import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { Account, isAccountLedgerPolkadotLegacy, LedgerPolkadotCurve } from "extension-core"
import { log } from "extension-shared"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, FormFieldInputText, Tooltip, TooltipTrigger } from "talisman-ui"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { getTalismanLedgerError, TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateAppByChain } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useNetworkById } from "@ui/state"

import { AccountIcon } from "../AccountIcon"
import { Address } from "../Address"
import { BalancesSummaryTooltipContent } from "../BalancesSummaryTooltipContent"
import { LedgerConnectionStatus, LedgerConnectionStatusProps } from "../LedgerConnectionStatus"
import { LedgerPolkadotAccountPickerDef, LedgerPolkadotLegacyAccountPickerProps } from "./types"
import { useGetLedgerPolkadotLegacyAddress } from "./useGetLedgerPolkadotLegacyAddress"

export const LedgerPolkadotLegacyAccountPickerCustom: FC<
  LedgerPolkadotLegacyAccountPickerProps
> = ({ onChange, chainId }) => {
  const { t } = useTranslation()
  const chain = useNetworkById(chainId, "polkadot")
  if (!chain) throw new Error("Chain not found")

  const curve: LedgerPolkadotCurve = useMemo(
    () => (chain?.account === "secp256k1" ? "ethereum" : "ed25519"),
    [chain],
  )

  const app = useLedgerSubstrateAppByChain(chain)
  if (!app) throw new Error("Ledger app not found")

  const walletAccounts = useAccounts()
  const [accountDetails, setAccountDetails] = useState<CustomAccountDetails>(() =>
    getNextAccountDetails(walletAccounts, chain, app),
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

  const { address, connectionStatus } = useLedgerAccountAddress(accountDetails)

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

  const accountDef = useMemo<LedgerPolkadotAccountPickerDef | null>(() => {
    if (!address || !chain?.genesisHash) return null

    return {
      type: "ledger-polkadot",
      app: app?.name ?? "Polkadot",
      ...accountDetails,
      address,
      curve,
      balances: balances.balances.find((b) => isAddressEqual(b.address, address)),
      isBalanceLoading: balances.status === "initialising",
      connected: !!walletAccounts.find((wa) => isAddressEqual(wa.address, address)),
      genesisHash: chain.genesisHash,
    }
  }, [
    accountDetails,
    address,
    app?.name,
    balances.balances,
    balances.status,
    chain,
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
                        address={encodeAnyAddress(accountDef.address, {
                          ss58Format: chain?.prefix,
                        })}
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

type CustomAccountDetails = {
  accountIndex: number
  addressOffset: number
  name: string
  genesisHash: `0x${string}`
}

const getNextAccountDetails = (
  accounts: Account[],
  chain: DotNetwork,
  app: SubstrateAppParams,
): CustomAccountDetails => {
  let nextAccountIndex = 0
  const existingAccountIndexes = accounts
    .filter(isAccountLedgerPolkadotLegacy)
    .filter(
      (a) =>
        a.app === app?.name &&
        a.addressOffset === 0 &&
        typeof a.accountIndex === "number" &&
        a.genesisHash === chain.genesisHash,
    )
    .map((a) => a.accountIndex as number)
  for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++)
    if (!existingAccountIndexes.includes(i)) {
      nextAccountIndex = i
      break
    }

  return {
    genesisHash: chain.genesisHash!,
    accountIndex: nextAccountIndex,
    addressOffset: 0,
    name: `Custom Ledger ${app.name} ${nextAccountIndex + 1}`,
  }
}

const useLedgerAccountAddress = (account: CustomAccountDetails) => {
  const { t } = useTranslation()
  const { getAddress } = useGetLedgerPolkadotLegacyAddress(account.genesisHash)

  const refIsBusy = useRef(false)

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account address..."),
  })

  const [state, setState] = useState<{
    account: CustomAccountDetails | undefined
    address: string | undefined
  }>({
    account,
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
