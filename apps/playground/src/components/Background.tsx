import { ReactNode } from "react"
import { Button, MysticalBackground } from "talisman-ui"
import { IconArrowRight } from "../icons"
import { TestLayout } from "./TestLayout"

export const Background = () => {
  return (
    <TestLayout title="Mystical Background">
      <div className="border-body-disabled relative block h-[70vh] max-w-screen-lg border">
        <MysticalBackground />
      </div>
    </TestLayout>
  )
}
