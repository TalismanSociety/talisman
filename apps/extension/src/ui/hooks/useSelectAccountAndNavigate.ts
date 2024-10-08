import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

// TODO remove
export const useSelectAccountAndNavigate = (url: string) => {
  const navigate = useNavigate()

  const setAddress = useCallback(
    (address: string) => {
      const searchParams = new URLSearchParams({
        account: address,
      })
      navigate(`${url}?${searchParams}`)
    },
    [navigate, url]
  )

  return { setAddress }
}
