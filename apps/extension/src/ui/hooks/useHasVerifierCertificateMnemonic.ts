import { useAppState, useMnemonic } from "@ui/state"

export const useHasVerifierCertificateMnemonic = () => {
  const [verifierCertificateMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")
  const mnemonic = useMnemonic(verifierCertificateMnemonicId || undefined)
  return !!mnemonic
}
