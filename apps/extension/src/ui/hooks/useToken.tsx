import { useState, useEffect } from "react"
import type { Token, TokenId } from "@core/types"
import { api } from "@ui/api"

const useToken = (id?: TokenId) => {
  const [token, setToken] = useState<Token>()

  useEffect(() => {
    if (!id) return
    api.token(id).then(setToken)
  }, [id])

  return token
}

export default useToken
