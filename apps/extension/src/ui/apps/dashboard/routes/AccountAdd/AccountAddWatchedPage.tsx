import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AccountAddWatchedForm } from "@ui/domains/Account/AccountAdd/AccountAddWatchedForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardAdminLayout } from "../../layout/DashboardAdminLayout"

export const AccountAddWatchedPage = () => {
  const { t } = useTranslation("admin")
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  // const navigate = useNavigate()
  // const handleSuccess = useCallback(
  //   (address: string) => {
  //     const searchParams = new URLSearchParams({
  //       account: address,
  //     })
  //     navigate(`/portfolio?${searchParams}`)
  //   },
  //   [navigate]
  // )

  return (
    <DashboardAdminLayout withBack centered>
      <HeaderBlock
        title={t("Choose account type")}
        text={t("What type of account would you like to add?")}
      />
      <Spacer />
      <AccountAddWatchedForm onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
