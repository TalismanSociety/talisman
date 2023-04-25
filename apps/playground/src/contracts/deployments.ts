import { useCallback, useMemo } from "react"
import { useLocalStorage } from "react-use"

import TestBasics from "./TestBasics.json"
import TestERC20 from "./TestERC20.json"
import Test721 from "./TestERC721.json"

export type PgContractType = "TestBasics" | "TestERC20" | "Test721"

type DeploymentsDb = Record<PgContractType, Record<number, `0x${string}`>>

// TODO: Fill in the addresses on common networks
const DEFAULT_DEPLOYMENTS: DeploymentsDb = {
  TestBasics: {
    1287: "0xE364F52f0C8016c59e500077f9dc32c1eDBBC189",
  },
  TestERC20: {},
  Test721: {},
}

const getContract = (contract: PgContractType) => {
  switch (contract) {
    case "TestBasics":
      return TestBasics
    case "TestERC20":
      return TestERC20
    case "Test721":
      return Test721
  }
}

export const useDeployment = (contract: PgContractType, chainId?: number) => {
  const [deployments = DEFAULT_DEPLOYMENTS, setDeployments] = useLocalStorage(
    "pg:deployments",
    DEFAULT_DEPLOYMENTS
  )

  const setAddress = useCallback(
    (address: `0x${string}`) => {
      if (!chainId) throw new Error("No chainId")
      setDeployments((prev) => {
        const newVal = structuredClone(prev ?? DEFAULT_DEPLOYMENTS)
        newVal[contract][chainId] = address
        return newVal
      })
    },
    [chainId, contract, setDeployments]
  )

  const forgetAddress = useCallback(() => {
    if (!chainId) throw new Error("No chainId")
    setDeployments((prev) => {
      const newVal = structuredClone(prev ?? DEFAULT_DEPLOYMENTS)
      delete newVal[contract][chainId]
      return newVal
    })
  }, [chainId, contract, setDeployments])

  const address = useMemo(
    () => (chainId ? deployments[contract][chainId] : undefined),
    [chainId, contract, deployments]
  )

  const { abi, bytecode } = useMemo(() => getContract(contract), [contract])

  return { address, setAddress, abi, bytecode, forgetAddress } as const
}
