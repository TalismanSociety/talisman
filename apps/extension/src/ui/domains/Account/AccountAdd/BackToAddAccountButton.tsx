import { ArrowLeftIcon } from "@talismn/icons"
import { Button } from "@ui/talisman-ui"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

import type { MethodType } from "./context"

export const BackToAddAccountButton = ({ methodType }: { methodType?: MethodType }) => {
  const { t } = useTranslation()

  return (
    <NavLink to={`/accounts/add${methodType ? `?methodType=${methodType}` : ""}`}>
      <Button iconLeft={ArrowLeftIcon}>{t("Back")}</Button>
    </NavLink>
  )
}
