import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { DepositAmountForm } from "@ui/domains/Earn/components/DepositAmountForm"

export const DepositAmount = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleClose = () => {
    // Navigate back to product selection with preserved tokenId
    const tokenId = searchParams.get("tokenId")
    if (tokenId) {
      navigate(`/earn?tokenId=${tokenId}`, { replace: true })
    } else {
      navigate("/earn", { replace: true })
    }
  }

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold text-white">{t("Deposit")}</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>
      <div className="w-full grow overflow-hidden">
        <DepositAmountForm />
      </div>
    </div>
  )
}
