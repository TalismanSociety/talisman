import { EthereumLayout } from "../shared/EthereumLayout"
import { Erc721ContractProvider } from "./context"
import { ERC721ContractSelect } from "./ERC721ContractSelect"
import { ERC721Send } from "./ERC721Send"

export const ERC721Page = () => {
  return (
    <EthereumLayout title="ERC721 tokens">
      <Erc721ContractProvider>
        <ERC721ContractSelect />
        <ERC721Send />
      </Erc721ContractProvider>
    </EthereumLayout>
  )
}
