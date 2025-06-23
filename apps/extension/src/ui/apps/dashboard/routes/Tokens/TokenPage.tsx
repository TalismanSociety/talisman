/* eslint-disable react/no-children-prop */
import * as Sentry from "@sentry/browser"
import {
  getCleanToken,
  isTokenCustom,
  isTokenDot,
  isTokenInTypes,
  isTokenKnown,
  Token,
  TokenBaseSchema,
} from "@talismn/chaindata-provider"
import { CopyIcon, ExternalLinkIcon, RotateCcwIcon, SaveIcon } from "@talismn/icons"
import { useForm } from "@tanstack/react-form"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  FormFieldContainer,
  FormFieldInputText,
  IconButton,
  Modal,
  ModalDialog,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { TokenTypePill } from "@ui/domains/Asset/TokenTypePill"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useActivableToken } from "@ui/hooks/useKnownEvmToken"
import { useNetwork, useToken } from "@ui/state"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Token Details",
}

export const TokenPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<"id">()
  const token = useToken(id)
  const network = useNetwork(token?.networkId)
  const navigate = useNavigate()

  useEffect(() => {
    // if token doesn't exist, redirect to tokens page
    if (token === null) navigate("/tokens")
  }, [token, navigate])

  useAnalyticsPageView(ANALYTICS_PAGE, { id })

  if (!token || !network) return null // TODO message ?

  return (
    <DashboardLayout sidebar="settings">
      <HeaderBlock
        title={
          <div className="flex items-center justify-between gap-5">
            {t("{{tokenSymbol}} on {{networkName}}", {
              tokenSymbol: token.symbol,
              networkName: network.name,
            })}
            <TokenTypePill type={token.type} />
          </div>
        }
        text={t(
          "Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token.",
        )}
      />
      <TokenForm token={token} />
    </DashboardLayout>
  )
}

