import { SapiConnectorProps } from "../types"

export type SapiConnector = Required<SapiConnectorProps>

export const getSapiConnector = ({ chainId, send, submit }: SapiConnectorProps): SapiConnector => ({
  chainId,
  send,
  submit: (...args) => {
    if (submit) return submit(...args)
    throw new Error("submit handler not provided")
  },
})
