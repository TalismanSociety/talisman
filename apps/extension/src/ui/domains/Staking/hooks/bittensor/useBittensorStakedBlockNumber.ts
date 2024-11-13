import { useLocalStorage } from "react-use"

type AccountStakeData = {
  [delegator: string | number]: number
}

type StoredData = {
  [account: string]: AccountStakeData
}

export const useBittensorStakedBlockNumber = () => {
  const [storedValue, setStoredValue] = useLocalStorage<StoredData | null>("initialValue", null)

  // Method to get data by account and delegator
  const getByAccountAndDelegator = ({
    account,
    delegator,
  }: {
    account: string | undefined | null
    delegator: string | number | undefined | null
  }): number | undefined => {
    if (!account || !delegator) return
    return storedValue?.[account]?.[delegator]
  }

  // Method to set data by account and delegator
  const setByAccountAndDelegator = ({
    account,
    delegator,
    blockNumber,
  }: {
    account: string | undefined | null
    delegator: string | number | undefined | null
    blockNumber: number
  }) => {
    if (!account || !delegator || !blockNumber) return
    setStoredValue((prev) => {
      const updated = { ...prev }
      if (!updated[account]) {
        updated[account] = {} as AccountStakeData
      }
      updated[account][delegator] = blockNumber
      return updated
    })
  }

  return { getByAccountAndDelegator, setByAccountAndDelegator, storedValue }
}
