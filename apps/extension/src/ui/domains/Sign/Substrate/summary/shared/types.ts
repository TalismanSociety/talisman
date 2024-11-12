import { FC } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

export type SummaryComponent<T> = FC<{ decodedCall: DecodedCall<T>; sapi: ScaleApi }>

export type SummaryComponentDef<T> = [string, string, SummaryComponent<T>]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SummaryComponentDefs = SummaryComponentDef<any>[]
