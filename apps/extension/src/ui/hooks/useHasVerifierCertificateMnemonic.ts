import { useAppState } from "./useAppState"
import { useMnemonic } from "./useMnemonics"

export const useHasVerifierCertificateMnemonic = () => {
  const [verifierCertificateMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")
  const mnemonic = useMnemonic(verifierCertificateMnemonicId || undefined)
  return !!mnemonic
}
