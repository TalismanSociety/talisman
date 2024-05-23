import { Nft, NftCollection } from "extension-core"
import { FC } from "react"
import { Modal } from "talisman-ui"

// import { NftImage } from "./NftImage"
// import { classNames } from "@talismn/util"

// const DialogContent: FC<{ onDismiss: () => void; collection: NftCollection; nft: Nft }> = ({
//   onDismiss,
//   collection,
//   nft,
// }) => {
//   return (
//     <div
//       className={classNames(
//         "h-[80rem] max-h-[100dvh] w-[60rem] max-w-[100dvw]",
//         "flex flex-col overflow-hidden"
//       )}
//     >
//       <div className="p-8">
//         <NftImage />
//       </div>
//       <div></div>
//     </div>
//   )
// }

export const NftDialog: FC<{
  isOpen?: boolean
  onDismiss: () => void
  collection: NftCollection
  nft: Nft
}> = ({ isOpen, onDismiss }) => {
  // const { open: openBuyTokensModal } = useBuyTokensModal()

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss}>
      <div></div>
      {/* <DialogContent /> */}
    </Modal>
  )
}
