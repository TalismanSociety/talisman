import { Navigate, Route, Routes } from "react-router-dom"
import { WagmiConfig } from "wagmi"

import { ContractPage } from "./contract/ContractPage"
import { ERC20Page } from "./erc20/ERC20Page"
import { NavUI } from "./NavUI"
import { wagmiClient } from "./shared/connectors"
import { SignPage } from "./sign/SignPage"
import { TransferPage } from "./transaction/TransferPage"

export const Ethereum = () => {
  return (
    <WagmiConfig client={wagmiClient}>
      <NavUI />
      <Routes>
        <Route path="transaction" element={<TransferPage />} />
        <Route path="contract" element={<ContractPage />} />
        <Route path="erc20" element={<ERC20Page />} />
        <Route path="sign" element={<SignPage />} />
        <Route path="*" element={<Navigate to="transaction" />} />
      </Routes>
    </WagmiConfig>
  )
}
