import { DecryptPayload, RequestDecrypt } from "./types"

export default class RequestMessageDecrypt implements RequestDecrypt {
  readonly payload: DecryptPayload
  type : string
  constructor(payload: DecryptPayload, type: string) {
    this.payload = payload
    this.type = type
  }
}
