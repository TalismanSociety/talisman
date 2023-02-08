import { ReactNode } from "react"
import styled from "styled-components"

import { styleOnboardTranslucidBackground } from "./OnboardStyles"

const Container = styled.div`
  ${styleOnboardTranslucidBackground}
  padding: 4.8rem;
  border-radius: 1.6rem;
  text-align: left;
`

type OnboardDialogProps = {
  title: string
  children: ReactNode
  className?: string
}

export const OnboardDialog = ({ title, children, className }: OnboardDialogProps) => (
  <Container className={className}>
    <div className="text-xl text-white">{title}</div>
    <div className="text-body-secondary mt-16">{children}</div>
  </Container>
)
