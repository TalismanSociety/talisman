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
  | { SCAN: { error?: string } }
  | {
      CONFIGURE: {
        name: string
        address: string
        genesisHash: string | null
        lockToNetwork: boolean
      }
    }

type Action =
  | { onScan: { content: string; genesisHash: string; isAddress: boolean } }
  | { setName: string }
  | { setLockToNetwork: boolean }

const initialState: State = { SCAN: {} }

const reducer = (state: State, action: Action): State => {
  if ("SCAN" in state) {
    if ("onScan" in action) {
      const scanned = action.onScan

      if (!scanned) return state
      if (!scanned.isAddress) return { SCAN: { error: "invalid qr code" } }

      const { content: address, genesisHash } = scanned

      if (decodeAnyAddress(address).byteLength !== 32)
        return { SCAN: { error: "invalid address length" } }
      if (!genesisHash.startsWith("0x")) return { SCAN: { error: "invalid genesisHash" } }

      return {
        CONFIGURE: { name: "My Parity Signer Account", address, genesisHash, lockToNetwork: false },
      }
    }
  }

  if ("CONFIGURE" in state) {
    if ("setName" in action) return { CONFIGURE: { ...state.CONFIGURE, name: action.setName } }
    if ("setLockToNetwork" in action)
      return { CONFIGURE: { ...state.CONFIGURE, lockToNetwork: action.setLockToNetwork } }
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
      <HeaderBlock title="Import Parity Signer" />
      {"SCAN" in state && (
        <>
          <QrScanAddress onScan={(scanned) => dispatch({ onScan: scanned })} size={200} />
          {state.SCAN.error && <div>{state.SCAN.error}</div>}
        </>
      )}
      {"CONFIGURE" in state && (
        <form className="my-20 space-y-4" onSubmit={submit}>
          <FormFieldContainer label="Account name">
            <FormFieldInputText
              type="text"
              placeholder="My Parity Signer Account"
              small
              value={state.CONFIGURE.name}
              onChange={(event) => dispatch({ setName: event.target.value })}
            />
          </FormFieldContainer>
          <div className="grid grid-cols-2 gap-12">
            <FormFieldContainer label="Address">
              <FormFieldInputText
                type="text"
                autoComplete="off"
                disabled
                small
                value={state.CONFIGURE.address}
              />
            </FormFieldContainer>
          </div>
          <FormFieldContainer label="Lock to {network}">
            <Checkbox
              checked={state.CONFIGURE.lockToNetwork}
              onChange={(event) => dispatch({ setLockToNetwork: event.target.checked })}
            />
          </FormFieldContainer>
          <div className="flex justify-end py-8">
            <Button className="h-24 w-[24rem] text-base" type="submit" primary>
              Add Account
            </Button>
          </div>
        </form>
      )}
    </Layout>
  )
}
