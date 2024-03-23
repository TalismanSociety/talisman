import { useLocalStorage } from "react-use"
import { useAccount } from "wagmi"

import { provideContext } from "../../../common/provideContext"

const useErc721ContractProvider = () => {
  const { chain } = useAccount()
  const [address, setAddress] = useLocalStorage(`pg:erc721-contract-${chain?.id}`, "")
  return [address, setAddress] as const
}

export const [Erc721ContractProvider, useErc721Contract] = provideContext(useErc721ContractProvider)
