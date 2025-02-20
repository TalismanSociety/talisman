import { useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

export const useNavigateWithQuery = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return useCallback(
    (url: string, replace?: boolean) => {
      const to = searchParams.size ? `${url}?${searchParams}` : url
      navigate(to, { replace })
    },
    [navigate, searchParams],
  )
}
