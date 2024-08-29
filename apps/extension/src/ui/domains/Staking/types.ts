import { Enum } from "@polkadot-api/substrate-bindings"

export type NomPoolsClaimPermission = Enum<{
  Permissioned: undefined
  PermissionlessCompound: undefined
  PermissionlessWithdraw: undefined
  PermissionlessAll: undefined
}>
