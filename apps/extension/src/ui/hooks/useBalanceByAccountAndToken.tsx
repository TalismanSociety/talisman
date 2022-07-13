import { Balance } from "@core/domains/balances/types"
import { TokenId } from "@core/domains/tokens/types"
import useBalances from "@ui/hooks/useBalances"
import { useCallback, useEffect, useState } from "react"

export type TProps = {
  tokenId?: TokenId
  address?: string
}

export type TResponse = {
  balance?: Balance

  tokenId?: TokenId
  address?: string
  setToken: (tokenId?: TokenId) => void
  setAddress: (address: string) => void
}

const useBalanceByAccountAndToken = (props: TProps): TResponse => {
  const balances = useBalances()
  const [balance, setBalance] = useState<Balance | undefined>()

  const [tokenId, setTokenId] = useState<string | undefined>(props?.tokenId)
  const [address, setAddress] = useState<string | undefined>(props?.address)

  const setToken = useCallback((tokenId?: TokenId) => {
    setTokenId(tokenId)
  }, [])

  useEffect(() => {
    if (!!tokenId && !!address) {
      const found = [...(balances?.find({ address, tokenId }) || [])]
      const balance = found.length > 0 ? found[0] : null

      setBalance(balance || undefined)
    }
  }, [tokenId, address, balances])

  return { balance, tokenId, address, setToken, setAddress }
}

export default useBalanceByAccountAndToken
