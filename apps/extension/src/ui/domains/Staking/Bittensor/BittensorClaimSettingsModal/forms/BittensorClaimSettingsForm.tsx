import { classNames } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import type { RootClaimType } from "../../../hooks/bittensor/dTao/types"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { BondAccountPicker } from "../../../Bond/BondAccountPicker"
import { useGetBittensorClaimType } from "../../../hooks/bittensor/dTao/useGetBittensorClaimType"
import { useGetBittensorClaimTypePayload } from "../../../hooks/bittensor/dTao/useGetBittensorClaimTypePayload"
import { BittensorAssetAccountSummary } from "../../components/BittensorAssetAccountSummary"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { DEFAULT_ROOT_CLAIM_TYPE } from "../../utils/constants"
import { BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID } from "../constants"
import { useBittensorClaimSettingsModal } from "../hooks/useBittensorClaimSettingsModal"
import { useBittensorClaimSettingsWizard } from "../hooks/useBittensorClaimSettingsWizard"

export const BittensorClaimSettingsForm = () => {
  const [selectedClaimType, setSelectedClaimType] = useState<RootClaimType>(DEFAULT_ROOT_CLAIM_TYPE)
  const { t } = useTranslation()
  const { nativeToken, account, accountPicker, setAddress, onSubmitted } =
    useBittensorClaimSettingsWizard()
  const { close } = useBittensorClaimSettingsModal()

  const { data: claimType, isLoading: isClaimTypeLoading } = useGetBittensorClaimType({
    networkId: nativeToken?.networkId,
    address: account?.address,
  })

  const { data: setClaimTypePayload, isLoading: isPayloadLoading } =
    useGetBittensorClaimTypePayload({
      networkId: nativeToken?.networkId,
      address: account?.address,
      claimType: selectedClaimType,
    })

  useEffect(() => {
    if (claimType) setSelectedClaimType(claimType)
  }, [claimType])

  const claimTypeOptions = useMemo(
    () => [
      {
        value: "Swap" as RootClaimType,
        title: t("Receive rewards in Tao"),
        description: t("Rewards are converted to Tao and automatically re-staked. (Default)"),
      },
      {
        value: "Keep" as RootClaimType,
        title: t("Receive rewards in Alpha"),
        description: t("Rewards are kept in subnet alpha tokens, across all subnets."),
      },
      {
        value: "KeepSubnets" as RootClaimType,
        title: t("Receive rewards in Selected Alpha"),
        description: t(
          "Rewards are kept in alpha tokens for the subnets you specify, the remainder is converted to Tao.",
        ),
        disabled: true,
      },
    ],
    [t],
  )

  const handleSelectAccount = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress],
  )

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader title={t("Claim Settings")} withClose onCloseModal={close} />
      }
      contentClassName="text-body-secondary flex size-full flex-col gap-4 p-12 pt-0"
    >
      <BittensorAssetAccountSummary
        token={nativeToken}
        accountAddress={account?.address}
        onAccountClick={accountPicker.open}
        assetLabel={t("Network")}
        accountLabel={t("Account")}
      />

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-body text-sm font-semibold leading-[1.1]">{t("Reward Type")}</span>
          <span className="text-body-secondary text-xs leading-[1.4]">
            {t("Select how this account receives root emission rewards.")}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-6" role="radiogroup" aria-label={t("Reward Type")}>
          {claimTypeOptions.map((option) => {
            const isSelected = selectedClaimType === option.value
            const button = (
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => !option.disabled && setSelectedClaimType(option.value)}
                disabled={isClaimTypeLoading}
                className={classNames(
                  "border-light-gray relative w-full rounded-sm border px-6 py-5 text-left transition-colors",
                  "bg-black-tertiary text-sm",
                  isSelected
                    ? "text-body"
                    : "text-body-secondary hover:border-grey-700 hover:text-body border-transparent",
                  option.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <div className="flex flex-col gap-1 pr-10">
                  <span className="text-body text-[14px] font-semibold leading-[1.2]">
                    {option.title}
                  </span>
                  <span className="text-body-secondary text-[12px] leading-[1.4]">
                    {option.description}
                  </span>
                </div>
                <span
                  className={
                    "bg-grey-700 absolute right-6 top-5 flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  }
                >
                  <span
                    className={classNames(
                      "h-3.5 w-3.5 rounded-full transition-colors",
                      isSelected ? "bg-primary" : "bg-transparent",
                    )}
                  />
                </span>
              </button>
            )

            if (option.disabled) {
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent>{t("Coming soon")}</TooltipContent>
                </Tooltip>
              )
            }

            return <div key={option.value}>{button}</div>
          })}
        </div>
      </div>

      <div className={"mt-auto grid w-full grid-cols-2 gap-8"}>
        <Button onClick={close}>{t("Cancel")}</Button>

        {isPayloadLoading || !setClaimTypePayload?.payload || isClaimTypeLoading ? (
          <Button className="px-2" primary disabled>
            {t("Confirm")}
          </Button>
        ) : (
          <SapiSendButton
            containerId={BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
            label={t("Confirm")}
            payload={setClaimTypePayload?.payload}
            onSubmitted={onSubmitted}
            txMetadata={setClaimTypePayload?.txMetadata}
            disabled={claimType === selectedClaimType}
          />
        )}
      </div>

      <BondAccountPicker
        containerId={BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
        isOpen={accountPicker.isOpen}
        account={account}
        token={nativeToken}
        onBackClick={accountPicker.close}
        onCloseClick={close}
        onAddressSelected={handleSelectAccount}
      />
    </BittensorModalLayout>
  )
}
