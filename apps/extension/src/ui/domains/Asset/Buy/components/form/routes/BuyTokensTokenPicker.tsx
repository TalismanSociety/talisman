import { Token, TokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { TokenPicker } from "@ui/domains/Asset/TokenPicker"
import { useAccounts } from "@ui/state"

import { useBuyTokensWizard } from "../../../useBuyTokensWizard"
import { BuyTokensLayout } from "../../BuyTokensLayout"

export const BuyTokensTokenPicker = () => {
  const { t } = useTranslation()
  const accounts = useAccounts("portfolio")
  const {
    supportedTokens,
    buySellForm: { setValue, watch },
    setRoute,
  } = useBuyTokensWizard()

  const [address, { id }] = watch(["address", "rampTokenAsset"])

  const supportedTokensIds = useMemo(
    () => supportedTokens.map((token) => token.tokenData.id),
    [supportedTokens],
  )

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      const rampAsset = supportedTokens.find((token) => token.tokenData.id === tokenId)
      const isEvmToken = !!rampAsset?.tokenData.token?.evmNetwork?.id
      setValue(
        "rampTokenAsset",
        {
          id: rampAsset?.tokenData.id ?? "",
          symbol: rampAsset?.symbol ?? "",
          chain: rampAsset?.chain ?? "",
          decimals: rampAsset?.decimals ?? 0,
          isEvm: isEvmToken,
          chainId: rampAsset?.tokenData.chain?.id ?? "",
          chainPrefix:
            rampAsset?.tokenData?.chain && "prefix" in rampAsset.tokenData.chain
              ? rampAsset.tokenData.chain.prefix
              : null,
          chainName: rampAsset?.tokenData.chain?.name ?? "",
          logo: rampAsset?.logoUrl ?? "",
          minPurchaseAmount: rampAsset?.minPurchaseAmount ?? 0,
        },
        { shouldValidate: true },
      )
      if (isEvmToken && (!address || !isEthereumAddress(address))) {
        const acc = accounts.find((acc) => isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "", { shouldValidate: true })
      }
      if (!isEvmToken && (!address || isEthereumAddress(address))) {
        const acc = accounts.find((acc) => !isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "", { shouldValidate: true })
      }
      setRoute("mainForm")
    },
    [accounts, address, setRoute, setValue, supportedTokens],
  )

  const tokenFilter = useCallback(
    (token: Token) => {
      return supportedTokensIds.includes(token.id)
    },
    [supportedTokensIds],
  )

  return (
    <BuyTokensLayout title={t("Select a token")} withBackLink>
      <ScrollContainer className="border-grey-700 scrollable h-full w-full grow overflow-x-hidden">
        <TokenPicker
          ownedOnly
          showEmptyBalances
          selected={id}
          onSelect={handleTokenSelect}
          tokenFilter={tokenFilter}
        />
      </ScrollContainer>
    </BuyTokensLayout>
  )
}
