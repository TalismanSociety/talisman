import { FC, useRef } from "react"
import { Layout } from "../layout"
import imgHeadPolkadot from "../assets/polkadot-wallet-head.svg?url"
import imgTokenPolkadot from "../assets/polkadot-token.svg?url"
import imgTokenEthereum from "../assets/ethereum-token.svg?url"
import imgHeadEthereum from "../assets/ethereum-wallet-head.svg?url"
import { useHover, useHoverDirty } from "react-use"
import { classNames } from "talisman-ui"

type WalletImportButtonProps = {
  title: string
  subtitle: string
  srcHeader: string
  srcToken: string
}

const WalletImportButton: FC<WalletImportButtonProps> = ({
  title,
  subtitle,
  srcHeader,
  srcToken,
}) => {
  const refButton = useRef<HTMLButtonElement>(null)
  const isHovered = useHoverDirty(refButton)

  return (
    <button
      ref={refButton}
      type="button"
      className="text-body hover:text-body-black relative overflow-hidden rounded text-left drop-shadow-xl transition-colors hover:bg-white"
    >
      <div
        className={classNames(
          "overflow-hidden rounded-t transition-all",
          isHovered ? "bg-[#F2F2F2]" : "bg-white bg-opacity-[0.15]"
        )}
      >
        <img
          src={srcHeader}
          alt=""
          className={classNames(
            "hover: overflow-hidden  rounded-t transition-opacity",
            isHovered ? "opacity-100" : "opacity-50"
          )}
        />
      </div>
      <img src={srcToken} alt="" className="absolute left-12 top-[130px]" />
      <div className="flex flex-col gap-12 rounded-b bg-white/5 px-12 pt-24 pb-16">
        <div className="w-full text-xl">{title}</div>
        <div className="w-full">{subtitle}</div>
      </div>
    </button>
  )
}

export const ImportPage = () => {
  return (
    <Layout>
      <div className="mx-0 w-full max-w-[87rem] self-center text-center">
        <div className="my-[6rem] text-xl">Which type of wallet would you like to import?</div>
        <div className="flex flex-wrap justify-center gap-12">
          <WalletImportButton
            title="Polkadot wallet"
            subtitle="Polkadot.js, Subwallet, Nova or other"
            srcHeader={imgHeadPolkadot}
            srcToken={imgTokenPolkadot}
          />
          <WalletImportButton
            title="Ethereum wallet"
            subtitle="MetaMask, Coinbase, Rainbow or other"
            srcHeader={imgHeadEthereum}
            srcToken={imgTokenEthereum}
          />
        </div>
        <div className="my-24">You can always add another later</div>
      </div>
    </Layout>
  )
}
