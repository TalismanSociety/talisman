// import { FC } from "react"
// import { useTranslation } from "react-i18next"

// import { useClaim } from "../useClaim"

// export const ValidationErrors: FC = () => {
//   const { t } = useTranslation()
//   const { error, isValid, isLoading } = useClaim()

//   if (isLoading) return null
//   if (isValid) return null
//   if (!error) return null

//   return (
//     <div className="text-alert-error text-center text-sm">
//       {error.message || t("Transaction validation failed")}
//     </div>
//   )
// }
