import { u8aConcat } from "@polkadot/util"

import { FRAME_SIZE } from "../constants"

const MultipartQrEncoder = async (data: Uint8Array): Promise<Uint8Array[]> => {
  const MULTIPART = new Uint8Array([0])
  const encodeNumber = (value: number) => new Uint8Array([value >> 8, value & 0xff])
  const numberOfFrames = Math.ceil(data.length / FRAME_SIZE)

  const dataFrames = Array.from({ length: numberOfFrames })
    .map((_, index) => data.subarray(index * FRAME_SIZE, (index + 1) * FRAME_SIZE))
    .map((dataFrame, index) =>
      u8aConcat(MULTIPART, encodeNumber(numberOfFrames), encodeNumber(index), dataFrame)
    )

  return dataFrames
}

export default MultipartQrEncoder
