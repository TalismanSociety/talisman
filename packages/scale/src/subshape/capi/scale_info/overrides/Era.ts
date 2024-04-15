/**
 * Adapted from https://github.com/paritytech/capi-old copyright Parity Technologies (APACHE License 2.0)
 * Changes August 19th 2023 :
 * - updated to use subshape for scale decoding
 * - adapted from deno to typescript
 *
   Copyright 2023 Parity Technologies

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */
import * as $ from "@talismn/subshape-fork"

export type Era =
  | { type: "Immortal" }
  | {
      type: "Mortal"
      period: bigint
      phase: bigint
    }

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Era {
  export const Immortal: Era = { type: "Immortal" }
  export function Mortal(period: bigint, current: bigint): Era {
    const adjustedPeriod = minN(maxN(nextPowerOfTwo(period), 4n), 1n << 16n)
    const phase = current % adjustedPeriod
    const quantizeFactor = maxN(adjustedPeriod >> 12n, 1n)
    const quantizedPhase = (phase / quantizeFactor) * quantizeFactor
    return { type: "Mortal", period: adjustedPeriod, phase: quantizedPhase }
  }
}

export const $era: $.Shape<Era> = $.createShape({
  metadata: $.metadata("$era"),
  staticSize: 2,
  subEncode(buffer, value) {
    if (value.type === "Immortal") {
      buffer.array[buffer.index++] = 0
    } else {
      const quantizeFactor = maxN(value.period >> 12n, 1n)
      const encoded =
        minN(maxN(trailingZeroes(value.period) - 1n, 1n), 15n) |
        ((value.phase / quantizeFactor) << 4n)
      $.u16.subEncode(buffer, Number(encoded))
    }
  },
  subDecode(buffer) {
    if (buffer.array[buffer.index] === 0) {
      buffer.index++
      return { type: "Immortal" }
    } else {
      const encoded = BigInt($.u16.subDecode(buffer))
      const period = 2n << encoded % (1n << 4n)
      const quantizeFactor = maxN(period >> 12n, 1n)
      const phase = (encoded >> 4n) * quantizeFactor
      if (period >= 4n && phase <= period) {
        return { type: "Mortal", period, phase }
      } else {
        throw new Error("Invalid period and phase")
      }
    }
  },
  subAssert: $.taggedUnion("type", [
    $.variant("Immortal"),
    $.variant("Mortal", $.field("period", $.u64), $.field("phase", $.u64)),
  ]).subAssert,
})

function maxN(a: bigint, b: bigint) {
  return a > b ? a : b
}

function minN(a: bigint, b: bigint) {
  return a < b ? a : b
}

function trailingZeroes(n: bigint) {
  let i = 0n
  while (!(n & 1n)) {
    i++
    n >>= 1n
  }
  return i
}

function nextPowerOfTwo(n: bigint) {
  n--
  let p = 1n
  while (n > 0n) {
    p <<= 1n
    n >>= 1n
  }
  return p
}
