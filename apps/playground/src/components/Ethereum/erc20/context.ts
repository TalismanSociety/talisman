import { useLocalStorage } from "react-use"
import { useNetwork } from "wagmi"

import { provideContext } from "../../../common/provideContext"

const useErc20ContractProvider = () => {
  const { chain } = useNetwork()
  const [address, setAddress] = useLocalStorage(`pg:erc20-contract-${chain?.id}`, "")
  return [address, setAddress] as const
}

export const [Erc20ContractProvider, useErc20Contract] = provideContext(useErc20ContractProvider)
