import { api } from "@ui/api"
import { NftData } from "extension-core"
import { useEffect, useState } from "react"

import { NetworkPicker } from "../NetworkPicker"

const useNfts = () => {
  const [nfts, setNfts] = useState<NftData>()

  useEffect(() => {
    const unsubscribe = api.nftsSubscribe(setNfts)

    return () => {
      unsubscribe()
    }
  }, [])

  return nfts
}

export const DashboardNfts = () => {
  const nfts = useNfts()

  // useEffect(() => {
  //   console.log("DashboardNfts", { nfts })
  // }, [nfts])

  return (
    <div>
      <NetworkPicker />
      <div>{nfts ? JSON.stringify(nfts, null, 2) : "loading"}</div>
    </div>
  )
}
