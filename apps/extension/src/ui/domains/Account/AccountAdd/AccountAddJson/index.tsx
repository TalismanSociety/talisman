import { Spacer } from "@talisman/components/Spacer"

import { AccountAddPageProps } from "../types"
import { JsonAccountImportProvider } from "./context"
import { ImportJsonAccountsForm } from "./ImportJsonAccountsForm"
import { ImportJsonFileDrop } from "./ImportJsonFileDrop"
import { UnlockJsonFileForm } from "./UnlockJsonFileForm"

export const AccountAddJson = ({ onSuccess }: AccountAddPageProps) => {
  return (
    <JsonAccountImportProvider>
      <ImportJsonFileDrop />
      <Spacer />
      <UnlockJsonFileForm />
      <ImportJsonAccountsForm onSuccess={onSuccess} />
    </JsonAccountImportProvider>
  )
}
