/* eslint-disable react/no-children-prop */
import * as Sentry from "@sentry/browser"
import {
  getGithubTokenLogoUrlByCoingeckoId,
  isNetworkCustom,
  isNetworkDot,
  isNetworkEth,
  isNetworkKnown,
  Network,
  NetworkBaseSchema,
} from "@talismn/chaindata-provider"
import { CopyIcon, RotateCcwIcon, SaveIcon } from "@talismn/icons"
import { t } from "i18next"
import { FC, useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  Checkbox,
  FormFieldContainer,
  FormFieldInputText,
  IconButton,
  Modal,
  ModalDialog,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"
import { z } from "zod/v4"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useActivableNetwork } from "@ui/hooks/useActivableNetwork"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useAnyNetwork } from "@ui/state"

import { NetworkFormProvider, useNetworkForm } from "./context"
import { NetworkRpcsField } from "./NetworkRpcsField"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Network",
}

export const EditNetworkPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<"id">()
  const network = useAnyNetwork(id)

  useAnalyticsPageView(ANALYTICS_PAGE, {
    id,
    mode: network ? "Edit" : "Add",
  })

  if (!network) return null

  return (
    <DashboardLayout sidebar="settings">
      <HeaderBlock
        title={t("Network settings for {{name}}", { name: network.name })}
        text={
          <Trans
            t={t}
            defaults="Only ever add RPCs you trust.<br />RPCs will automatically cycle in the order of priority defined here in case of any errors."
          />
        }
      />
      <NetworkFormProvider network={network}>
        <NetworkForm />
      </NetworkFormProvider>
    </DashboardLayout>
  )
}

const NetworkForm: FC = () => {
  const { t } = useTranslation()
  const ocConfirmRemove = useOpenClose()

  const { form, network } = useNetworkForm()

  const { isActive, setActive, isActiveSetByUser, resetToTalismanDefault } =
    useActivableNetwork(network)

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
        <div className="grid grid-cols-3 gap-12">
          <div className={!isNetworkEth(network) ? "col-span-3" : "col-span-2"}>
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
                    before={<NetworkLogo networkId={network.id} className="size-12" />}
                  />
                </FormFieldContainer>
              )}
            />
          </div>
          {isNetworkEth(network) && (
            <div>
              <FormFieldContainer label="Chain ID">
                <FormFieldInputText
                  type="text"
                  value={network.id}
                  readOnly
                  spellCheck={false}
                  data-lpignore
                  autoComplete="off"
                  small
                  containerProps={{ className: "pr-8" }}
                  after={<CopyChainIdButton chainId={network.id} className="text-[2rem]" />}
                />
              </FormFieldContainer>
            </div>
          )}
        </div>
        <NetworkRpcsField />
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
          {isNetworkDot(network) && (
            <div>
              <form.Field
                name="hasCheckMetadataHash"
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
          {isNetworkEth(network) && (
            <div>
              <form.Field
                name="preserveGasEstimate"
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
          <div className="mt-8">
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
            {isNetworkCustom(network) && (
              <Button
                className="h-24 w-[24rem] text-base"
                type="button"
                onClick={ocConfirmRemove.open}
              >
                {isNetworkKnown(network) ? t("Reset") : t("Remove")}
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
        </div>
      </form>
      <Modal isOpen={ocConfirmRemove.isOpen} onDismiss={ocConfirmRemove.close}>
        <ConfirmRemove onClose={ocConfirmRemove.close} network={network} />
      </Modal>
    </>
  )
}

const CopyChainIdButton: FC<{ chainId: string; className?: string }> = ({ chainId, className }) => {
  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chainId)
      notify({
        type: "success",
        title: t(`Chain ID copied`),
        subtitle: chainId,
      })
    } catch (err) {
      notify({
        type: "error",
        title: "Error",
        subtitle: (err as Error).message ?? "Failed to chain ID",
      })
    }
  }, [chainId])

  if (!chainId) return null

  return (
    <IconButton className={className} onClick={handleClick}>
      <CopyIcon />
    </IconButton>
  )
}

const ConfirmRemove: FC<{
  network: Network
  onClose: () => void
}> = ({ network, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // keep initial one to prevent name to disappear when deleting it
  const [saved] = useState(() => network)

  const [confirming, setConfirming] = useState(false)
  const handleRemove = useCallback(async () => {
    setConfirming(true)
    try {
      if (!isNetworkCustom(network)) throw new Error(t("Cannot remove built-in networks"))

      await api.networkRemove(network.id)
      isNetworkKnown(saved) ? onClose() : navigate(-1)
    } catch (err) {
      Sentry.captureException(err)
      notify({
        type: "error",
        title: t("Error"),
        subtitle: (err as Error).message ?? t("Failed to remove"),
      })
      setConfirming(false)
    }
  }, [network, t, saved, onClose, navigate])

  return (
    <ModalDialog
      title={isNetworkKnown(saved) ? t("Reset Token") : t("Remove Token")}
      onClose={onClose}
    >
      <div className="text-body-secondary mt-4 space-y-16">
        <div className="text-base">
          {isNetworkKnown(saved) ? (
            <Trans t={t}>
              This will reset <span className="text-body">{saved?.name}</span> to its Talisman
              default state. Are you sure you want to continue ?
            </Trans>
          ) : (
            <Trans t={t}>
              Are you sure you want to remove <span className="text-body">{saved?.name}</span> from
              your token list ?
            </Trans>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button primary onClick={handleRemove} processing={confirming}>
            {isNetworkKnown(saved) ? t("Reset") : t("Remove")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
