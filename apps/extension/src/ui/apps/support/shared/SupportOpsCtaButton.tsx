import { FC } from "react"

export const SupportOpsCtaButton: FC<{
  title: string
  description: string
  onClick: () => void
}> = ({ title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="border-grey-700 bg-grey-900 hover:bg-grey-800 flex flex-col gap-4 rounded border p-10 text-left"
  >
    <div className="text-md font-bold">{title}</div>
    <p className="text-body-secondary">{description}</p>
  </button>
)
