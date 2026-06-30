/** ******************************************************************************
 *  Vendored from @zondax/ledger-substrate@1.1.2 (Apache-2.0).
 *
 *  @zondax/ledger-substrate v2 dropped the legacy per-chain `SubstrateApp`
 *  (the device-specific apps — Kusama, Acala, …) in favour of the single
 *  `PolkadotGenericApp`. Talisman still has to sign for accounts that were
 *  created under those legacy apps (and have not been migrated to the generic
 *  app), so we keep a TS reimplementation of the APDU layer here while the live
 *  dependency moves to v2 for the generic app.
 *
 *  This is a reimplementation, not a verbatim copy — the methods are rewritten,
 *  but every `transport.send` (CLA / INS / P1 / P2 / payload + path
 *  serialization) is byte-for-byte what 1.1.2 sent, so the device sees identical
 *  bytes. Verified against the 1.1.2 dist and guarded by substrateApp.test.ts.
 *
 *  Only the methods Talisman actually uses are kept (`getAddress`, `sign`,
 *  `signRaw`); the deprecated allowlist/upload/version helpers were removed.
 *
 *  (c) 2019 - 2024 Zondax AG
 *  (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */
import type Transport from "@ledgerhq/hw-transport"

const CHUNK_SIZE = 250

const INS = { GET_ADDR: 0x01, SIGN: 0x02, SIGN_RAW: 0x03 } as const
type SignIns = typeof INS.SIGN | typeof INS.SIGN_RAW

const PAYLOAD_TYPE = { INIT: 0x00, ADD: 0x01, LAST: 0x02 } as const

const SCHEME = { ED25519: 0x00, SR25519: 0x01, ECDSA: 0x02 } as const
type Scheme = (typeof SCHEME)[keyof typeof SCHEME]

const ERROR_CODE = { NoError: 0x9000, InvalidData: 0x6984 } as const

const ERROR_DESCRIPTION: Record<number, string> = {
  1: "U2F: Unknown",
  2: "U2F: Bad request",
  3: "U2F: Configuration unsupported",
  4: "U2F: Device Ineligible",
  5: "U2F: Timeout",
  14: "Timeout",
  36864: "No errors",
  36865: "Device is busy",
  26626: "Error deriving keys",
  25600: "Execution Error",
  26368: "Wrong Length",
  27010: "Empty Buffer",
  27011: "Output buffer too small",
  27012: "Data is invalid",
  27013: "Conditions not satisfied",
  27014: "Transaction rejected",
  27264: "Bad key handle",
  27392: "Invalid P1/P2",
  27904: "Instruction not supported",
  28161: "App does not seem to be open",
  28416: "Unknown error",
  28417: "Sign/verify error",
}

const errorCodeToString = (statusCode: number) =>
  statusCode in ERROR_DESCRIPTION
    ? ERROR_DESCRIPTION[statusCode]
    : `Unknown Status Code: ${statusCode}`

const isDict = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date)

export interface ResponseBase {
  error_message: string
  return_code: number
}

export interface ResponseAddress extends ResponseBase {
  address: string
  pubKey: string
}

export interface ResponseSign extends ResponseBase {
  signature: Buffer
}

const processErrorResponse = (response: unknown): ResponseBase => {
  if (response != null) {
    if (isDict(response)) {
      if (Object.hasOwn(response, "returnCode"))
        return {
          return_code: response.returnCode as number,
          error_message: errorCodeToString(response.returnCode as number),
        }

      if (Object.hasOwn(response, "statusCode"))
        return {
          return_code: response.statusCode as number,
          error_message: errorCodeToString(response.statusCode as number),
        }

      if (Object.hasOwn(response, "return_code") && Object.hasOwn(response, "error_message"))
        return response as unknown as ResponseBase
    }

    return {
      return_code: 0xffff,
      error_message: String(response),
    }
  }

  return {
    return_code: 0xffff,
    error_message: String(response),
  }
}

/**
 * Class representing a legacy (per-chain) Substrate Ledger application.
 */
export class SubstrateApp {
  transport: Transport
  cla: number
  slip0044: number

  constructor(transport: Transport, cla: number, slip0044: number) {
    if (transport == null) {
      throw new Error("Transport has not been defined")
    }
    this.transport = transport
    this.cla = cla
    this.slip0044 = slip0044
  }

  static serializePath(
    slip0044: number,
    account: number,
    change: number,
    addressIndex: number
  ): Buffer {
    if (!Number.isInteger(account)) throw new Error("Input must be an integer")
    if (!Number.isInteger(change)) throw new Error("Input must be an integer")
    if (!Number.isInteger(addressIndex)) throw new Error("Input must be an integer")

    const buf = Buffer.alloc(20)
    buf.writeUInt32LE(0x8000002c, 0)
    buf.writeUInt32LE(slip0044, 4)
    buf.writeUInt32LE(account, 8)
    buf.writeUInt32LE(change, 12)
    buf.writeUInt32LE(addressIndex, 16)
    return buf
  }

