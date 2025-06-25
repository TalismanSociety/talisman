/* eslint-disable react/no-children-prop */
import { getGithubTokenLogoUrlByCoingeckoId, NetworkBaseSchema } from "@talismn/chaindata-provider"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"

import { useNetworkForm } from "./context"

export const NativeTokenFields = () => {
  const { t } = useTranslation()
  const { form } = useNetworkForm()

  return (
    <div className="grid grid-cols-2 gap-x-12">
      <form.Field
        name="nativeCurrency.symbol"
        validators={{
          onChange: ({ value }) => {
            const parsed = NetworkBaseSchema.shape.nativeCurrency.shape.symbol.safeParse(value)
            return parsed.success
              ? undefined
              : (parsed.error.issues[0].message ?? t("Invalid value"))
          },
        }}
        children={(field) => (
          <FormFieldContainer label={t("Native Token Symbol")} error={field.state.meta.errors[0]}>
            <FormFieldInputText
              name={field.name}
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              autoComplete="off"
              small
            />
          </FormFieldContainer>
        )}
      />

      <form.Field
        name="nativeCurrency.decimals"
        validators={{
          onChange: ({ value }) => {
            const parsed = NetworkBaseSchema.shape.nativeCurrency.shape.decimals.safeParse(value)
            return parsed.success
              ? undefined
              : (parsed.error.issues[0].message ?? t("Invalid value"))
          },
        }}
        children={(field) => (
          <FormFieldContainer label={t("Native Token Decimals")} error={field.state.meta.errors[0]}>
            <FormFieldInputText
              name={field.name}
              type="number"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.valueAsNumber)}
              placeholder="0"
              autoComplete="off"
              readOnly
              small
            />
          </FormFieldContainer>
        )}
      />

      <form.Field
        name="nativeCurrency.coingeckoId"
        validators={{
          onChange: ({ value }) => {
            const parsed = NetworkBaseSchema.shape.nativeCurrency.shape.coingeckoId.safeParse(value)
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
              before={
                <AssetLogoBase
                  className="mr-2 rounded-full text-[3rem]"
                  url={
                    field.state.value ? getGithubTokenLogoUrlByCoingeckoId(field.state.value) : null
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
            const parsed = NetworkBaseSchema.shape.nativeCurrency.shape.name.safeParse(value)
            return parsed.success
              ? undefined
              : (parsed.error.issues[0].message ?? t("Invalid value"))
          },
        }}
        children={(field) => (
          <FormFieldContainer label={t("Native Token Name")} error={field.state.meta.errors[0]}>
            <FormFieldInputText
              name={field.name}
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              autoComplete="off"
              small
            />
          </FormFieldContainer>
        )}
      />
    </div>
  )
}
