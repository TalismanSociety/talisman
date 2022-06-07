import { ReactNode } from "react"
import styled from "styled-components"

const StatisticsContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: var(--color-background-muted);
  border-radius: var(--border-radius);
  padding: 1.6rem;
  min-width: 23.6rem;
  gap: 0.8rem;
`

const Title = styled.div`
  color: var(--color-mid);
  font-size: 1.4rem;
`

const Children = styled.div`
  color: var(--color-foreground);
  font-size: 1.8rem;
`

type StatisticsProps = { title: ReactNode; children: ReactNode }

export const Statistics = ({ title, children }: StatisticsProps) => {
  return (
    <StatisticsContainer>
      <Title>{title}</Title>
      <Children>{children}</Children>
    </StatisticsContainer>
  )
}
