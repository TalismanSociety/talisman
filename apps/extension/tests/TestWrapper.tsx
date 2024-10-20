import { Subscribe } from "@react-rxjs/core"
import React from "react"

export const TestWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <React.Suspense fallback={<div>loading children</div>}>
      <Subscribe>{children}</Subscribe>
    </React.Suspense>
  )
}
