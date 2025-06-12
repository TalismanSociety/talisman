import z from "zod/v4"

import { DotNetworkDef } from "./DotNetwork"
import { EthNetworkDef } from "./EthNetwork"

export const NetworkDef = z.discriminatedUnion("platform", [DotNetworkDef, EthNetworkDef])

export type Network = z.infer<typeof NetworkDef>

export type NetworkId = Network["id"]

export type NetworkPlatform = Network["platform"]
