import { RequestUpsertCustomChain } from "@core/domains/chains/types"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Chain, ChainId, CustomChain, isCustomChain } from "@talismn/chaindata-provider"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { ChainLogoBase } from "@ui/domains/Asset/ChainLogo"
import useChain from "@ui/hooks/useChain"
import useChains from "@ui/hooks/useChains"
import { useCoinGeckoTokenImageUrl } from "@ui/hooks/useCoinGeckoTokenImageUrl"
import { useIsBuiltInChain } from "@ui/hooks/useIsBuiltInChain"
import { useKnownChain } from "@ui/hooks/useKnownChain"
import { useSetting } from "@ui/hooks/useSettings"
import useToken from "@ui/hooks/useToken"
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import {
  Button,
  Checkbox,
  Dropdown,
  FormFieldContainer,
  FormFieldInputText,
  Toggle,
} from "talisman-ui"

import { getSubNetworkFormSchema } from "./getSubNetworkFormSchema"
import { getSubstrateRpcInfo } from "./helpers"
import { NetworkRpcsListField } from "./NetworkRpcsListField"
import { RemoveSubNetworkButton } from "./RemoveSubNetworkButton"
import { ResetSubNetworkButton } from "./ResetSubNetworkButton"

type SubNetworkFormProps = {
  chainId?: ChainId
  onSubmitted?: () => void
}

const EnableNetworkToggle: FC<{ chainId?: string }> = ({ chainId }) => {
  const { t } = useTranslation("admin")
  const { chain, isEnabled, setEnabled } = useKnownChain(chainId)

  if (!chain) return null

  return (
    <div className="pt-8">
      <FormFieldContainer label={t("Display balances")}>
        <Toggle checked={isEnabled} onChange={(e) => setEnabled(e.target.checked)}>
          <span className={"text-grey-300"}>{isEnabled ? t("Yes") : t("No")}</span>
        </Toggle>
      </FormFieldContainer>
    </div>
  )
}

