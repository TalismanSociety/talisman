import { FC } from "react"

import { Layout, LayoutProps } from "../../shared/Layout"
import { Network } from "./Network"
import { SubstrateAccounts } from "./SubstrateAccounts"
import { useApi } from "./useApi"

export const SubstrateLayout: FC<LayoutProps> = ({ title, children }) => {
  const { api } = useApi()
  return (
    <Layout title={title}>
      <Network />
      <SubstrateAccounts />
      {!!api && <div>{children}</div>}
    </Layout>
  )
}
