import { classNames } from "@talismn/util"
import { ReactNode } from "react"
import styled from "styled-components"

import { styleOnboardTranslucidBackground } from "./OnboardStyles"

const Container = styled.div`
  ${styleOnboardTranslucidBackground}
`

type OnboardDialogProps = {
  title: string
  children: ReactNode
  className?: string
  stage?: number
  stages?: number
}

export const OnboardDialog = ({
  title,
  children,
  className,
  stage,
  stages = 3,
}: OnboardDialogProps) => (
  <div className="flex w-[60rem] flex-col items-center gap-12">
    <Container className={classNames(className, "rounded-lg p-24 text-left")}>
      <div className="text-xl text-white">{title}</div>
      <div className="text-body-secondary mt-16">{children}</div>
    </Container>
    {stages > 1 && <OnboardProgressBar stage={stage} stages={stages} />}
  </div>
)

const OnboardProgressBar = ({ stage, stages = 3 }: { stage?: number; stages?: number }) => (
  <div className="flex w-[24rem] justify-center gap-8">
    {Array.from({ length: stages }).map((_, i) => (
      <div
        key={i}
        className={`h-2 w-36 rounded-lg bg-white ${stage !== i + 1 && "bg-opacity-5"}`}
      />
    ))}
  </div>
)
