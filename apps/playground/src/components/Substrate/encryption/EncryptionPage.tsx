import { SubstrateLayout } from "../shared/SubstrateLayout"
import { EncryptDecrypt } from "./EncryptDecrypt"

export const EncryptionPage = () => {
  return (
    <SubstrateLayout title="Encryption (Sumi)">
      <EncryptDecrypt />
    </SubstrateLayout>
  )
}
