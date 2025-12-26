// import { ArrowDownIcon } from "@talismn/icons"
// import { classNames } from "@talismn/util"
// import { FC } from "react"
// import { useTranslation } from "react-i18next"

// interface WithdrawPillButtonProps {
//   onClick: () => void
//   className?: string
// }

// export const WithdrawPillButton: FC<WithdrawPillButtonProps> = ({ onClick, className }) => {
//   const { t } = useTranslation()

//   return (
//     <button
//       className={classNames(
//         "h-16 rounded-[28px] bg-[#D5FF5C]/10 px-4 text-sm font-light text-[#D5FF5C] hover:bg-[#D5FF5C]/20",
//         className,
//       )}
//       type="button"
//       onClick={onClick}
//     >
//       <div className="flex items-center gap-2">
//         <ArrowDownIcon className="shrink-0 text-base" />
//         <div>{t("Withdraw")}</div>
//       </div>
//     </button>
//   )
// }
