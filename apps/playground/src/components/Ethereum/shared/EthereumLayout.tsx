import { FC } from "react"
import { useAccount } from "wagmi"

import { Layout, LayoutProps } from "../../shared/Layout"
import { Connect } from "./Connect"

export const EthereumLayout: FC<LayoutProps> = ({ title, children }) => {
  const { isConnected } = useAccount()

  return (
    <Layout title={title}>
      <Connect />
      {isConnected && <div>{children}</div>}
    </Layout>
  )
}
