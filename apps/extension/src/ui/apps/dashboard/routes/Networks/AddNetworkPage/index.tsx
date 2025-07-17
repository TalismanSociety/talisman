/* eslint-disable react/no-children-prop */
import { getGithubTokenLogoUrlByCoingeckoId, NetworkBaseSchema } from "@talismn/chaindata-provider"
import { LoaderIcon, SaveIcon } from "@talismn/icons"
import { useField } from "@tanstack/react-form"
import { log } from "extension-shared"
import { TFunction } from "i18next"
import { FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { firstValueFrom } from "rxjs"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import { z } from "zod/v4"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { fetchEthChainId, getDotChainInfoFromRpc } from "@ui/domains/Networks/helpers"
import { PlatformSelect } from "@ui/domains/Networks/PlatformSelect"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { getNetworkByGenesisHash$, getNetworkById$ } from "@ui/state"

import { NetworkCreateFormData, NetworkCreateFormProvider, useNetworkCreateForm } from "./context"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Network",
}

export const AddNetworkPage = () => {
  const { t } = useTranslation()

  useAnalyticsPageView(ANALYTICS_PAGE, {
    mode: "Add",
  })

  return (
    <DashboardLayout sidebar="settings">
      <HeaderBlock
        title={t("Add custom network")}
        text={
          <Trans
            t={t}
            defaults="Only ever add RPCs you trust.<br />RPCs will automatically cycle in the order of priority defined here in case of any errors."
          />
        }
      />
      <NetworkCreateFormProvider>
        <NetworkCreateForm />
      </NetworkCreateFormProvider>
    </DashboardLayout>
  )
}

