import { MnemonicBackupModalProviderWrapper, useMnemonicBackupModal } from "./context"
import { MnemonicBackupModalRouter } from "./ModalRouter"

const MnemonicBackupModalProvider = ({ children }: { children: React.ReactNode }) => (
  <MnemonicBackupModalProviderWrapper>
    <MnemonicBackupModalRouter />
    {children}
  </MnemonicBackupModalProviderWrapper>
)

export { MnemonicBackupModalProvider, useMnemonicBackupModal }
