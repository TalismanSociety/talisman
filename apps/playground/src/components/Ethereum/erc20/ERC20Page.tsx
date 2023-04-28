import { EthereumLayout } from "../shared/EthereumLayout"
import { Erc20ContractProvider } from "./context"
import { ERC20ContractSelect } from "./ERC20ContractSelect"
import { ERC20Send } from "./ERC20Send"

export const ERC20Page = () => {
  return (
    <EthereumLayout title="ERC20 tokens">
      <Erc20ContractProvider>
        <ERC20ContractSelect />
        <ERC20Send />
      </Erc20ContractProvider>
    </EthereumLayout>
  )
}
