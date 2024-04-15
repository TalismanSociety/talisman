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

export interface MapLike<K, V> {
  set(key: K, value: V): void
  get(key: K): undefined | V
}

export function getOrInit<K, V>(container: MapLike<K, V>, key: K, init: () => V): V {
  let value = container.get(key)
  if (value === undefined) {
    value = init()
    container.set(key, value)
  }
  return value
}

// export class WeakRefMap<K, V extends object> {
//   map = new Map<K, WeakRef<V>>()
//   finReg = new FinalizationRegistry<K>((key) => this.map.delete(key))
//   get(key: K) {
//     return this.map.get(key)?.deref()
//   }
//   set(key: K, value: V) {
//     this.map.set(key, new WeakRef(value))
//     this.finReg.register(value, key, value)
//   }
//   delete(key: K) {
//     const value = this.get(key)
//     if (!value) return false
//     this.map.delete(key)
//     this.finReg.unregister(value)
//     return true
//   }
// }
