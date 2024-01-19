import { Spacer } from "@talisman/components/Spacer"
import { balancesHydrateState } from "@ui/atoms"
import { useRecoilPreload } from "@ui/hooks/useRecoilPreload"

import { AccountAddPageProps } from "../types"
import { JsonAccountImportProvider } from "./context"
import { ImportJsonAccountsForm } from "./ImportJsonAccountsForm"
import { ImportJsonFileDrop } from "./ImportJsonFileDrop"
import { UnlockJsonFileForm } from "./UnlockJsonFileForm"

export const AccountAddJson = ({ onSuccess }: AccountAddPageProps) => {
  useRecoilPreload(balancesHydrateState)

  return (
    <JsonAccountImportProvider>
      <ImportJsonFileDrop />
      <Spacer />
      <UnlockJsonFileForm />
      <ImportJsonAccountsForm onSuccess={onSuccess} />
    </JsonAccountImportProvider>
  )
}
