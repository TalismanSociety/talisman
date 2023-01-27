import { QrScanAddress } from "@polkadot/react-qr"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { decodeAnyAddress, sleep } from "@talismn/util"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useReducer } from "react"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"

type State =
  | { SCAN: { enable: boolean; cameraError?: string; scanError?: string } }
  | {
      CONFIGURE: {
        name: string
        address: string
        genesisHash: string | null
        lockToNetwork: boolean
      }
    }

type Action =
  | { enableScan: true }
  | { setCameraError: string }
  | { onScan: { content: string; genesisHash: string; isAddress: boolean } }
  | { setName: string }
  | { setLockToNetwork: boolean }

const initialState: State = { SCAN: { enable: false } }

const reducer = (state: State, action: Action): State => {
  if ("SCAN" in state) {
    if ("enableScan" in action) return { SCAN: { enable: true } }
    if ("setCameraError" in action)
      return { SCAN: { enable: false, cameraError: action.setCameraError } }

    if ("onScan" in action) {
      const scanned = action.onScan

      if (!scanned) return state
      if (!scanned.isAddress) return { SCAN: { enable: true, scanError: "invalid qr code" } }

      const { content: address, genesisHash } = scanned

      if (decodeAnyAddress(address).byteLength !== 32)
        return { SCAN: { enable: true, scanError: "invalid address length" } }
      if (!genesisHash.startsWith("0x"))
        return { SCAN: { enable: true, scanError: "invalid genesisHash" } }

      return {
        CONFIGURE: { name: "", address, genesisHash, lockToNetwork: false },
      }
    }
  }

  if ("CONFIGURE" in state) {
    if ("setName" in action) return { CONFIGURE: { ...state.CONFIGURE, name: action.setName } }
    if ("setLockToNetwork" in action)
      return {
        CONFIGURE: {
          ...state.CONFIGURE,
          name: state.CONFIGURE.name ?? "My Parity Signer Account",
          lockToNetwork: action.setLockToNetwork,
        },
      }
  }

  return state
}

export const AccountAddQr = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const submit = useCallback(async () => {
    if (!("CONFIGURE" in state)) return

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

    const { name, address, genesisHash, lockToNetwork } = state.CONFIGURE

    try {
      setAddress(await api.accountCreateQr(name, address, lockToNetwork ? genesisHash : null))

      notifyUpdate(notificationId, {
        type: "success",
        title: "Account created",
        subtitle: name,
      })
    } catch (err) {
      notifyUpdate(notificationId, {
        type: "error",
        title: "Error creating account",
        subtitle: (err as Error)?.message,
      })
    }
  }, [setAddress, state])

  return (
    <Layout withBack centered>
      {"SCAN" in state && (
        <>
          <HeaderBlock className="mb-12" title="Import Parity Signer" />
          <div className="grid grid-cols-2 gap-12">
            <div>
              <ol className="flex flex-col gap-12">
                {[
                  state.SCAN.cameraError
                    ? // CAMERA HAS ERROR
                      {
                        title: "Approve camera permissions",
                        body: "It looks like you’ve blocked permissions for Talisman to access your camera",
                        extra: (
                          <button
                            className="bg-primary/10 text-primary mt-6 inline-block rounded p-4 text-xs font-light"
                            onClick={() => dispatch({ enableScan: true })}
                          >
                            Retry
                          </button>
                        ),
                        errorIcon: true,
                      }
                    : state.SCAN.enable
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
                            className="bg-primary/10 text-primary mt-6 inline-block rounded p-4 text-xs font-light"
                            onClick={() => dispatch({ enableScan: true })}
                          >
                            Turn on Camera
                          </button>
                        ),
                      },
                  {
                    title: "Open Parity Signer",
                    body: "Select ‘Keys’ tab then select your account to reveal the QR code.",
                  },
                  {
                    title: "Scan QR code",
                    body: "Bring your QR code in front of your camera. The preview image is blurred for security, but this does not affect the reading.",
                  },
                ].map(({ title, body, extra, errorIcon }, index) => (
                  <li className="relative ml-20">
                    {errorIcon ? (
                      <div className=" border-alert-error text-alert-error text-tiny absolute -left-20 flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold">
                        !
                      </div>
                    ) : (
                      <div className="bg-black-tertiary text-body-secondary text-tiny absolute -left-20 flex h-12 w-12 items-center justify-center rounded-full lining-nums">
                        {index + 1}
                      </div>
                    )}
                    <div className="mb-8">{title}</div>
                    <div className="text-body-secondary leading-10">{body}</div>
                    {extra ?? null}
                  </li>
                ))}
              </ol>
              {state.SCAN.scanError && <div>{state.SCAN.scanError}</div>}
            </div>
            <div>
              {state.SCAN.enable ? (
                <QrScanAddress
                  onScan={(scanned) => dispatch({ onScan: scanned })}
                  onError={(error) =>
                    dispatch({ setCameraError: error.name ?? error.message ?? "error" })
                  }
                  size={200}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
      {"CONFIGURE" in state && (
        <>
          <HeaderBlock
            className="mb-12"
            title="Name your account"
            text="Help distinguish your account by giving it a name. This would ideally be the same as the name on your Parity Signer device to make it easy to identify when signing."
          />
          <form className="my-20 space-y-4" onSubmit={submit}>
            <FormFieldInputText
              type="text"
              placeholder="My Parity Signer Account"
              small
              value={state.CONFIGURE.name}
              onChange={(event) => dispatch({ setName: event.target.value })}
            />
            <FormFieldContainer label="Address">
              <FormFieldInputText
                type="text"
                autoComplete="off"
                disabled
                small
                value={state.CONFIGURE.address}
              />
            </FormFieldContainer>
            <FormFieldContainer label="">
              <Checkbox
                checked={state.CONFIGURE.lockToNetwork}
                onChange={(event) => dispatch({ setLockToNetwork: event.target.checked })}
              >
                <div className="text-body-secondary">
                  Restrict account to <div className="text-body inline-block">{"{network}"}</div>{" "}
                  network
                </div>
              </Checkbox>
            </FormFieldContainer>
            <div className="flex justify-end py-8">
              <Button className="h-24 w-[24rem] text-base" type="submit" primary>
                Add Account
              </Button>
            </div>
          </form>
        </>
      )}
    </Layout>
  )
}
