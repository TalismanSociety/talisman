import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { OnboardLayout } from "@ui/apps/onboard/OnboardLayout"
import { FC } from "react"

export const AccountAddWrapper: FC<{
  title?: string
  subtitle?: string
  className?: string
  render: (onSuccess: (address: string) => void) => JSX.Element
}> = ({ title, subtitle, className, render }) => {
  const { setOnboarded } = useOnboard()

  return (
    <OnboardLayout withBack className={className}>
      <OnboardDialog className="w-[68rem]" title={title}>
        {subtitle && <p className="text-body-secondary mb-8 text-base">{subtitle}</p>}
        {render(setOnboarded)}
      </OnboardDialog>
    </OnboardLayout>
  )
}
