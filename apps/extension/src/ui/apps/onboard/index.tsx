import { MysticalBackground } from "talisman-ui"
import Context from "./context"
import OnboardingRoutes from "./routes"

const Onboarding = () => {
  return (
    <Context>
      <MysticalBackground className="fixed top-0 left-0 h-[100vh] w-[100vw]" />
      <OnboardingRoutes />
    </Context>
  )
}
export default Onboarding
