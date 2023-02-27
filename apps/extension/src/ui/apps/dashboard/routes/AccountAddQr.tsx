import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ArrowRightIcon, LoaderIcon, ParitySignerIcon } from "@talisman/theme/icons"
import imgImportDerived from "@talisman/theme/images/import-ps-derived.png"
import imgImportRoot from "@talisman/theme/images/import-ps-root.png"
import { classNames, decodeAnyAddress, formatDecimals, sleep } from "@talismn/util"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { Address } from "@ui/domains/Account/Address"
import Avatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { ScanQr } from "@ui/domains/Sign/ScanQr"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChains from "@ui/hooks/useChains"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { FC, ReactNode, useCallback, useMemo, useReducer } from "react"
import { Button, FormFieldInputText } from "talisman-ui"

const AccountTypeButton: FC<{
  title: ReactNode
  description: ReactNode
  imgSrc: string
  onClick: () => void
}> = ({ title, description, imgSrc, onClick }) => (
  <button
    type="button"
    className="bg-grey-900 leading-paragraph hover:bg-grey-800 ring-body-secondary w-[346px] rounded-lg py-14 px-16 text-left focus:ring-1"
    onClick={onClick}
  >
    <div className="text-body font-bold">{title}</div>
    <div className="mt-4">{description}</div>
    <div className="mt-8">
      <img alt="" src={imgSrc} className="w-[265px]" />
    </div>
  </button>
)

const ListEntry: FC<{
  number: number
  title: ReactNode
  children: ReactNode
  isError?: boolean
  extra?: ReactNode
}> = ({ number, title, children, isError, extra }) => (
  <li className="relative ml-20">
    {isError ? (
      <div className=" border-alert-error text-alert-error absolute -left-20 flex h-12 w-12 items-center justify-center rounded-full border-2 text-xs font-bold">
        !
      </div>
    ) : (
      <div className="bg-black-tertiary text-body-secondary absolute -left-20 flex h-12 w-12 items-center justify-center rounded-full text-xs lining-nums">
        {number}
      </div>
    )}
    <div className="mb-8">{title}</div>
    <p className="text-body-secondary">{children}</p>
    {extra ?? null}
  </li>
)

type State =
  | { type: "SELECT_TYPE" }
  | {
      type: "SCAN"
      enable: boolean
      cameraError?: string
      scanError?: string
      isChainSpecific: boolean
    }
  | {
      type: "CONFIGURE"
      name: string
      address: string
      genesisHash: string | null
      lockToNetwork: boolean
      submitting?: true
    }

type Action =
  | { method: "setAccountType"; isChainSpecific: boolean }
  | { method: "enableScan" }
  | { method: "setScanError"; error: string }
  | { method: "setCameraError"; error: string }
  | { method: "onScan"; scanned?: { content: string; genesisHash: string; isAddress: boolean } }
  | { method: "setName"; name: string }
  | { method: "setLockToNetwork"; lockToNetwork: boolean }
  | { method: "setSubmitting" }
  | { method: "setSubmittingFailed" }

const initialState: State = { type: "SELECT_TYPE" }

const reducer = (state: State, action: Action): State => {
  if (state.type === "SELECT_TYPE") {
    if (action.method === "setAccountType")
      return { type: "SCAN", enable: false, isChainSpecific: action.isChainSpecific }
  }

  if (state.type === "SCAN") {
    if (action.method === "enableScan") return { ...state, enable: true }
    if (action.method === "setScanError")
      return { ...state, enable: false, scanError: action.error }
    if (action.method === "setCameraError")
      return { ...state, enable: false, cameraError: action.error }

    if (action.method === "onScan") {
      const scanned = action.scanned

      if (!scanned) return state
      if (!scanned.isAddress) return { ...state, scanError: "QR code is not valid" }

      const { content: address, genesisHash } = scanned

      if (decodeAnyAddress(address).byteLength !== 32)
        return { ...state, scanError: "QR code contains an invalid address" }
      if (!genesisHash.startsWith("0x"))
        return { ...state, scanError: "QR code contains an invalid genesisHash" }

      return {
        type: "CONFIGURE",
        name: "",
        address,
        genesisHash,
        lockToNetwork: state.isChainSpecific,
      }
    }
  }

  if (state.type === "CONFIGURE") {
    if (action.method === "setName") return { ...state, type: "CONFIGURE", name: action.name }
    if (action.method === "setLockToNetwork")
      return { ...state, type: "CONFIGURE", lockToNetwork: action.lockToNetwork }
    if (action.method === "setSubmitting") return { ...state, type: "CONFIGURE", submitting: true }
    if (action.method === "setSubmittingFailed")
      return { ...state, type: "CONFIGURE", submitting: undefined }
  }

  return state
}

