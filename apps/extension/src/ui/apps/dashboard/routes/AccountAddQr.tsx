import { QrScanAddress } from "@polkadot/react-qr"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { decodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { useEffect, useState } from "react"

export const AccountAddQr = () => {
  const [scanned, setScanned] = useState<{
    content: string
    genesisHash: string
    isAddress: boolean
  }>()
  const [error, setError] = useState<string>()

  const [account, setAccount] = useState<{ type: string; address: string; genesisHash: string }>()
  useEffect(() => {
    if (!scanned) return
    if (!scanned.isAddress) return setError("invalid qr code")

    const { content: address, genesisHash } = scanned
    if (decodeAnyAddress(address).byteLength !== 32) return setError("invalid address length")
    if (!genesisHash.startsWith("0x")) return setError("invalid genesisHash")

    {
      ;(async () => {
        const addAccountReq = { type: "substrate", address, genesisHash }
        await api.accountCreateQr(
          "My Parity Signer Account",
          addAccountReq.address,
          addAccountReq.genesisHash
        )
        setAccount(addAccountReq)
      })()
    }
  }, [scanned])

  return (
    <Layout withBack centered>
      <HeaderBlock title="Import Parity Signer" />
      <QrScanAddress onScan={(scanned) => setScanned(scanned)} size={200} />
      {account && <div>Account {account.address} added</div>}
      {error && <div>{error}</div>}
    </Layout>
  )
}
