import { AccountCreateContainer } from "./Container"
import { AccountCreateContextProvider } from "./context"

type Props = {
  className?: string
}

export const AccountCreate = ({ className }: Props) => {
  return (
    <AccountCreateContextProvider>
      <AccountCreateContainer className={className} />
    </AccountCreateContextProvider>
  )
}
