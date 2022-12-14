import { AccountAddressType } from "@core/domains/accounts/types"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { FC, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useHoverDirty } from "react-use"
import { classNames } from "talisman-ui"

import imgTokenEthereum from "../assets/ethereum-token.svg?url"
import imgHeadEthereum from "../assets/ethereum-wallet-head.svg?url"
import imgTokenPolkadot from "../assets/polkadot-token.svg?url"
import imgHeadPolkadot from "../assets/polkadot-wallet-head.svg?url"
import { useOnboard } from "../context"
import { Layout } from "../layout"

type WalletImportButtonProps = {
  title: string
  subtitle: string
  srcHeader: string
  srcToken: string
  onClick?: () => void
}

const WalletImportButton: FC<WalletImportButtonProps> = ({
  title,
  subtitle,
  srcHeader,
  srcToken,
  onClick,
}) => {
  const refButton = useRef<HTMLButtonElement>(null)
  const isHovered = useHoverDirty(refButton)

  return (
    <button
      ref={refButton}
      onClick={onClick}
      type="button"
      className="text-body hover:text-body-black relative overflow-hidden rounded text-left drop-shadow-xl transition-colors hover:bg-white"
    >
      <div
        className={classNames(
          "rounded-t transition-all",
          isHovered ? "bg-[#F2F2F2]" : "bg-white bg-opacity-[0.15]"
        )}
      >
        <img
          src={srcHeader}
          alt=""
          className={classNames(
            "rounded-t  transition-opacity ",
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

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 2a - Import type",
}

export const ImportPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const { updateData } = useOnboard()
  const navigate = useNavigate()

  const handleTypeClick = useCallback(
    (importAccountType: AccountAddressType) => () => {
      updateData({
        importAccountType,
      })
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: `Import wallet ${importAccountType === "ethereum" ? "Ethereum" : "Polkadot"}`,
        properties: {
          importAccountType,
        },
      })
      navigate("/import-method")
    },
    [navigate, updateData]
  )

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      <div className="mx-0 w-full max-w-[87rem] self-center text-center">
        <div className="my-[6rem] text-xl">Which type of wallet would you like to import?</div>
        <div className="flex flex-wrap justify-center gap-12">
          <WalletImportButton
            onClick={handleTypeClick("sr25519")}
            title="Polkadot wallet"
            subtitle="Polkadot.js, Subwallet, Nova or other"
            srcHeader={imgHeadPolkadot}
            srcToken={imgTokenPolkadot}
          />
          <WalletImportButton
            onClick={handleTypeClick("ethereum")}
            title="Ethereum wallet"
            subtitle="MetaMask, Coinbase, Rainbow or other"
            srcHeader={imgHeadEthereum}
            srcToken={imgTokenEthereum}
          />
        </div>
        <div className="text-body-secondary my-24">You can always add another later</div>
      </div>
    </Layout>
  )
}
