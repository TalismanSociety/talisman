import z from "zod/v4"

import { DotNetworkDef } from "./DotNetwork"
import { EthNetworkDef } from "./EthNetwork"

export const NetworkDef = z.union([DotNetworkDef, EthNetworkDef])

export type Network = z.infer<typeof NetworkDef>

export type NetworkId = Network["id"]
