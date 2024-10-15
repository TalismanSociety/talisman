import { sleep } from "@talismn/util"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

export const useSelectAccountAndNavigate = (url: string) => {
  const navigate = useNavigate()

  const setAddress = useCallback(
    async (address: string) => {
      // this method is used to navigate to the portfolio page with a newly created account
      // wait for accounts subscription to be updated on frontend before proceeding or it will flicker
      await sleep(250)

      const searchParams = new URLSearchParams({
        account: address,
      })
      navigate(`${url}?${searchParams}`)
    },
    [navigate, url]
  )

  return { setAddress }
}
