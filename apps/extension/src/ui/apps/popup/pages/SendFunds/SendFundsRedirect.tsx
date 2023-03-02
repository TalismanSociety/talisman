import { Navigate, useSearchParams } from "react-router-dom"

const getTargetPage = (from: string | null, tokenId: string | null) => {
  if (tokenId && from) return "to"
  if (tokenId) return "from"
  return "token"
}

export const SendFundsRedirect = () => {
  const [searchParams] = useSearchParams()

  const page = getTargetPage(searchParams.get("from"), searchParams.get("tokenId"))

  return <Navigate to={`/send/${page}?${searchParams.toString()}`} replace />
}
