import { HexString } from "@polkadot/util/types"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode, useCallback, useMemo, useState } from "react"
import { FormProvider, UseFormReturn } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { RequestUpsertCustomChain } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { api } from "@ui/api"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { ChainLogoBase } from "@ui/domains/Asset/ChainLogo"
import { useCoinGeckoTokenImageUrl } from "@ui/hooks/useCoinGeckoTokenImageUrl"
import { useChain, useSetting, useToken } from "@ui/state"

import { AccountFormatDropdown } from "./AccountFormatDropdown"
import { EnableNetworkToggle } from "./EnableNetworkToggle"
import { SubNetworkFormData } from "./schema"
import { SubNetworkRpcsListField } from "./SubNetworkRpcsListField"
import { SubNetworkFormBaseProps } from "./types"

type SubNetworkFormProps = SubNetworkFormBaseProps & {
  formProps: UseFormReturn<SubNetworkFormData>
  title: string
  submitButtonText: string
  children?: ReactNode
}

export const SubNetworkForm = ({
  formProps,
  title,
  onSubmitted,
  submitButtonText,
  children,
}: SubNetworkFormProps) => {
  const { t } = useTranslation("admin")
  const {
    formState: { errors, isDirty, isValid, isSubmitting, touchedFields },
    handleSubmit: submitForm,
    register,
    setValue,
    watch,
  } = formProps
  const { id, accountFormat, nativeTokenCoingeckoId } = watch()
  const chain = useChain(id)
  const token = useToken(chain?.nativeToken?.id)

  const [useTestnets, setUseTestnets] = useSetting("useTestnets")

  const coingeckoLogoUrl = useCoinGeckoTokenImageUrl(nativeTokenCoingeckoId)
  const nativeTokenLogoUrl = useMemo(
    // existing icon has priority
    () =>
      touchedFields?.nativeTokenCoingeckoId ? coingeckoLogoUrl : token?.logo ?? coingeckoLogoUrl,
    [coingeckoLogoUrl, token?.logo, touchedFields?.nativeTokenCoingeckoId]
  )

  const [submitError, setSubmitError] = useState<string>()
  const submit = useCallback(
    async (data: SubNetworkFormData) => {
      const requestData: RequestUpsertCustomChain = {
        ...data,
        rpcs: data.rpcs?.map((rpc) => ({ url: rpc.url })) ?? [],
        nativeTokenLogoUrl,
        genesisHash: data.genesisHash as HexString,
        nativeTokenCoingeckoId: data.nativeTokenCoingeckoId ?? null,
        subscanUrl: data.subscanUrl ?? null,
      }
      try {
        if (!requestData.rpcs.length) throw new Error(t("At least one RPC is required"))
        await api.chainUpsert(requestData)
        if (data.isTestnet && !useTestnets) setUseTestnets(true)
        onSubmitted?.()
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [nativeTokenLogoUrl, onSubmitted, setUseTestnets, t, useTestnets]
  )

  return (
    <>
      <HeaderBlock title={title} text={t("Only ever add RPCs you trust.")} />
      <form className="mt-24 space-y-4" onSubmit={submitForm(submit)}>
        <FormProvider {...formProps}>
          <SubNetworkRpcsListField />
          <div className="grid grid-cols-12 gap-12">
            <FormFieldContainer
              className="col-span-12 md:col-span-7"
              label={t("Network Name")}
              error={errors.name?.message}
            >
              <FormFieldInputText
                placeholder={t("Paraverse")}
                before={
                  <ChainLogoBase
                    logo={chain?.logo ?? null}
                    className={classNames(
                      "ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]",
                      !id && "opacity-50"
                    )}
                  />
                }
                {...register("name")}
              />
            </FormFieldContainer>
            <FormFieldContainer
              className="col-span-12 md:col-span-5"
              label={t("Account Format")}
              error={errors.accountFormat?.message}
            >
              <AccountFormatDropdown
                selectedFormat={accountFormat}
                onChange={(value) =>
                  setValue("accountFormat", value ?? "*25519", {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
              />
            </FormFieldContainer>
          </div>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <FormFieldContainer
              label={t("Native Token Coingecko ID")}
              error={errors.nativeTokenCoingeckoId?.message}
            >
              <FormFieldInputText
                before={
                  <AssetLogoBase
                    url={coingeckoLogoUrl}
                    className="ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]"
                  />
                }
                placeholder={t("(optional)")}
                {...register("nativeTokenCoingeckoId")}
              />
            </FormFieldContainer>
            <FormFieldContainer
              label={t("Native Token symbol")}
              error={errors.nativeTokenSymbol?.message}
            >
              <FormFieldInputText
                readOnly
                className="text-body-disabled cursor-not-allowed"
                {...register("nativeTokenSymbol")}
              />
            </FormFieldContainer>
            <FormFieldContainer
              label={t("Native Token decimals")}
              error={errors.nativeTokenDecimals?.message}
            >
              <FormFieldInputText
                readOnly
                className="text-body-disabled cursor-not-allowed"
                {...register("nativeTokenDecimals", { valueAsNumber: true })}
              />
            </FormFieldContainer>
          </div>
          <div className="text-body-disabled mt-[-1.6rem] pb-8 text-xs">
            <Trans
              t={t}
              defaults="Talisman uses CoinGecko as reference for fiat rates and token logos.<br />Find the API ID of the native token of this network on <Link>https://coingecko.com</Link> and paste it here."
              components={{
                Link: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a
                    className="text-body-secondary hover:text-body"
                    href="https://coingecko.com"
                    target="_blank"
                  ></a>
                ),
              }}
            />
          </div>
          <FormFieldContainer label={t("Subscan URL")} error={errors.subscanUrl?.message}>
            <FormFieldInputText
              placeholder="https://chain-name.subscan.io/"
              {...register("subscanUrl")}
            />
          </FormFieldContainer>
          <div>
            <Checkbox {...register("isTestnet")}>
              <span className="text-body-secondary">{t("This is a testnet")}</span>
            </Checkbox>
          </div>
          <div>
            <Checkbox {...register("hasCheckMetadataHash")}>
              <span className="text-body-secondary">
                {t("This network supports CheckMetadataHash sign extension")}
              </span>
            </Checkbox>
          </div>
          <EnableNetworkToggle chainId={id} />
          <div className="text-alert-warn">{submitError}</div>
          <div className="flex justify-between">
            <div>{children}</div>
            <Button
              type="submit"
              className="mt-8"
              primary
              disabled={!isValid || !isDirty}
              processing={isSubmitting}
            >
              {submitButtonText}
              <ArrowRightIcon className="ml-4 inline text-lg" />
            </Button>
          </div>
        </FormProvider>
      </form>
    </>
  )
}
