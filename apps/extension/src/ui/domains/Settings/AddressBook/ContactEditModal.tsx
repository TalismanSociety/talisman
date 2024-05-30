import { yupResolver } from "@hookform/resolvers/yup"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Address } from "@ui/domains/Account/Address"
import { NetworkDropdown } from "@ui/domains/Portfolio/NetworkPicker"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useAllChainsMapByGenesisHash } from "@ui/hooks/useChains"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  Button,
  Checkbox,
  FormFieldContainer,
  FormFieldInputText,
  Modal,
  ModalDialog,
} from "talisman-ui"
import * as yup from "yup"

import { useChainsFilteredByAddressPrefix, useGenesisHashEffects } from "./hooks"
import { LimitToNetworkTooltip } from "./LimitToNetworkTooltip"
import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  genesisHash?: string
  limitToNetwork?: boolean
}

const schema = yup.object({
  name: yup.string().required(""),
  genesisHash: yup.string(),
  limitToNetwork: yup.bool(),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact edit",
}

export const ContactEditModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation("admin")
  const { edit } = useAddressBook()

  const {
    register,
    handleSubmit,
    formState: { isValid, errors },
    setError,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
    defaultValues: {
      name: contact ? contact.name : "",
      genesisHash: contact ? contact.genesisHash : undefined,
      limitToNetwork: Boolean(contact ? contact.genesisHash : undefined),
    },
  })

  const { genesisHash, limitToNetwork } = watch()
  const chains = useChainsFilteredByAddressPrefix(contact?.address)
  const chainsByGenesisHash = useAllChainsMapByGenesisHash()
  const setGenesisHash = useCallback(
    (genesisHash?: string) =>
      setValue("genesisHash", genesisHash, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }),
    [setValue]
  )
  useGenesisHashEffects(chains, genesisHash, setGenesisHash)
  const showLimitToNetworkControl = useMemo(() => chains.length !== 0, [chains])

  const submit = useCallback(
    async (formData: FormValues) => {
      if (!contact) return
      try {
        const { name, genesisHash, limitToNetwork } = formData
        await edit({
          ...contact,
          name,
          genesisHash: limitToNetwork ? genesisHash : undefined,
        })
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Interact",
          action: "Edit address book contact",
        })
        close()
      } catch (error) {
        setError("name", error as Error)
      }
    },
    [close, contact, edit, setError]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Edit contact")}>
        <form onSubmit={handleSubmit(submit)} className="grid gap-8">
          <FormFieldContainer error={errors.name?.message} label={t("Name")}>
            <FormFieldInputText
              type="text"
              {...register("name")}
              placeholder={t("Contact name")}
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>
          <div>
            <div className="text-body-secondary block text-xs">{t("Address")}</div>
            <Address
              className="mt-3 block bg-none text-xs text-white"
              address={contact?.address ?? ""}
              noShorten
            />
          </div>
          {showLimitToNetworkControl && (
            <>
              <Checkbox
                childProps={{ className: "flex items-center gap-2" }}
                {...register("limitToNetwork")}
              >
                {t("Limit to Network")}
                <LimitToNetworkTooltip />
              </Checkbox>
              {limitToNetwork && (
                <NetworkDropdown
                  placeholder={t("Select network")}
                  networks={chains}
                  value={chainsByGenesisHash[genesisHash!]}
                  onChange={(c) =>
                    setValue("genesisHash", c?.genesisHash ?? undefined, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                />
              )}
            </>
          )}
          <div className="flex items-stretch gap-4 pt-4">
            <Button fullWidth onClick={close}>
              {t("Cancel")}
            </Button>
            <Button type="submit" fullWidth primary disabled={!isValid}>
              {t("Save")}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </Modal>
  )
}
