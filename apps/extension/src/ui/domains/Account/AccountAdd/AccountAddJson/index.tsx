import { Spacer } from "@talisman/components/Spacer"
import { useBalancesHydrate } from "@ui/state"

import { AccountAddPageProps } from "../types"
import { JsonAccountImportProvider } from "./context"
import { ImportJsonAccountsForm } from "./ImportJsonAccountsForm"
import { ImportJsonFileDrop } from "./ImportJsonFileDrop"
import { UnlockJsonFileForm } from "./UnlockJsonFileForm"

export const AccountAddJson = ({ onSuccess }: AccountAddPageProps) => {
  useBalancesHydrate() // preload

  return (
    <JsonAccountImportProvider>
      <ImportJsonFileDrop />
      <Spacer />
      <UnlockJsonFileForm />
      <ImportJsonAccountsForm onSuccess={onSuccess} />
    </JsonAccountImportProvider>
  )
}
