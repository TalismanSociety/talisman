import { useCallback, useMemo } from "react"
import { useLocalStorage } from "react-use"

import TestBasics from "./TestBasics.json"
import TestERC20 from "./TestERC20.json"
import TestERC721 from "./TestERC721.json"

export type PgContractType = "TestBasics" | "TestERC20" | "TestERC721"

type DeploymentsDb = Record<PgContractType, Record<number, `0x${string}`>>

// TODO: Fill in the addresses on common networks
const DEFAULT_DEPLOYMENTS: DeploymentsDb = {
  TestBasics: {
    1287: "0xE364F52f0C8016c59e500077f9dc32c1eDBBC189",
    10: "0xa70254484A7C1AD788413bb9814728bD9F297337",
    8453: "0xeC74e245117407481F03bc661A8d71012f4fB7dA",
  },
  TestERC20: {},
  TestERC721: {},
}

const getContract = (contract: PgContractType) => {
  switch (contract) {
    case "TestBasics":
      return TestBasics
    case "TestERC20":
      return TestERC20
    case "TestERC721":
      return TestERC721
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
