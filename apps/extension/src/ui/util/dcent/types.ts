export class DcentError extends Error {
  public readonly code: string

  constructor(code: string, msg: string) {
    super(msg)

    this.code = code

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
