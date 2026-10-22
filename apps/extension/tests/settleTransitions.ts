import { act } from "@testing-library/react"

const nextAnimationFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

export const settleTransitions = async () => {
  while (document.querySelector("[data-transition]")) await act(nextAnimationFrame)
}
