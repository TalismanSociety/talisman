import { FC } from "react"

import { Layout, LayoutProps } from "../../shared/Layout"
import { Network } from "../Network"
import { useApi } from "../useApi"
import { SubstrateAccounts } from "./SubstrateAccounts"

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
