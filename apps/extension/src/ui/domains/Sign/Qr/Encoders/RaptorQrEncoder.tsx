import { hexToNumber, numberToU8a, u8aConcat, u8aToU8a } from "@polkadot/util"
import initRaptorq, { Encoder } from "raptorq"
import raptorqWasmUrl from "raptorq/raptorq_bg.wasm?url"

import { FRAME_SIZE } from "../constants"

let raptorqInitPromise: Promise<void> | null = null

const initRaptorqOnce = async () => {
  if (!raptorqInitPromise) {
    raptorqInitPromise = (async () => {
      const response = await fetch(raptorqWasmUrl)
      if (!response.ok) {
        throw new Error(`Failed to load raptorq wasm (${response.status} ${response.statusText})`)
      }
      const wasmBytes = await response.arrayBuffer()
      await initRaptorq(wasmBytes)
    })()
  }

  return raptorqInitPromise
}

// This function uses raptorq wasm library (250ko) to generate the QR code, import only if necessary
// spec here : https://github.com/varovainen/parity-signer/blob/2022-05-25-uos/docs/src/development/UOS.md
const RaptorQrEncoder = async (data: Uint8Array): Promise<Uint8Array[]> => {
  await initRaptorqOnce()

  const framesCount = Math.ceil(data.length / FRAME_SIZE)
  const repairPackets = data.length <= FRAME_SIZE ? 0 : framesCount
  const framePrefix = numberToU8a(hexToNumber("0x80000000") + data.length)

  const encoder = Encoder.with_defaults(data, FRAME_SIZE)
  const dataFrames = encoder
    .encode(repairPackets)
    .map((frame) => u8aToU8a(u8aConcat(framePrefix, u8aToU8a(frame))))

  return dataFrames
}

// dynamically imported by QrCode.tsx
export default RaptorQrEncoder
