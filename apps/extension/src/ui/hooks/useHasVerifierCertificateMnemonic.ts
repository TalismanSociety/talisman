import { useAppState } from "@ui/state/app"
import { useMnemonic } from "@ui/state/mnemonics"

export const useHasVerifierCertificateMnemonic = () => {
  const [verifierCertificateMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")
  const mnemonic = useMnemonic(verifierCertificateMnemonicId || undefined)
  return !!mnemonic
}
