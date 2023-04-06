import { hexToNumber, numberToU8a, u8aConcat, u8aToU8a } from "@polkadot/util"
import initRaptorq, { Encoder } from "raptorq"

import { FRAME_SIZE } from "../constants"

// This function uses raptorq wasm library (250ko) to generate the QR code, import only if necessary
// spec here : https://github.com/varovainen/parity-signer/blob/2022-05-25-uos/docs/src/development/UOS.md
const RaptorQrEncoder = async (data: Uint8Array): Promise<Uint8Array[]> => {
  await initRaptorq()

  const framesCount = Math.ceil(data.length / FRAME_SIZE)
  const repairPackets = data.length <= FRAME_SIZE ? 0 : framesCount
  const framePrefix = numberToU8a(hexToNumber("0x80000000") + data.length)

  const encoder = Encoder.with_defaults(data, FRAME_SIZE)
  const dataFrames = encoder
    .encode(repairPackets)
    .map((frame) => u8aToU8a(u8aConcat(framePrefix, u8aToU8a(frame))))

  return dataFrames
}

export default RaptorQrEncoder
