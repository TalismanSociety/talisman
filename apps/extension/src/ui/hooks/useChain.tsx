import { useState, useEffect } from "react"
import type { Chain, ChainId } from "@core/types"
import { api } from "@ui/api"

const useChain = (id?: ChainId) => {
  const [chain, setChain] = useState<Chain>()

  useEffect(() => {
    if (!id) return
    api.chain(id).then(setChain)
  }, [id])

  return chain
}

export default useChain