export const SubNetworkForm = ({ chainId, onSubmitted }: SubNetworkFormProps) => {
  const { t } = useTranslation("admin")
  const isBuiltInChain = useIsBuiltInChain(chainId)

  const { chains } = useChains("all")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")

  const { defaultValues, isCustom, isEditMode, chain } = useEditMode(chainId)
  const tEditMode = chainId ? t("Edit") : t("Add")

  const schema = useMemo(
    () => getSubNetworkFormSchema(chain?.genesisHash ?? undefined),
    [chain?.genesisHash]
  )

  // because of the RPC checks, do not validate on each change
  const formProps = useForm<RequestUpsertCustomChain>({
    mode: "onBlur",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    clearErrors,
    setError,
    reset,
    trigger,
    formState: { errors, isValid, isSubmitting, isDirty, touchedFields },
  } = formProps

  const { rpcs, id, nativeTokenCoingeckoId, accountFormat } = watch()

  // initialize form with existing values (edit mode), only once
  const initialized = useRef(false)
  useEffect(() => {
    if (chainId && defaultValues && !initialized.current) {
      reset(defaultValues)
      trigger("rpcs")
      initialized.current = true
    }
  }, [defaultValues, chainId, reset, trigger])

  // auto detect genesis hash (and token deets) based on RPC url (add mode only)
  const rpcInfo = useRpcInfo(rpcs?.[0]?.url)
  useEffect(() => {
    if (chainId || !rpcInfo.isFetched) return
    const rpcId = rpcInfo.data && `custom-${rpcInfo.data.genesisHash}`
    if (rpcInfo.data && rpcId && rpcId !== id) {
      setValue("id", rpcId, { shouldValidate: true, shouldTouch: true, shouldDirty: true })
      setValue("genesisHash", rpcInfo.data.genesisHash as `0x${string}`, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
      setValue("nativeTokenSymbol", rpcInfo.data.token.symbol, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
      setValue("nativeTokenDecimals", rpcInfo.data.token.decimals, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
    } else if (!!id && !rpcInfo.data) {
      resetField("id")
      resetField("genesisHash")
      resetField("nativeTokenSymbol")
      resetField("nativeTokenDecimals")
    }
  }, [id, resetField, setValue, chainId, rpcInfo.isFetched, rpcInfo.data])

  // fetch token logo's url, but only if form has been edited to reduce 429 errors from coingecko
  const coingeckoLogoUrl = useCoinGeckoTokenImageUrl(isDirty ? nativeTokenCoingeckoId : null)

  const nativeTokenLogoUrl = useMemo(
    // existing icon has priority
    () =>
      touchedFields?.nativeTokenCoingeckoId
        ? coingeckoLogoUrl
        : defaultValues?.nativeTokenLogoUrl ?? coingeckoLogoUrl,
    [coingeckoLogoUrl, defaultValues?.nativeTokenLogoUrl, touchedFields?.nativeTokenCoingeckoId]
  )

  const chainLogoUrl = useMemo(
    () => defaultValues?.chainLogoUrl ?? null,
    [defaultValues?.chainLogoUrl]
  )

  useEffect(() => {
    // check only if adding a new network
    if (chainId || !id) return

    if (chains?.some((c) => c.id === id)) {
      if (!errors.id) setError("id", { message: t("already exists") })
    } else {
      if (errors.id) clearErrors("id")
    }
  }, [clearErrors, id, setError, errors.id, t, chainId, chains])

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

  const [showRemove, showReset] = useMemo(
    () =>
      isCustom && isBuiltInChain.isFetched
        ? [!isBuiltInChain.data, !!isBuiltInChain.data]
        : [false, false],
    [isCustom, isBuiltInChain.data, isBuiltInChain.isFetched]
  )

  const [submitError, setSubmitError] = useState<string>()
  const submit = useCallback(
    async (chain: RequestUpsertCustomChain) => {
      try {
        await api.chainUpsert({ ...chain, nativeTokenLogoUrl, chainLogoUrl })
        if (chain.isTestnet && !useTestnets) setUseTestnets(true)
        onSubmitted?.()
      } catch (err) {
        setSubmitError((err as Error).message)
      }
    },
    [chainLogoUrl, nativeTokenLogoUrl, onSubmitted, setUseTestnets, useTestnets]
  )

  // on edit screen, wait for existing chain to be loaded
  if (chainId && !defaultValues) return null

  return (
    <>
      <HeaderBlock
        title={
          isCustom
            ? t("{{tEditMode}} Custom Substrate Network", { tEditMode })
            : t("{{tEditMode}} Substrate Network", { tEditMode })
        }
        text={t("Only ever add RPCs you trust.")}
      />
      <form className="mt-24 space-y-4" onSubmit={handleSubmit(submit)}>
        <FormProvider {...formProps}>
          <NetworkRpcsListField placeholder="wss://" />
          <div className="grid grid-cols-12 gap-12">
            <FormFieldContainer
              className="col-span-7"
              label={t("Network Name")}
              error={errors.name?.message}
            >
              <FormFieldInputText
                placeholder={t("Paraverse")}
                before={
                  <ChainLogoBase
                    logo={chainLogoUrl}
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
                before={
                  <AssetLogoBase
                    url={nativeTokenLogoUrl}
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
          <EnableNetworkToggle chainId={chainId} />
          <div className="text-alert-warn">{submitError}</div>
          <div className="flex justify-between">
            <div>
              {chain && showRemove && <RemoveSubNetworkButton chain={chain} />}
              {chain && showReset && <ResetSubNetworkButton chain={chain} />}
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

const useRpcInfo = (rpcUrl: string) => {
  const [debouncedRpcUrl, setDebouncedRpcUrl] = useState(rpcUrl)
  useDebounce(
    () => {
      setDebouncedRpcUrl(rpcUrl)
    },
    250,
    [rpcUrl]
  )

  return useQuery({
    queryKey: ["useRpcGenesisHash", debouncedRpcUrl],
    queryFn: () => (debouncedRpcUrl ? getSubstrateRpcInfo(debouncedRpcUrl) : null),
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
}

const DEFAULT_VALUES: Partial<RequestUpsertCustomChain> = {
  accountFormat: "*25519",
  rpcs: [{ url: "" }], // provides one empty row
}

const useEditMode = (chainId?: ChainId) => {
  const chain = useChain(chainId)
  const nativeToken = useToken(chain?.nativeToken?.id) as CustomNativeToken | undefined
  const defaultValues = useMemo(() => {
    if (!chainId) return DEFAULT_VALUES
    return chain ? chainToFormData(chain, nativeToken) : undefined
  }, [chain, chainId, nativeToken])

  const isCustom = useMemo(() => !!chain && isCustomChain(chain), [chain])

  return { defaultValues, isEditMode: !!chainId, isCustom, chain, nativeToken }
}

const chainToFormData = (
  chain?: Chain | CustomChain,
  nativeToken?: CustomNativeToken
): RequestUpsertCustomChain | undefined => {
  if (!chain) return undefined

  return {
    id: chain.id,
    isTestnet: chain.isTestnet,
    genesisHash: chain.genesisHash,
    name: chain.name ?? "",
    chainLogoUrl: chain.logo ?? null,
    nativeTokenSymbol: nativeToken?.symbol ?? "Unit",
    nativeTokenDecimals: nativeToken?.decimals ?? 0,
    nativeTokenCoingeckoId: nativeToken?.coingeckoId ?? null,
    nativeTokenLogoUrl: nativeToken?.logo ?? null,
    accountFormat: chain.account,
    subscanUrl: chain.subscanUrl,
    rpcs: chain.rpcs ?? [],
  }
}
