import HeaderBlock from "@talisman/components/HeaderBlock"
import Layout from "@ui/apps/dashboard/layout"
import { useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { NetworkForm } from "@ui/domains/Ethereum/Networks/NetworkForm"

export const NetworkEdit = () => {
  const navigate = useNavigate()
  const { id: evmNetworkId } = useParams<"id">()

  const handleSubmitted = useCallback(() => {
    navigate("/networks")
  }, [navigate])

  return (
    <Layout withBack centered>
      <HeaderBlock
        title={`${evmNetworkId ? "Edit" : "Add"} EVM Network`}
        text="Only ever add custom EVM compatible networks you trust."
      />
      <NetworkForm evmNetworkId={evmNetworkId} onSubmitted={handleSubmitted} />
    </Layout>
  )
}
