import { CopyAddressLayout } from "./CopyAddressLayout"

export const CopyAddressMainForm = () => {
  return (
    <CopyAddressLayout title="Receive funds">
      <div>Accpicker</div>
      <div>qr</div>
      {/* ethereum text */}
      {/* substrate text */}
      {/* raw text */}
      <div>
        Only use this address for receiving tokens on <span>Polkadot Relay Chain</span>
      </div>
    </CopyAddressLayout>
  )
}
