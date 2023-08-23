import { Spacer } from "@talisman/components/Spacer"

import { JsonAccountImportProvider } from "./context"
import { ImportJsonAccountsForm } from "./ImportJsonAccountsForm"
import { ImportJsonFileDrop } from "./ImportJsonFileDrop"
import { UnlockJsonFileForm } from "./UnlockJsonFileForm"

export const AccountAddJson = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  return (
    <JsonAccountImportProvider>
      <ImportJsonFileDrop />
      <Spacer />
      <UnlockJsonFileForm />
      <ImportJsonAccountsForm onSuccess={onSuccess} />
    </JsonAccountImportProvider>
  )
}