const TokenForm: FC<{ token: Token }> = ({ token }) => {
  const { t } = useTranslation()
  const ocConfirmRemove = useOpenClose()
  const network = useNetwork(token.networkId)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: getCleanToken(token),
    onSubmit: async ({ value }) => {
      try {
        await api.tokenUpsert(value)

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
  })

  const { isActive, setActive, isActiveSetByUser, resetToTalismanDefault } =
    useActivableToken(token)

  return (
    <>
      <form
        className="my-20"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div>
          <FormFieldContainer label="Network">
            <FormFieldInputText
              type="text"
              value={network?.name}
              spellCheck={false}
              data-lpignore
              autoComplete="off"
              disabled
              small
              before={<ChainLogo id={token.networkId} className="size-12" />}
            />
          </FormFieldContainer>
          {isTokenInTypes(token, ["substrate-assets"]) && (
            <FormFieldContainer label={t("Asset ID")}>
              <FormFieldInputText
                type="number"
                value={token.assetId}
                spellCheck={false}
                data-lpignore
                autoComplete="off"
                disabled
                small
                after={
                  <div className="flex items-center gap-4">
                    <IconButton>
                      <ExternalLinkIcon />
                    </IconButton>
                    <IconButton>
                      <CopyIcon />
                    </IconButton>
                  </div>
                }
              />
            </FormFieldContainer>
          )}
          {isTokenInTypes(token, ["substrate-tokens", "substrate-foreignassets"]) && (
            <FormFieldContainer label={t("Token ID")}>
              <FormFieldInputText
                type="text"
                value={token.onChainId}
                spellCheck={false}
                data-lpignore
                autoComplete="off"
                disabled
                small
                after={
                  <div className="flex items-center gap-4">
                    <IconButton>
                      <ExternalLinkIcon />
                    </IconButton>
                    <IconButton>
                      <CopyIcon />
                    </IconButton>
                  </div>
                }
              />
            </FormFieldContainer>
          )}
          {isTokenInTypes(token, ["evm-erc20", "evm-uniswapv2", "substrate-psp22"]) && (
            <FormFieldContainer label={t("Contract Address")}>
              <FormFieldInputText
                type="text"
                value={token.contractAddress}
                spellCheck={false}
                data-lpignore
                autoComplete="off"
                disabled
                small
                after={
                  <div className="flex items-center gap-4">
                    <IconButton>
                      <ExternalLinkIcon />
                    </IconButton>
                    <IconButton>
                      <CopyIcon />
                    </IconButton>
                  </div>
                }
              />
            </FormFieldContainer>
          )}
        </div>
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  small
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)} // TODO or just value ?
                  placeholder="0"
                  autoComplete="off"
                  small
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
            children={(field) => (
              <FormFieldContainer label={t("Coingecko ID")} error={field.state.meta.errors[0]}>
                <FormFieldInputText
                  name={field.name}
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  small
                  before={token && <AssetLogoBase className="mr-2 text-[3rem]" url={token?.logo} />} // TODO
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  small
                />
              </FormFieldContainer>
            )}
          />

          {isTokenDot(token) && (
            <form.Field
              name="existentialDeposit"
              validators={{
                onChange: ({ value }) => {
                  const parsed = TokenBaseSchema.shape.name.safeParse(value)
                  return parsed.success
                    ? undefined
                    : (parsed.error.issues[0].message ?? t("Invalid value"))
                },
              }}
              children={(field) => (
                <FormFieldContainer
                  label={t("Existential Deposit")}
                  error={field.state.meta.errors[0]}
                >
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
          )}
        </div>
        <div>
          <FormFieldContainer label={t("Display balances")}>
            <div className="flex gap-3">
              <Toggle checked={isActive} onChange={(e) => setActive(e.target.checked)}>
                <span className={"text-grey-300"}>{isActive ? t("Yes") : t("No")}</span>
              </Toggle>
              {isActiveSetByUser && (
                <Tooltip>
                  <TooltipTrigger
                    className="text-primary text-xs"
                    type="button"
                    onClick={resetToTalismanDefault}
                  >
                    <RotateCcwIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>{t("Reset to default")}</div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </FormFieldContainer>
        </div>
        <div className="flex justify-end gap-8 py-8">
          {isTokenCustom(token) && (
            <Button
              className="h-24 w-[24rem] text-base"
              type="button"
              disabled={!isTokenCustom(token)}
              onClick={ocConfirmRemove.open}
            >
              {isTokenKnown(token) ? t("Reset") : t("Remove")}
            </Button>
          )}
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
            children={([canSubmit, isSubmitting, isDirty]) => (
              <Button
                primary
                icon={SaveIcon}
                className="h-24 w-[24rem] text-base"
                type="submit"
                processing={isSubmitting}
                disabled={!isSubmitting && (!canSubmit || !isDirty)}
              >
                {t("Save")}
              </Button>
            )}
          />
        </div>
      </form>
      <Modal isOpen={ocConfirmRemove.isOpen} onDismiss={ocConfirmRemove.close}>
        <ConfirmRemove onClose={ocConfirmRemove.close} token={token} />
      </Modal>
    </>
  )
}

const ConfirmRemove: FC<{
  token: Token
  onClose: () => void
}> = ({ token, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // keep initial one to prevent symbol to disappear when deleting it
  const [saved] = useState<Token>(() => token)

  const [confirming, setConfirming] = useState(false)
  const handleRemove = useCallback(async () => {
    setConfirming(true)
    try {
      if (!isTokenCustom(token)) throw new Error(t("Cannot remove built-in tokens"))

      await api.tokenRemove(token.id)
      isTokenKnown(saved) ? onClose() : navigate(-1)
    } catch (err) {
      Sentry.captureException(err)
      notify({
        type: "error",
        title: t("Error"),
        subtitle: (err as Error).message ?? t("Failed to remove"),
      })
      setConfirming(false)
    }
  }, [token, t, saved, onClose, navigate])

  return (
    <ModalDialog
      title={isTokenKnown(saved) ? t("Reset Token") : t("Remove Token")}
      onClose={onClose}
    >
      <div className="text-body-secondary mt-4 space-y-16">
        <div className="text-base">
          {isTokenKnown(saved) ? (
            <Trans t={t}>
              This will reset <span className="text-body">{saved?.symbol}</span> to its Talisman
              default state. Are you sure you want to continue ?
            </Trans>
          ) : (
            <Trans t={t}>
              Are you sure you want to remove <span className="text-body">{saved?.symbol}</span>{" "}
              from your token list ?
            </Trans>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button primary onClick={handleRemove} processing={confirming}>
            {t("Remove")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
