import { FC, ReactNode, useEffect, useRef } from "react"

export const RampsFieldSet: FC<{ label: ReactNode; children: ReactNode }> = ({
  label,
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
      <div className="text-body leading-paragraph text-sm">{label}</div>
      <div>{children}</div>
    </div>
  )
}
