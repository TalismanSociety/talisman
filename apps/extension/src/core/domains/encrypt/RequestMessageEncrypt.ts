import { EncryptPayload, RequestEncrypt } from "./types"

export default class RequestMessageEncrypt implements RequestEncrypt {
  readonly payload: EncryptPayload
  type: string
  constructor(payload: EncryptPayload, type: string) {
    this.payload = payload
    this.type = type
  }
}
