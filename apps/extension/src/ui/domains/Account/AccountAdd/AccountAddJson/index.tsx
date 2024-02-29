import { Spacer } from "@talisman/components/Spacer"
import { balancesHydrateAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

import { AccountAddPageProps } from "../types"
import { JsonAccountImportProvider } from "./context"
import { ImportJsonAccountsForm } from "./ImportJsonAccountsForm"
import { ImportJsonFileDrop } from "./ImportJsonFileDrop"
import { UnlockJsonFileForm } from "./UnlockJsonFileForm"

export const AccountAddJson = ({ onSuccess }: AccountAddPageProps) => {
  useAtomValue(balancesHydrateAtom)

  return (
    <JsonAccountImportProvider>
      <ImportJsonFileDrop />
      <Spacer />
      <UnlockJsonFileForm />
      <ImportJsonAccountsForm onSuccess={onSuccess} />
    </JsonAccountImportProvider>
  )
}