  static GetChunks(message: Buffer): Buffer[] {
    const chunks: Buffer[] = []
    const buffer = Buffer.from(message)

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE
      if (i > buffer.length) {
        end = buffer.length
      }
      chunks.push(buffer.subarray(i, end))
    }

    return chunks
  }

  static signGetChunks(
    slip0044: number,
    account: number,
    change: number,
    addressIndex: number,
    message: Buffer
  ): Buffer[] {
    const chunks = []
    const bip44Path = SubstrateApp.serializePath(slip0044, account, change, addressIndex)
    chunks.push(bip44Path)
    chunks.push(...SubstrateApp.GetChunks(message))
    return chunks
  }

  async getAddress(
    account: number,
    change: number,
    addressIndex: number,
    requireConfirmation = false,
    scheme: Scheme = SCHEME.ED25519
  ): Promise<ResponseAddress> {
    const bip44Path = SubstrateApp.serializePath(this.slip0044, account, change, addressIndex)

    const p1 = requireConfirmation ? 1 : 0
    const p2 = Number.isNaN(scheme) ? 0 : scheme

    return this.transport.send(this.cla, INS.GET_ADDR, p1, p2, bip44Path).then((response) => {
      const errorCodeData = response.subarray(-2)
      const errorCode = errorCodeData[0] * 256 + errorCodeData[1]

      const pubkeyLen = scheme === SCHEME.ECDSA ? 33 : 32

      return {
        pubKey: response.subarray(0, pubkeyLen).toString("hex"),
        address: response.subarray(pubkeyLen, response.length - 2).toString("ascii"),
        return_code: errorCode,
        error_message: errorCodeToString(errorCode),
      }
    }, processErrorResponse) as Promise<ResponseAddress>
  }

  private async signSendChunk(
    chunkIdx: number,
    chunkNum: number,
    chunk: Buffer,
    scheme: Scheme = SCHEME.ED25519,
    ins: SignIns = INS.SIGN
  ): Promise<{ signature: Buffer | null; return_code: number; error_message: string }> {
    let payloadType: number = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    const p2 = Number.isNaN(scheme) ? 0 : scheme

    return this.transport
      .send(this.cla, ins, payloadType, p2, chunk, [ERROR_CODE.NoError, 0x6984, 0x6a80])
      .then(
        (response) => {
          const errorCodeData = response.subarray(-2)
          const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
          let errorMessage = errorCodeToString(returnCode)
          let signature: Buffer | null = null

          if (returnCode === 0x6a80 || returnCode === 0x6984) {
            errorMessage = response.subarray(0, response.length - 2).toString("ascii")
          } else if (response.length > 2) {
            signature = response.subarray(0, response.length - 2)
          }

          return { signature, return_code: returnCode, error_message: errorMessage }
        },
        (e: unknown) => ({ signature: null, ...processErrorResponse(e) })
      )
  }

  private async signImpl(
    account: number,
    change: number,
    addressIndex: number,
    message: Buffer,
    ins: SignIns,
    scheme: Scheme = SCHEME.ED25519
  ): Promise<ResponseSign> {
    const chunks = SubstrateApp.signGetChunks(this.slip0044, account, change, addressIndex, message)

    // the first chunk is the bip44 path; its response is intentionally ignored
    await this.signSendChunk(1, chunks.length, chunks[0], scheme, ins)

    let result: { signature: Buffer | null; return_code: number; error_message: string } = {
      signature: null,
      return_code: ERROR_CODE.NoError,
      error_message: errorCodeToString(ERROR_CODE.NoError),
    }
    for (let i = 1; i < chunks.length; i += 1) {
      result = await this.signSendChunk(1 + i, chunks.length, chunks[i], scheme, ins)
      if (result.return_code !== ERROR_CODE.NoError) {
        break
      }
    }

    return {
      return_code: result.return_code,
      error_message: result.error_message,
      signature: result.signature as Buffer,
    }
  }

  async sign(
    account: number,
    change: number,
    addressIndex: number,
    message: Buffer,
    scheme: Scheme = SCHEME.ED25519
  ): Promise<ResponseSign> {
    return this.signImpl(account, change, addressIndex, message, INS.SIGN, scheme)
  }

  async signRaw(
    account: number,
    change: number,
    addressIndex: number,
    message: Buffer,
    scheme: Scheme = SCHEME.ED25519
  ): Promise<ResponseSign> {
    return this.signImpl(account, change, addressIndex, message, INS.SIGN_RAW, scheme)
  }
}
