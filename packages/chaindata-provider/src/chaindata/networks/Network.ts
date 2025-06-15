import z from "zod/v4"

import { DotNetworkSchema } from "./DotNetwork"
import { EthNetworkSchema } from "./EthNetwork"

export const NetworkSchema = z.discriminatedUnion("platform", [DotNetworkSchema, EthNetworkSchema])

export type Network = z.infer<typeof NetworkSchema>

export type NetworkId = Network["id"]

export type NetworkPlatform = Network["platform"]
