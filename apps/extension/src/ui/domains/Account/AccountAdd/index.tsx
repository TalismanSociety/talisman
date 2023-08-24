import { AccountCreateContainer } from "./Container"
import { AccountCreateContextProvider } from "./context"

type Props = {
  className?: string
}

export const AccountCreateMenu = ({ className }: Props) => {
  return (
    <AccountCreateContextProvider>
      <AccountCreateContainer className={className} />
    </AccountCreateContextProvider>
  )
}
