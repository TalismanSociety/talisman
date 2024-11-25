import { StorageProvider } from "../../libs/Store"

export type BlockNumberByDelegator = {
  [delegator: string | number]: number
}

export type DelegatorsBlockNumberByAccount = Record<string, BlockNumberByDelegator>

export class BittensorUnbondBlockNumberStore extends StorageProvider<DelegatorsBlockNumberByAccount> {}

export const bittensorUnbondBlockNumberStore = new BittensorUnbondBlockNumberStore(
  "bittensorUnbondBlockNumber",
  {},
)
