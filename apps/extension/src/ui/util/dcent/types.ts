import i18next from "i18next"

export class DcentError extends Error {
  public readonly code: string

  constructor(code: string, msg: string) {
    super(msg)

    this.code = code

    // override message with user friendly message
    // other error codes can be looked up here : https://github.com/DcentWallet/dcent-web-connector/blob/35a05a4752e2553f91ef79c2d872b7af3163934e/src/index.js
    switch (code) {
      case "time_out":
        this.message = i18next.t("The request has expired (timeout).")
        break
      case "pop-up_closed":
        this.message = i18next.t("Failed to connect to D'CENT Bridge.")
        break
    }

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DcentError.prototype)
  }
}

export type DcentDeviceInfo = {
  coinlist: { name: string }[]
  device_id: string
  fingerprint: { max: number; enrolled: number }
  fw_version: string
  ksm_version: string
  label: string
  state: "secure"
}

export type DcentAccountAddress = {
  address: string
}

export type DcentInfo = {
  chip: string
  version: string
  isUsbAttached: boolean
}

export type DcentAccount = {
  coin_name: string
  label: string
  address_path: string
  coin_group: string
}

export type DcentAccountInfo = {
  account: DcentAccount[]
}

export type DcentSubstratePayload = {
  coinType: string
  sigHash: string
  fee: string
  path: string
  symbol: string
  decimals: number
}

export type DcentSubstrateSignature = {
  signed_tx: `0x${string}`
}

export type DcentEthereumSignedData = {
  address: string
  sign: string
}

export type DcentEthereumSignedMessage = {
  address: string
  sign: string
}

export type DcentEthereumSignedTransaction = {
  sign_v: string
  sign_r: string
  sign_s: string
  signed: string
}
