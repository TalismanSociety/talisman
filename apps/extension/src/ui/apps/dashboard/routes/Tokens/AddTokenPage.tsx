/* eslint-disable react/no-children-prop */
import {
  EthereumAddressSchema,
  EthNetwork,
  getGithubTokenLogoUrlByCoingeckoId,
  Token,
  TokenBaseSchema,
} from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { LoaderIcon, SaveIcon } from "@talismn/icons"
import { sleep } from "@talismn/util"
import { useField, useForm } from "@tanstack/react-form"
import { activeTokensStore, getErc20TokenInfo, getUniswapV2TokenInfo } from "extension-core"
import { log } from "extension-shared"
import { range } from "lodash-es"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { firstValueFrom } from "rxjs"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import { z } from "zod/v4"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { NetworkCombo } from "@ui/domains/Networks/NetworkCombo"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { getNetworkById$, getToken$, useNetworks } from "@ui/state"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Add Token",
}

export const AddTokenPage = () => {
  const { t } = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <DashboardLayout sidebar="settings">
      <HeaderBlock
        title={t("Add custom token")}
        text={t(
          "Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token.",
        )}
      />
      <AddCustomTokenForm />
    </DashboardLayout>
  )
}

const FormSchema = z.object({
  networkId: TokenBaseSchema.shape.networkId,
  contractAddress: EthereumAddressSchema,
  symbol: TokenBaseSchema.shape.symbol,
  decimals: TokenBaseSchema.shape.decimals,
  coingeckoId: TokenBaseSchema.shape.coingeckoId.optional(),
  logo: TokenBaseSchema.shape.logo.optional(),
  name: TokenBaseSchema.shape.name.optional(),

  // token created based of specs
  token: z.unknown(),
})

type FormData = z.infer<typeof FormSchema>

const AddCustomTokenForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const networks = useNetworks({ platform: "ethereum", activeOnly: true, includeTestnets: true })
  const networkOptions = useMemo(() => {
    return [...networks.concat().sort((n1, n2) => n1.name?.localeCompare(n2.name ?? "") ?? 0)]
  }, [networks])

  const form = useForm({
    defaultValues: {} as FormData,
    onSubmit: async ({ value }) => {
      try {
        if (!value.token) throw new Error("Token not found")

        const { symbol, decimals, coingeckoId, name, logo } = value
        const newToken = Object.assign({}, value.token as Token, {
          symbol,
          decimals,
          coingeckoId,
          name,
          logo,
        })

        await api.tokenUpsert(newToken)
        await activeTokensStore.setActive(newToken.id, true)

        // wait for frontend's observables to pick up the new token
        for (const _attempt of range(1, 5)) {
          if (await firstValueFrom(getToken$(newToken.id)))
            return navigate(`/settings/networks-tokens/tokens/${newToken.id}`, { replace: true })

          await sleep(300)
        }

        log.warn("Token not found after upsert, navigating back", { newToken })

        navigate(-1)
      } catch (err) {
        log.error("Failed to submit", { value, err })
        notify({
          type: "error",
          title: t("Error"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    validators: {
      onMount: ({ value }) => (FormSchema.safeParse(value).success ? null : "invalid"),
      onChange: ({ value }) => (FormSchema.safeParse(value).success ? null : "invalid"),
    },
  })

  const fldNetworkId = useField({ form, name: "networkId" })
  const fldContractAddress = useField({ form, name: "contractAddress" })

  return (
    <>
      <form
        className="my-20"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="networkId"
          children={(field) => (
            <FormFieldContainer label={t("Network")} error={field.state.meta.errors[0]}>
              <NetworkCombo
                networks={networkOptions}
                value={field.state.value ?? ""}
                placeholder={t("Select a network")}
                onChange={(networkId) => {
                  if (form.getFieldValue("contractAddress"))
                    form.setFieldValue("contractAddress", "" as `0x${string}`)
                  field.handleChange(networkId!)
                }}
                className="w-full"
              />
            </FormFieldContainer>
          )}
          validators={{
            onChange: ({ value }) => {
              if (!value) return t("Network is required")
              const network = networks.find((n) => n.id === value)
              if (!network) return t("Network not found")
              return null
            },
          }}
        />
        <form.Field
          name="contractAddress"
          children={(field) => (
            <FormFieldContainer label={t("Contract Address")} error={field.state.meta.errors[0]}>
              <FormFieldInputText
                type="text"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value as `0x${string}`)}
                spellCheck={false}
                data-lpignore
                autoComplete="off"
                disabled={!fldNetworkId.state.value}
                placeholder="0xdeadbeef...deadbeef"
                small
                after={
                  <>
                    {field.state.meta.isValidating && (
                      <LoaderIcon className="animate-spin-slow text-lg" />
                    )}
                  </>
                }
              />
            </FormFieldContainer>
          )}
          asyncDebounceMs={150}
          validators={{
            onChangeAsync: async ({ value, signal, fieldApi }) => {
              const networkId = fieldApi.form.getFieldValue("networkId") as string
              if (!networkId) return null

              try {
                const network = await firstValueFrom(getNetworkById$(networkId, "ethereum"))
                if (!network) throw new Error("Network not found")
                if (!value) throw new Error("Contract address is required")
                if (!isEthereumAddress(value)) throw new Error("Invalid address")

                const token = await getEthereumTokenInfo(network, value as `0x${string}`, signal)

                if (token) {
                  if (await firstValueFrom(getToken$(token.id))) return "Token already exists"

                  const logo = token.coingeckoId?.trim()
                    ? getGithubTokenLogoUrlByCoingeckoId(token.coingeckoId)
                    : undefined

                  fieldApi.form.setFieldValue("token", token)
                  fieldApi.form.setFieldValue("symbol", token.symbol)
                  fieldApi.form.setFieldValue("decimals", token.decimals)
                  fieldApi.form.setFieldValue("logo", logo)
                  fieldApi.form.setFieldValue("coingeckoId", token.coingeckoId ?? "")
                  fieldApi.form.setFieldValue("name", token.name ?? token.symbol)
                  fieldApi.form.validate("change")
                }
              } catch (err) {
                log.error("Failed to fetch token info", { value, err })
                fieldApi.form.setFieldValue("token", undefined)
                return (err as Error)?.message ?? t("Invalid contract address")
              }

              return null
            },
          }}
        />
        <div className="grid grid-cols-2 gap-x-12">
          <form.Field
            name="symbol"
            validators={{
              onChange: ({ value }) => {
                const parsed = TokenBaseSchema.shape.symbol.safeParse(value)
                return parsed.success
                  ? undefined
                  : (parsed.error.issues[0].message ?? t("Invalid value"))
              },
            }}
            children={(field) => (
              <FormFieldContainer label={t("Symbol")} error={field.state.meta.errors[0]}>
                <FormFieldInputText
                  name={field.name}
                  type="text"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  placeholder="TKN"
                  small
                  disabled={!fldContractAddress.state.meta.isValid}
                />
              </FormFieldContainer>
            )}
          />

          <form.Field
            name="decimals"
            validators={{
              onChange: ({ value }) => {
                const parsed = TokenBaseSchema.shape.decimals.safeParse(value)
                return parsed.success
                  ? undefined
                  : (parsed.error.issues[0].message ?? t("Invalid value"))
              },
            }}
            children={(field) => (
              <FormFieldContainer label={t("Decimals")} error={field.state.meta.errors[0]}>
                <FormFieldInputText
                  name={field.name}
                  type="number"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  placeholder="18"
                  autoComplete="off"
                  small
                  readOnly
                  disabled={!fldContractAddress.state.meta.isValid}
                />
              </FormFieldContainer>
            )}
          />

          <form.Field
            name="coingeckoId"
            validators={{
              onChange: ({ value }) => {
                const parsed = TokenBaseSchema.shape.coingeckoId.safeParse(value)
                return parsed.success
                  ? undefined
                  : (parsed.error.issues[0].message ?? t("Invalid value"))
              },
            }}
            asyncDebounceMs={200}
            children={(field) => (
              <FormFieldContainer label={t("Coingecko ID")} error={field.state.meta.errors[0]}>
                <FormFieldInputText
                  name={field.name}
                  type="text"
                  value={field.state.value ?? ""}
                  onChange={(e) => {
                    const logo = e.target.value.trim()
                      ? getGithubTokenLogoUrlByCoingeckoId(e.target.value)
                      : undefined
                    field.form.setFieldValue("logo", logo)
                    field.handleChange(e.target.value)
                  }}
                  autoComplete="off"
                  placeholder="(optional)"
                  small
                  disabled={!fldContractAddress.state.meta.isValid}
                  before={
                    <AssetLogo
                      className="mr-2 rounded-full text-[3rem]"
                      url={field.form.getFieldValue("logo")}
                    />
                  }
                />
              </FormFieldContainer>
            )}
          />

          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                const parsed = TokenBaseSchema.shape.name.safeParse(value)
                return parsed.success
                  ? undefined
                  : (parsed.error.issues[0].message ?? t("Invalid value"))
              },
            }}
            children={(field) => (
              <FormFieldContainer label={t("Name")} error={field.state.meta.errors[0]}>
                <FormFieldInputText
                  name={field.name}
                  type="text"
                  placeholder="My Custom Token"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  disabled={!fldContractAddress.state.meta.isValid}
                  small
                />
              </FormFieldContainer>
            )}
          />
        </div>

        <div className="flex justify-end gap-8 py-8">
          <Button className="h-24 w-[24rem] text-base" type="button" onClick={() => navigate(-1)}>
            {t("Cancel")}
          </Button>
          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              state.isSubmitting,
              state.isValidating,
              state.isValid,
              state.isTouched,
            ]}
            children={([canSubmit, isSubmitting, isValidating]) => (
              <Button
                primary
                icon={SaveIcon}
                className="h-24 w-[24rem] text-base"
                type="submit"
                processing={isSubmitting || isValidating}
                disabled={!canSubmit && !isSubmitting && !isValidating}
              >
                {t("Save")}
              </Button>
            )}
          />
        </div>
      </form>
    </>
  )
}

const getEthereumTokenInfo = async (
  network: EthNetwork,
  address: `0x${string}`,
  signal?: AbortSignal,
): Promise<Token | undefined> => {
  if (!network || !address) throw new Error("Network and address are required")

  if (!isEthereumAddress(address)) throw new Error("Invalid address")

  try {
    const client = getExtensionPublicClient(network)

    try {
      // try uniswapv2 contract
      return await getUniswapV2TokenInfo(client, network.id, address, signal)
    } catch (err) {
      // try erc20 contract
      return await getErc20TokenInfo(client, network.id, address, signal)
    }
  } catch (cause) {
    throw new Error("Invalid contract address", { cause })
  }
}
