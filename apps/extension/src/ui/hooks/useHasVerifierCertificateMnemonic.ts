import { useAppState } from "@ui/state"

import { useMnemonic } from "./useMnemonics"

export const useHasVerifierCertificateMnemonic = () => {
  const [verifierCertificateMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")
  const mnemonic = useMnemonic(verifierCertificateMnemonicId || undefined)
  return !!mnemonic
}
