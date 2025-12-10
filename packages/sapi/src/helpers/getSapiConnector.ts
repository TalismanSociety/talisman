import { SapiConnectorProps } from "../types"

export type SapiConnector = Required<SapiConnectorProps>

export const getSapiConnector = ({
  chainId,
  send,
  submit,
  submitWithBittensorMevShield,
}: SapiConnectorProps): SapiConnector => ({
  chainId,
  send,
  submit: (...args) => {
    if (submit) return submit(...args)
    throw new Error("submit handler not provided")
  },
  submitWithBittensorMevShield: (...args) => {
    if (submitWithBittensorMevShield) return submitWithBittensorMevShield(...args)
    throw new Error("submitWithBittensorMevShield handler not provided")
  },
})
