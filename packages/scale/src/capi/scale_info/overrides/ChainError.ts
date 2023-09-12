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

export class ChainError<T> extends Error {
  override readonly name = "ChainError"
  constructor(public value: T) {
    super()
    this.stack = "ChainError: see error.value\n  [error occurred on chain]"
  }

  static toArgs = <T>(x: ChainError<T>): [T] => [x.value]
}
