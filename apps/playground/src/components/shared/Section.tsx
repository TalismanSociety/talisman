import { ReactNode } from "react"

export const Section = ({ title, children }: { title?: ReactNode; children?: ReactNode }) => (
  <div className="my-24">
    <div className=" space-y-8">
      <div className="text-lg">{title}</div>
      {children && <div className="">{children}</div>}
    </div>
  </div>
)
