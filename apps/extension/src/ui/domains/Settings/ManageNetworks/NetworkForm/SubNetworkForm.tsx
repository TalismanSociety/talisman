import { RequestUpsertCustomChain } from "@core/domains/chains/types"
import i18next from "@core/i18nConfig"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { ChainId } from "@talismn/chaindata-provider"
import { ReactNode, useCallback, useMemo, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Button, Checkbox, Dropdown, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { NetworkRpcsListField } from "./NetworkRpcsListField"

type SubNetworkFormProps = {
  chainId?: ChainId
  onSubmitted?: () => void
}

export const SubNetworkForm = ({ chainId, onSubmitted }: SubNetworkFormProps) => {
  const { t } = useTranslation("admin")

  const schema = useMemo(
    () =>
      yup
        .object({
          id: yup.string().required(""),
          name: yup.string().required(i18next.t("required")),
          rpcs: yup
            .array()
            .of(
              yup.object({
                url: yup.string().trim().required(i18next.t("required")),
                // .test("rpcmatch", "rpcCheck", async function (newRpc) {
                //   if (!evmNetworkId || !newRpc) return true
                //   try {
                //     const chainId = await getRpcChainId(newRpc as string)
                //     if (!chainId) return this.createError({ message: i18next.t("Failed to connect") })
                //     if (evmNetworkId !== chainId)
                //       return this.createError({ message: i18next.t("Chain ID mismatch") })
                //     return true
                //   } catch (err) {
                //     return this.createError({ message: i18next.t("Failed to connect") })
                //   }
                // }),
              })
            )
            .required(i18next.t("required"))
            .min(1, i18next.t("RPC URL required")),
          tokenSymbol: yup
            .string()
            .trim()
            .required(i18next.t("required"))
            .min(2, i18next.t("2-6 characters"))
            .max(6, i18next.t("2-6 characters")),
          tokenDecimals: yup
            .number()
            .typeError(i18next.t("invalid number"))
            .required(i18next.t("required"))
            .integer(i18next.t("invalid number")),
          blockExplorerUrl: yup.string().url(i18next.t("invalid url")),
          isTestnet: yup.boolean().required(),
        })
        .required(),
    []
  )

  const isEditMode = false

  // because of the RPC checks, do not validate on each change
  const formProps = useForm<RequestUpsertCustomChain>({
    mode: "onBlur",
    defaultValues: {
      accountFormat: "*25519",
      rpcs: [{ url: "" }],
    },
    resolver: yupResolver(schema),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    // resetField,
    // clearErrors,
    // setError,
    // reset,
    // trigger,
    formState: { errors, isValid, isSubmitting, isDirty, touchedFields },
  } = formProps
  const { isTestnet, rpcs, id, nativeTokenCoingeckoId, accountFormat } = watch()

  const accountFormatOptions = useMemo(
    () => [
      {
        label: (
          <div className="flex flex-col">
            <div className="text-xs">{t("Polkadot (default)")}</div>
            <div className="text-body-disabled text-tiny">
              {shortenAddress("5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM")}
            </div>
          </div>
        ),
        value: "*25519",
      },
      {
        label: (
          <div className="flex flex-col">
            <div className="text-xs">{t("Ethereum (e.g. Moonbeam)")}</div>
            <div className="text-body-disabled text-tiny">
              {shortenAddress("0x0000000000000000000000000000000000000000")}
            </div>
          </div>
        ),
        value: "secp256k1",
      },
    ],
    [t]
  )
  const accountFormatOption = useMemo(
    () => accountFormatOptions.find((option) => option.value === accountFormat),
    [accountFormat, accountFormatOptions]
  )
  const handleAccountFormatChange = useCallback(
    (option: { label: ReactNode; value: string } | null) =>
      setValue("accountFormat", option?.value ?? "*25519"),
    [setValue]
  )

  const [submitError, setSubmitError] = useState<string>()
  const submit = useCallback(
    async (chain: RequestUpsertCustomChain) => {
      try {
        // await api.ethNetworkUpsert({ ...network, tokenLogoUrl, chainLogoUrl })
        // if (network.isTestnet && !useTestnets) setUseTestNets(true)
        onSubmitted?.()
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [onSubmitted]
  )

  return (
    <>
      <HeaderBlock
        title={t("{{editMode}} custom network", { editMode: chainId ? t("Edit") : t("Add") })}
        text={t("Only ever add RPCs you trust.")}
      />
      <form className="mt-24 space-y-4" onSubmit={handleSubmit(submit)}>
        <FormProvider {...formProps}>
          <NetworkRpcsListField placeholder="wss://" />
          <div className="grid grid-cols-12 gap-12">
            {/* <FormFieldContainer label={t("Chain ID")} error={errors.id?.message}>
              <FormFieldInputText
                readOnly
                className="text-body-disabled cursor-not-allowed"
                before={
                  <ChainLogoBase
                    logo={chainLogoUrl}
                    className={classNames(
                      "ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]",
                      !id && "opacity-50"
                    )}
                  />
                }
                {...register("id")}
              />
            </FormFieldContainer> */}
            <FormFieldContainer
              className="col-span-7"
              label={t("Network Name")}
              error={errors.name?.message}
            >
              <FormFieldInputText placeholder={t("Paraverse")} {...register("name")} />
            </FormFieldContainer>
            <FormFieldContainer
              className="col-span-5"
              label={t("Account Format")}
              error={errors.accountFormat?.message}
            >
              <Dropdown
                items={accountFormatOptions}
                value={accountFormatOption}
                propertyKey="value"
                propertyLabel="label"
                onChange={handleAccountFormatChange}
              />
            </FormFieldContainer>
          </div>
          <div className="grid grid-cols-3 gap-12">
            <FormFieldContainer
              label={t("Native Token Coingecko ID")}
              error={errors.nativeTokenCoingeckoId?.message}
            >
              <FormFieldInputText
                // before={
                // <AssetLogoBase
                //   url={tokenLogoUrl}
                //   className="ml-[-0.8rem] mr-[0.4rem] min-w-[3rem] text-[3rem]"
                // />
                // }
                placeholder={t("(optional)")}
                {...register("nativeTokenCoingeckoId")}
              />
            </FormFieldContainer>
            {/* <FormFieldContainer label={t("Token symbol")} error={errors.nativeTokenSymbol?.message}>
              <FormFieldInputText placeholder={"ABC"} {...register("nativeTokenSymbol")} />
            </FormFieldContainer>
            <FormFieldContainer label={t("Token decimals")} error={errors.nativeTokenDecimals?.message}>
              <FormFieldInputText
                placeholder="18"
                {...register("nativeTokenDecimals", { valueAsNumber: true })}
              />
            </FormFieldContainer> */}
          </div>
          <div className="text-body-disabled mt-[-1.6rem] pb-8 text-xs">
            <Trans t={t}>
              Talisman uses CoinGecko as reference for fiat rates and token logos.
              <br />
              Find the API ID of the native token of this network on{" "}
              <a
                className="text-body-secondary hover:text-body"
                href="https://coingecko.com"
                target="_blank"
              >
                https://coingecko.com
              </a>{" "}
              and paste it here.
            </Trans>
          </div>
          <FormFieldContainer label={t("Subscan URL")} error={errors.subscanUrl?.message}>
            <FormFieldInputText
              placeholder="https://chain-name.subscan.io/"
              {...register("subscanUrl")}
            />
          </FormFieldContainer>
          <div>
            <Checkbox checked={!!isTestnet} /*onChange={handleIsTestnetChange}*/>
              <span className="text-body-secondary">{t("This is a testnet")}</span>
            </Checkbox>
          </div>
          <div className="text-alert-warn">{submitError}</div>
          <div className="flex justify-between">
            <div>
              {/* {evmNetwork && showRemove && <RemoveEvmNetworkButton network={evmNetwork} />}
              {evmNetwork && showReset && <ResetEvmNetworkButton network={evmNetwork} />} */}
            </div>
            <Button
              type="submit"
              className="mt-8"
              primary
              disabled={!isValid || !isDirty}
              processing={isSubmitting}
            >
              {isEditMode ? t("Update Network") : t("Add Network")}
              <ArrowRightIcon className="ml-4 inline text-lg" />
            </Button>
          </div>
        </FormProvider>
      </form>
    </>
  )
}