const NetworkCreateForm: FC = () => {
  const { t } = useTranslation()

  const { form } = useNetworkCreateForm()

  const fldPlatform = useField({ form, name: "platform" })
  const platform = useMemo(() => fldPlatform.state.value, [fldPlatform.state.value])

  const fldNetworkId = useField({ form, name: "id" })
  const networkId = useMemo(() => fldNetworkId.state.value, [fldNetworkId.state.value])

  return (
    <>
      <form
        className="my-20"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="platform"
          children={(field) => (
            <>
              <FormFieldContainer label={t("Platform")} error={field.state.meta.errors[0]}>
                <PlatformSelect
                  value={field.state.value ?? null}
                  onChange={(platform) => {
                    field.form.reset()
                    field.handleChange(platform)
                  }}
                  placeholder={t("Select a platform")}
                />
              </FormFieldContainer>
            </>
          )}
        />
        <form.Field
          name="rpc"
          children={(field) => (
            <FormFieldContainer label={t("RPC Url")} error={field.state.meta.errors[0]}>
              <FormFieldInputText
                type="text"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                spellCheck={false}
                data-lpignore
                autoComplete="off"
                placeholder={
                  platform === "polkadot" ? "wss://" : platform === "ethereum" ? "https://" : ""
                }
                small
                disabled={!platform}
                after={
                  field.state.meta.isValidating && (
                    <div className="mr-[-1.2rem] shrink-0 px-2">
                      <LoaderIcon className="animate-spin-slow transition-none" />
                    </div>
                  )
                }
              />
            </FormFieldContainer>
          )}
          asyncDebounceMs={200}
          validators={{
            onChangeAsync: async ({ value, signal, fieldApi }) => {
              if (!value) {
                fieldApi.form.setFieldValue("id", "")
                return null
              }

              switch (platform) {
                case "polkadot": {
                  const networkInfo = await getDotNetworkInfo(t, value)
                  if (typeof networkInfo === "string") {
                    fieldApi.form.resetField("id")
                    return networkInfo
                  }

                  if (
                    await firstValueFrom(getNetworkByGenesisHash$(networkInfo.id as `0x${string}`))
                  )
                    return t("Network already exists")

                  fieldApi.form.setFieldValue("id", networkInfo.id)
                  fieldApi.form.setFieldValue("name", networkInfo.name)
                  fieldApi.form.setFieldValue(
                    "dotNetworkSpecifics",
                    networkInfo.dotNetworkSpecifics,
                  )
                  fieldApi.form.setFieldValue("nativeCurrency", networkInfo.nativeCurrency)
                  fieldApi.form.validate("change")
                  break
                }
                case "ethereum": {
                  const networkInfo = await getEthNetworkInfo(t, value, signal)
                  if (typeof networkInfo === "string") {
                    fieldApi.form.resetField("id")
                    return networkInfo
                  }

                  if (await firstValueFrom(getNetworkById$(networkInfo.networkId)))
                    return t("Network already exists")

                  fieldApi.form.setFieldValue("id", networkInfo.networkId)
                  fieldApi.form.setFieldValue("nativeCurrency.decimals", 18)
                  fieldApi.form.validate("change")
                  break
                }
              }

              return null
            },
          }}
        />
        {!!platform && (
          <>
            <div className="grid grid-cols-3 gap-12">
              <div className={fldPlatform.state.value === "polkadot" ? "col-span-3" : "col-span-2"}>
                <form.Field
                  name="name"
                  children={(field) => (
                    <FormFieldContainer label="Network Name" error={field.state.meta.errors[0]}>
                      <FormFieldInputText
                        type="text"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        spellCheck={false}
                        data-lpignore
                        autoComplete="off"
                        small
                        disabled={!networkId}
                      />
                    </FormFieldContainer>
                  )}
                />
              </div>
              {fldPlatform.state.value === "ethereum" && (
                <div>
                  <form.Field
                    name="id"
                    children={(field) => (
                      <FormFieldContainer label="Chain ID">
                        <FormFieldInputText
                          type="text"
                          value={field.state.value ?? ""}
                          readOnly
                          spellCheck={false}
                          data-lpignore
                          autoComplete="off"
                          disabled={!field.state.value}
                          small
                        />
                      </FormFieldContainer>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-12">
              <form.Field
                name="nativeCurrency.symbol"
                validators={{
                  onChange: ({ value }) => {
                    const parsed =
                      NetworkBaseSchema.shape.nativeCurrency.shape.symbol.safeParse(value)
                    return parsed.success
                      ? undefined
                      : (parsed.error.issues[0].message ?? t("Invalid value"))
                  },
                }}
                children={(field) => (
                  <FormFieldContainer
                    label={t("Native Token Symbol")}
                    error={field.state.meta.errors[0]}
                  >
                    <FormFieldInputText
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                      disabled={!networkId}
                      small
                    />
                  </FormFieldContainer>
                )}
              />

              <form.Field
                name="nativeCurrency.decimals"
                validators={{
                  onChange: ({ value }) => {
                    const parsed =
                      NetworkBaseSchema.shape.nativeCurrency.shape.decimals.safeParse(value)
                    return parsed.success
                      ? undefined
                      : (parsed.error.issues[0].message ?? t("Invalid value"))
                  },
                }}
                children={(field) => (
                  <FormFieldContainer
                    label={t("Native Token Decimals")}
                    error={field.state.meta.errors[0]}
                  >
                    <FormFieldInputText
                      name={field.name}
                      type="number"
                      value={field.state.value ?? ""}
                      onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                      placeholder="0"
                      autoComplete="off"
                      readOnly
                      disabled={!networkId}
                      small
                    />
                  </FormFieldContainer>
                )}
              />

              <form.Field
                name="nativeCurrency.coingeckoId"
                validators={{
                  onChange: ({ value }) => {
                    const parsed =
                      NetworkBaseSchema.shape.nativeCurrency.shape.coingeckoId.safeParse(value)
                    return parsed.success
                      ? undefined
                      : (parsed.error.issues[0].message ?? t("Invalid value"))
                  },
                }}
                asyncDebounceMs={200}
                children={(field) => (
                  <FormFieldContainer
                    label={t("Native Token Coingecko ID")}
                    error={field.state.meta.errors[0]}
                  >
                    <FormFieldInputText
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                      small
                      disabled={!networkId}
                      before={
                        <AssetLogo
                          className="mr-2 rounded-full text-[3rem]"
                          url={
                            field.state.value
                              ? getGithubTokenLogoUrlByCoingeckoId(field.state.value)
                              : null
                          }
                        />
                      }
                    />
                  </FormFieldContainer>
                )}
              />

              <form.Field
                name="nativeCurrency.name"
                validators={{
                  onChange: ({ value }) => {
                    const parsed =
                      NetworkBaseSchema.shape.nativeCurrency.shape.name.safeParse(value)
                    return parsed.success
                      ? undefined
                      : (parsed.error.issues[0].message ?? t("Invalid value"))
                  },
                }}
                children={(field) => (
                  <FormFieldContainer
                    label={t("Native Token Name")}
                    error={field.state.meta.errors[0]}
                  >
                    <FormFieldInputText
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                      disabled={!networkId}
                      small
                    />
                  </FormFieldContainer>
                )}
              />
            </div>
            <form.Field
              name="blockExplorerUrl"
              children={(field) => (
                <FormFieldContainer label="Block Explorer Url" error={field.state.meta.errors[0]}>
                  <FormFieldInputText
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    spellCheck={false}
                    data-lpignore
                    autoComplete="off"
                    disabled={!networkId}
                    small
                  />
                </FormFieldContainer>
              )}
              validators={{
                onChange: ({ value }) => {
                  // here we are cheating because the we dont support yet multiple block explorers while our Network schema does
                  // the form submit handler will add or remove an item based on the value we have here
                  const parsed = z
                    .url({ protocol: /^https?$/ })
                    .optional()
                    .safeParse(value || undefined)
                  if (parsed.success) return undefined
                  return parsed.error.issues[0].message
                },
              }}
            />
            <div className="flex w-full flex-col gap-4">
              <div>
                <form.Field
                  name="isTestnet"
                  children={(field) => (
                    <Checkbox
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                    >
                      <span className="text-body-secondary">{t("This is a testnet")}</span>
                    </Checkbox>
                  )}
                />
              </div>
              {platform === "polkadot" && (
                <div>
                  <form.Field
                    name="dotNetworkSpecifics.hasCheckMetadataHash"
                    children={(field) => (
                      <Checkbox
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                      >
                        <span className="text-body-secondary">
                          {t("This network supports CheckMetadataHash sign extension")}
                        </span>
                      </Checkbox>
                    )}
                  />
                </div>
              )}
              {platform === "ethereum" && (
                <div>
                  <form.Field
                    name="ethNetworkSpecifics.preserveGasEstimate"
                    children={(field) => (
                      <Checkbox
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                      >
                        <span className="text-body-secondary">
                          {t("Use exact gas estimates (required for PolkaVM networks)")}
                        </span>
                      </Checkbox>
                    )}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-end gap-8 py-8">
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting, state.isValidating]}
                  children={([canSubmit, isSubmitting, isValidating]) => (
                    <Button
                      primary
                      icon={SaveIcon}
                      className="h-24 w-[24rem] text-base"
                      type="submit"
                      processing={isSubmitting || isValidating}
                      disabled={!isSubmitting && !isValidating && !canSubmit}
                    >
                      {t("Save")}
                    </Button>
                  )}
                />
              </div>
            </div>
          </>
        )}
      </form>
    </>
  )
}

const getDotNetworkInfo = async (
  t: TFunction,
  rpcUrl: string,
): Promise<
  Pick<NetworkCreateFormData, "id" | "dotNetworkSpecifics" | "nativeCurrency" | "name"> | string
> => {
  const parsed = z.url({ protocol: /^wss?$/ }).safeParse(rpcUrl)
  if (!parsed.success) return t("Invalid websocket url")

  try {
    const chainInfo = await getDotChainInfoFromRpc(parsed.data)
    if (!chainInfo) return t("Failed to fetch network information from RPC")

    const {
      genesisHash,
      token,
      hasCheckMetadataHash,
      account,
      name,
      specName,
      specVersion,
      ss58Prefix,
    } = chainInfo

    return {
      id: genesisHash,
      name,
      dotNetworkSpecifics: {
        genesisHash,
        prefix: ss58Prefix,
        specName,
        specVersion,
        hasCheckMetadataHash,
        account,
        chainName: name,
        existentialDeposit: token.existentialDeposit,
      },
      nativeCurrency: {
        symbol: token.symbol,
        decimals: token.decimals,
        name: token.symbol,
      },
    }
  } catch (err) {
    log.error("Failed to fetch Polkadot chain info", { err })
  }

  return t("Failed to fetch network information network")
}

const getEthNetworkInfo = async (t: TFunction, rpcUrl: string, signal?: AbortSignal) => {
  const parsed = z.url({ protocol: /^https?$/ }).safeParse(rpcUrl)
  if (!parsed.success) return t("Invalid http url")

  try {
    const networkId = await fetchEthChainId(rpcUrl, signal)
    return { networkId }
  } catch (err) {
    log.error("Failed to fetch Ethereum chain info", { err })
    return t("Failed to fetch network information from RPC")
  }
}
