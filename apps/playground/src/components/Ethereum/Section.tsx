import { ReactNode } from "react"

export const Section = ({ title, children }: { title?: ReactNode; children?: ReactNode }) => (
  <div
    className=" mt-8 space-y-8 "
    //  className="flex w-full grow flex-col items-center justify-center gap-4 text-center"
  >
    <div className="text-lg">{title}</div>
    {children && <div className="">{children}</div>}
  </div>
)