export const AccountAddQr = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (state.type !== "CONFIGURE") return
      if (state.submitting) return

      dispatch({ method: "setSubmitting" })

      const notificationId = notify(
        {
          type: "processing",
          title: "Creating account",
          subtitle: "Please wait",
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      const { name, address, genesisHash, lockToNetwork } = state

      try {
        setAddress(
          await api.accountCreateQr(
            name || "My Parity Signer Account",
            address,
            lockToNetwork ? genesisHash : null
          )
        )
        notifyUpdate(notificationId, {
          type: "success",
          title: "Account created",
          subtitle: name,
        })
      } catch (error) {
        dispatch({ method: "setSubmittingFailed" })
        notifyUpdate(notificationId, {
          type: "error",
          title: "Error creating account",
          subtitle: (error as Error)?.message,
        })
      }
    },
    [setAddress, state]
  )

  const { chains } = useChains(true)
  const addressesByChain = useMemo(() => {
    if (state.type !== "CONFIGURE") return

    const { address, genesisHash, lockToNetwork } = state
    const filteredChains = lockToNetwork
      ? chains.filter((chain) => chain.genesisHash === genesisHash)
      : chains

    return Object.fromEntries(filteredChains.map(({ id }) => [id, [address]]))
  }, [chains, state])
  const balances = useBalancesByParams({ addressesByChain })

  const isBalanceLoading =
    !addressesByChain ||
    balances.sorted.length < 1 ||
    balances.sorted.some((b) => b.status !== "live")
  const { balanceDetails, totalUsd } = useMemo(() => {
    const balanceDetails = balances.sorted
      .filter((b) => b.total.planck > BigInt("0") && b.total.fiat("usd"))
      .map(
        (b) =>
          `${formatDecimals(b.total.tokens)} ${b.token?.symbol} / ${new Intl.NumberFormat(
            undefined,
            {
              style: "currency",
              currency: "usd",
              currencyDisplay: "narrowSymbol",
            }
          ).format(b.total.fiat("usd") ?? 0)}`
      )
      .join("\n")
    const totalUsd = balances.sorted.reduce(
      (prev, curr) => prev + (curr.total ? curr.total.fiat("usd") ?? 0 : 0),
      0
    )

    return { balanceDetails, totalUsd }
  }, [balances])

  return (
    <Layout withBack centered>
      {state.type === "SELECT_TYPE" && (
        <div className="w-[748px]">
          <HeaderBlock className="mb-12" title="Import Parity Signer" />
          <div className="grid grid-cols-2 gap-12">
            <div>
              <ol className="flex flex-col gap-12">
                <ListEntry number={1} title="Open Parity Signer on your device">
                  Select 'Keys' tab from the bottom navigation bar
                </ListEntry>
                <ListEntry number={2} title="Which account type would you like to use ?">
                  <div className="grid min-w-[716px] grid-cols-2 gap-12">
                    <AccountTypeButton
                      title="For multi-chain (recommended)"
                      description="Select the top (root) account in Parity Signer to reveal the QR code"
                      imgSrc={imgImportRoot}
                      onClick={() => dispatch({ method: "setAccountType", isChainSpecific: false })}
                    />
                    <AccountTypeButton
                      title="For single-chain (derived keys)"
                      description="Select the derived account in Parity Signer to reveal the QR code"
                      imgSrc={imgImportDerived}
                      onClick={() => dispatch({ method: "setAccountType", isChainSpecific: true })}
                    />
                  </div>
                </ListEntry>
              </ol>
            </div>
          </div>
        </div>
      )}
      {state.type === "SCAN" && (
        <>
          <HeaderBlock className="mb-12" title="Import Parity Signer" />
          <div className="grid grid-cols-2 gap-12">
            <div>
              <ol className="flex flex-col gap-12">
                {[
                  state.cameraError
                    ? // CAMERA HAS ERROR
                      {
                        title: "Approve camera permissions",
                        body: "It looks like you’ve blocked permissions for Talisman to access your camera",
                        extra: (
                          <button
                            className="bg-primary/10 text-primary hover:bg-primary/20 mt-6 inline-block rounded-full px-6 text-sm font-light leading-[32px]"
                            onClick={() => dispatch({ method: "enableScan" })}
                          >
                            Retry
                          </button>
                        ),
                        errorIcon: true,
                      }
                    : {
                        title: "Approve camera permissions",
                        body: "Allow Talisman to access your camera to scan QR codes",
                        extra: (
                          <button
                            className={classNames(
                              "bg-primary/10 text-primary hover:bg-primary/20 mt-6 inline-block rounded-full px-6 text-sm font-light leading-[32px]",
                              state.enable ? "invisible" : "visible"
                            )}
                            onClick={() => dispatch({ method: "enableScan" })}
                          >
                            Turn on Camera
                          </button>
                        ),
                      },
                  {
                    title: "Scan QR code",
                    body: "Bring your QR code in front of your camera. The preview image is blurred for security, but this does not affect the reading",
                  },
                ].map(({ title, body, extra, errorIcon }, index) => (
                  <ListEntry
                    key={index}
                    title={title}
                    extra={extra}
                    isError={errorIcon}
                    number={index + 3}
                  >
                    {body}
                  </ListEntry>
                ))}
              </ol>
            </div>
            <div>
              <ScanQr
                type="address"
                enable={state.enable}
                error={!!state.cameraError}
                onScan={(scanned) => dispatch({ method: "onScan", scanned })}
                onError={(error) =>
                  [
                    "AbortError",
                    "NotAllowedError",
                    "NotFoundError",
                    "NotReadableError",
                    "OverconstrainedError",
                    "SecurityError",
                  ].includes(error.name)
                    ? dispatch({
                        method: "setCameraError",
                        error: error.name ?? error.message ?? "error",
                      })
                    : dispatch({
                        method: "setScanError",
                        error: error.message.startsWith("Invalid prefix received")
                          ? "QR code is not valid"
                          : error.message ?? "Unknown error",
                      })
                }
              />
              {state.scanError && (
                <div className="text-alert-error bg-alert-error/10 mt-6 inline-block w-[260px] rounded p-4 text-center text-xs font-light">
                  {state.scanError}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {state.type === "CONFIGURE" && (
        <>
          <HeaderBlock
            className="mb-12"
            title="Name your account"
            text="Help distinguish your account by giving it a name. This would ideally be the same as the name on your Parity Signer device to make it easy to identify when signing."
          />
          <form className="my-20 space-y-10" onSubmit={submit}>
            <FormFieldInputText
              type="text"
              placeholder="My Parity Signer Account"
              containerProps={{ className: "!h-28" }}
              small
              value={state.name}
              autoFocus
              onChange={(event) => dispatch({ method: "setName", name: event.target.value })}
            />

            <div className="ring-grey-700 flex w-full items-center gap-8 overflow-hidden rounded-sm p-8 text-left ring-1">
              <Avatar
                address={state.address}
                genesisHash={state.lockToNetwork ? state.genesisHash : undefined}
              />
              <div className="flex flex-col !items-start gap-2 overflow-hidden leading-8">
                <div className="text-body flex w-full items-center gap-3 text-base leading-none">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base leading-8">
                    {state.name || "My Parity Signer Account"}
                  </div>
                  <div className="text-primary">
                    <ParitySignerIcon />
                  </div>
                </div>
                <div className="text-body-secondary overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-7">
                  <Address address={state.address} />
                </div>
              </div>
              <div className="grow" />
              <div className="flex items-center justify-end gap-2">
                <div className="flex flex-col justify-center pb-1 leading-none">
                  {isBalanceLoading && (
                    <LoaderIcon className="animate-spin-slow inline text-white" />
                  )}
                </div>
                <WithTooltip as="div" className="leading-none" tooltip={balanceDetails} noWrap>
                  <Fiat className="leading-none" amount={totalUsd} currency="usd" />
                </WithTooltip>
              </div>
            </div>
            <div className="flex justify-end pt-12">
              <Button icon={ArrowRightIcon} type="submit" primary processing={state.submitting}>
                Import
              </Button>
            </div>
          </form>
        </>
      )}
    </Layout>
  )
}
