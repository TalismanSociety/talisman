import type { FC } from "react"

export const SupportOpsCtaButton: FC<{
  title: string
  description: string
  onClick: () => void
}> = ({ title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col gap-4 rounded border border-grey-700 bg-grey-900 p-10 text-left hover:bg-grey-800"
  >
    <div className="font-bold text-md">{title}</div>
    <p className="text-body-secondary">{description}</p>
  </button>
)
