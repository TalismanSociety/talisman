/* eslint-disable @typescript-eslint/no-non-null-assertion */

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

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as $ from "@talismn/subshape-fork"

import { Ty } from "../raw/Ty"
import { ChainError } from "./ChainError"
import { $era } from "./Era"

const isResult = new $.ShapeVisitor<boolean>()
  .add($.result<any, any, any, any>, () => true)
  .fallback(() => false)

const isOption = new $.ShapeVisitor<boolean>()
  .add($.option<any, any>, () => true)
  .fallback(() => false)

export const overrides: Record<string, (ty: Ty, visit: (i: number) => $.AnyShape) => $.AnyShape> = {
  "Option": (ty, visit) => {
    let $some = visit(ty.params[0]!.ty!)
    if (isOption.visit($some)) {
      $some = $.tuple($some)
    }
    return $.option($some)
  },
  "Result": (ty, visit) => {
    let $ok = visit(ty.params[0]!.ty!)
    if (isResult.visit($ok)) {
      $ok = $.tuple($ok)
    }
    return $.result(
      $ok,
      $.instance(ChainError, $.tuple(visit(ty.params[1]!.ty!)), ChainError.toArgs)
    )
  },
  "BTreeMap": (ty, visit) => {
    return $.map(visit(ty.params[0]!.ty!) as any, visit(ty.params[1]!.ty!))
  },
  "BTreeSet": (ty, visit) => {
    return $.set(visit(ty.params[0]!.ty!) as any)
  },
  "frame_support::traits::misc::WrapperOpaque": (ty, visit) => {
    return $.lenPrefixed(visit(ty.params[0]!.ty!))
  },
  "frame_support::traits::misc::WrapperKeepOpaque": (ty, visit) => {
    return $.lenPrefixed(visit(ty.params[0]!.ty!))
  },
  "sp_runtime::generic::era::Era": () => {
    return $era
  },
}
