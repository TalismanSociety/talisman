import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { WithTooltip } from "@talisman/components/Tooltip"
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  LoaderIcon,
  PolkadotVaultIcon,
} from "@talisman/theme/icons"
import { decodeAnyAddress, sleep } from "@talismn/util"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { Address } from "@ui/domains/Account/Address"
import Avatar from "@ui/domains/Account/Avatar"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import Fiat from "@ui/domains/Asset/Fiat"
import { ScanQr } from "@ui/domains/Sign/Qr/ScanQr"
import { useBalanceDetails } from "@ui/hooks/useBalanceDetails"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import useChains from "@ui/hooks/useChains"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useMemo, useReducer } from "react"
import { Checkbox, FormFieldInputText } from "talisman-ui"

type State =
  | { type: "SCAN"; enable: boolean; cameraError?: string; scanError?: string }
  | {
      type: "CONFIGURE"
      name: string
      address: string
      genesisHash: string | null
      lockToNetwork: boolean
      submitting?: true
    }

type Action =
  | { method: "enableScan" }
  | { method: "setScanError"; error: string }
  | { method: "setCameraError"; error: string }
  | { method: "onScan"; scanned?: { content: string; genesisHash: string; isAddress: boolean } }
  | { method: "setName"; name: string }
  | { method: "setLockToNetwork"; lockToNetwork: boolean }
  | { method: "setSubmitting" }
  | { method: "setSubmittingFailed" }

const initialState: State = { type: "SCAN", enable: false }

const reducer = (state: State, action: Action): State => {
  if (state.type === "SCAN") {
    if (action.method === "enableScan") return { type: "SCAN", enable: true }
    if (action.method === "setScanError")
      return { type: "SCAN", enable: false, scanError: action.error }
    if (action.method === "setCameraError")
      return { type: "SCAN", enable: false, cameraError: action.error }

    if (action.method === "onScan") {
      const scanned = action.scanned

      if (!scanned) return state
      if (!scanned.isAddress)
        return { type: "SCAN", enable: true, scanError: "QR code is not valid" }

      const { content: address, genesisHash } = scanned

      if (decodeAnyAddress(address).byteLength !== 32)
        return { type: "SCAN", enable: true, scanError: "QR code contains an invalid address" }
      if (!genesisHash.startsWith("0x"))
        return { type: "SCAN", enable: true, scanError: "QR code contains an invalid genesisHash" }

      return {
        type: "CONFIGURE",
        name: "",
        address,
        genesisHash,
        lockToNetwork: false,
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
            name || "My Polkadot Vault Account",
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

  const [useTestnets] = useSetting("useTestnets")
  const { chains } = useChains(useTestnets)
  const addressesByChain = useMemo(() => {
    if (state.type !== "CONFIGURE") return

    const { address, genesisHash, lockToNetwork } = state
    const filteredChains = lockToNetwork
      ? chains.filter((chain) => chain.genesisHash === genesisHash)
      : chains

    return Object.fromEntries(filteredChains.map(({ id }) => [id, [address]]))
  }, [chains, state])
  const balances = useBalancesByParams({ addressesByChain })
  const chain = useChainByGenesisHash(
    (state.type === "CONFIGURE" && state.genesisHash) || undefined
  )

  const isBalanceLoading =
    !addressesByChain ||
    balances.sorted.length < 1 ||
    balances.sorted.some((b) => b.status !== "live")
  const { balanceDetails, totalUsd } = useBalanceDetails(balances)

  return (
    <Layout withBack centered>
      {state.type === "SCAN" && (
        <>
          <HeaderBlock className="mb-12" title="Import Polkadot Vault" />
          <div className="grid grid-cols-2 gap-12">
            <div>
              <ol className="flex flex-col gap-12">
                {[
                  {
                    title: "Open Polkadot Vault on your device",
                    body: (
                      <>
                        <div>Select ‘Keys’ tab from the bottom navigation bar</div>
                        <div className="mt-4">
                          <a
                            className="text-body-secondary hover:text-body"
                            href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/import-from-parity-signer-vault"
                            target="_blank"
                          >
                            <span className="underline underline-offset-2">
                              Instructions for Parity Signer (legacy version)
                            </span>{" "}
                            <ExternalLinkIcon className="inline" />
                          </a>
                        </div>
                      </>
                    ),
                  },
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
                    : state.enable
                    ? // ENABLED AND NO ERROR
                      {
                        title: "Approve camera permissions",
                        body: "Allow Talisman to access your camera to scan QR codes",
                      }
                    : // NOT ENABLED
                      {
                        title: "Approve camera permissions",
                        body: "Allow Talisman to access your camera to scan QR codes",
                        extra: (
                          <button
                            className="bg-primary/10 text-primary hover:bg-primary/20 mt-6 inline-block rounded-full px-6 text-sm font-light leading-[32px]"
                            onClick={() => dispatch({ method: "enableScan" })}
                          >
                            Turn on Camera
                          </button>
                        ),
                      },

                  {
                    title: "Scan QR code",
                    body: "Bring the account QR code on the screen of the Polkadot Vault app in front of the camera on your computer. The preview image is blurred for security, but this does not affect the reading",
                  },
                ].map(({ title, body, extra, errorIcon }, index) => (
                  <li className="relative ml-20" key={index}>
                    {errorIcon ? (
                      <div className=" border-alert-error text-alert-error absolute -left-20 flex h-12 w-12 items-center justify-center rounded-full border-2 text-xs font-bold">
                        !
                      </div>
                    ) : (
                      <div className="bg-black-tertiary text-body-secondary absolute -left-20 flex h-12 w-12 items-center justify-center rounded-full text-xs lining-nums">
                        {index + 1}
                      </div>
                    )}
                    <div className="mb-8">{title}</div>
                    <p className="text-body-secondary">{body}</p>
                    {extra ?? null}
                  </li>
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
            text="Help distinguish your account by giving it a name. This would ideally be the same as the name on your Polkadot Vault device to make it easy to identify when signing."
          />
          <form className="my-20 space-y-10" onSubmit={submit}>
            <FormFieldInputText
              type="text"
              placeholder="My Polkadot Vault Account"
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
                    {state.name || "My Polkadot Vault Account"}
                  </div>
                  <div>
                    <PolkadotVaultIcon className="text-primary" />
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

            {!!chain && (
              <Checkbox
                checked={state.lockToNetwork}
                onChange={(event) =>
                  dispatch({ method: "setLockToNetwork", lockToNetwork: event.target.checked })
                }
              >
                <span className="text-body-secondary inline-flex items-center gap-2">
                  <span>Restrict account to </span>
                  <ChainLogo id={chain.id} className="inline" />
                  <span className="text-body">{chain.name}</span>
                  <span>network</span>
                </span>
              </Checkbox>
            )}

            <div className="flex justify-end py-8">
              <SimpleButton type="submit" primary processing={state.submitting}>
                Import <ArrowRightIcon />
              </SimpleButton>
            </div>
          </form>
        </>
      )}
    </Layout>
  )
}
