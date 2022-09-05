import { Box } from "@talisman/components/Box"
import { ReactNode } from "react"
import styled from "styled-components"

const Container = styled.div`
  background: rgba(var(--color-foreground-raw), 0.05);
  backdrop-filter: blur(4.8rem);
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
    <Box fontsize="xlarge" fg="foreground">
      {title}
    </Box>
    <Box fg="mid" margin="3.2rem 0 0">
      {children}
    </Box>
  </Container>
)
