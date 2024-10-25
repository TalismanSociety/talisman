import { FC, useMemo } from "react"
import { Navigate, useSearchParams } from "react-router-dom"

export const NavigateWithQuery: FC<{ url: string; replace?: boolean }> = ({ url, replace }) => {
  const [searchParams] = useSearchParams()

  const to = useMemo(
    () => (searchParams.size ? `${url}?${searchParams}` : url),
    [url, searchParams],
  )

  return <Navigate to={to} replace={replace} />
}
