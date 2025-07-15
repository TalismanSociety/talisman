import z from "zod/v4"

import { DotNetworkSchema } from "./DotNetwork"
import { EthNetworkSchema } from "./EthNetwork"
import { SolNetworkSchema } from "./SolNetwork"

export const NetworkSchema = z.discriminatedUnion("platform", [
  DotNetworkSchema,
  EthNetworkSchema,
  SolNetworkSchema,
])

export type Network = z.infer<typeof NetworkSchema>

export type NetworkId = Network["id"]

export type NetworkPlatform = Network["platform"]

export type NetworkList = Record<NetworkId, Network>
