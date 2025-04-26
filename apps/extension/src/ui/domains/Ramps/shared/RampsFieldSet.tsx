import { FC, ReactNode, useEffect, useRef } from "react"

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
    <div ref={ref} className="bg-grey-900 space-y-6 rounded border-0 p-6">
      <div className="leading-paragraph flex justify-between text-sm">
        <div className="text-body">{label}</div>
        <div>{extra}</div>
      </div>
      <div>{children}</div>
    </div>
  )
}
