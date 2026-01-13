import { type FC, type ReactNode, useEffect, useRef } from "react"

export const RampsFieldSet: FC<{ label: ReactNode; extra?: ReactNode; children: ReactNode }> = ({
  label,
  extra,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  return (
    <div ref={ref} className="space-y-6 rounded border-0 bg-grey-900 p-6">
      <div className="flex justify-between text-sm leading-paragraph">
        <div className="text-body">{label}</div>
        <div>{extra}</div>
      </div>
      <div>{children}</div>
    </div>
  )
}
