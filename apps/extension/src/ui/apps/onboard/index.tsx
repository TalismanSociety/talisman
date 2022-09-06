import styled from "styled-components"

import { MysticalBackground } from "./components/MysticalBackground"
import Context from "./context"
import OnboardingRoutes from "./routes"

// set here so it doesn't rerender on route change
const Background = styled(MysticalBackground)`
  position: fixed;

  // half screen for demo & tests
  top: 25vh;
  left: 25vw;
  width: 50vw;
  height: 50vh;
  border: solid 1px white;

  // full screen
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  border: none;

  z-index: 0;
  filter: blur(8px);
`
const Onboarding = () => {
  return (
    <Context>
      <Background />
      <OnboardingRoutes />
    </Context>
  )
}
export default Onboarding
