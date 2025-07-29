import { yupResolver } from "@hookform/resolvers/yup"
import {
  getAccountPlatformFromAddress,
  isAddressEqual,
  isAddressValid,
  isSs58Address,
} from "@talismn/crypto"
import { HexString } from "@talismn/util"
import { keyBy } from "lodash-es"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText, Modal, ModalDialog } from "talisman-ui"
import * as yup from "yup"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts } from "@ui/state"

import { ContactNetworkPickerButton } from "./ContactNetworkModal"
import { useChainsFilteredByAddressPrefix } from "./hooks"
import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  searchAddress: string
  address: string
  genesisHash?: HexString
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact create",
}

export const ContactCreateModal = ({ isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation()
  const accounts = useAccounts("all")

  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required(" "),
        searchAddress: yup.string().required(" "),
        address: yup
          .string()
          .required(" ")
          .transform((value) => value.trim())
          .test("is-valid", t("Address is not valid"), (value, ctx) => {
            if (!value) return false
            if (!isAddressValid(value))
              return ctx.createError({ message: t("Address is not valid") })

            const encoding = getAccountPlatformFromAddress(value)
            switch (encoding) {
              case "polkadot":
              case "ethereum":
              case "solana":
                break
              default:
                return ctx.createError({ message: t("Unsupported address type") })
            }

            const existing = accounts.find((c) => isAddressEqual(c.address, value))
            if (existing)
              return existing.type === "contact"
                ? existing.genesisHash
                  ? ctx.createError({
                      message: t("Address already saved as a network-limited contact"),
                    })
                  : ctx.createError({ message: t("Contact already exists") })
                : ctx.createError({ message: t("That address is already part of your wallet") })

            return true
          }),
        genesisHash: yup.mixed<HexString>(),
      }),
    [accounts, t],
  )

  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
    setValue,
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen, reset])

  const { searchAddress, address, genesisHash } = watch()
  const isAddressSs58 = useMemo(() => isSs58Address(address), [address])

  useEffect(() => {
    // reset genesisHash if address changes
    setValue("genesisHash", undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }, [setValue, searchAddress])

  const [nsLookup, { nsLookupType, isNsLookup, isNsFetching }] = useResolveNsName(searchAddress)
  useEffect(() => {
    if (!isNsLookup) {
      setValue("address", searchAddress, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
      return
    }

    if (isNsFetching) {
      // while querying NS service the address should be empty so form is invalid without displaying an error
      setValue("address", "", { shouldValidate: true })
    } else
      setValue("address", nsLookup ?? (nsLookup === null ? "invalid" : ""), {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
  }, [nsLookup, isNsLookup, searchAddress, setValue, isNsFetching])

  const compatibleNetworks = useChainsFilteredByAddressPrefix(address)
  const [compatibleNetworksById, compatibleNetworksByGenesisHash] = useMemo(
    () => [keyBy(compatibleNetworks, (n) => n.id), keyBy(compatibleNetworks, (n) => n.genesisHash)],
    [compatibleNetworks],
  )

  const selectedNetworkId = useMemo(() => {
    if (!genesisHash) return null
    return compatibleNetworksByGenesisHash[genesisHash]?.id ?? null
  }, [compatibleNetworksByGenesisHash, genesisHash])

  const handleNetworkChange = useCallback(
    (networkId: string | null) => {
      const genesisHash = networkId
        ? compatibleNetworksById[networkId ?? ""]?.genesisHash
        : undefined
      setValue("genesisHash", genesisHash, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    },
    [compatibleNetworksById, setValue],
  )

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        const { name, address, genesisHash } = formData
        await api.accountAddExternal([
          {
            type: "contact",
            name,
            address,
            genesisHash,
          },
        ]),
          sendAnalyticsEvent({
            ...ANALYTICS_PAGE,
            name: "Interact",
            action: "Create address book contact",
          })
        notify({
          type: "success",
          title: t("New contact added"),
          subtitle: t("'{{name}}' is now in your address book", { name: formData.name }),
        })
        close()
      } catch (error) {
        setError("address", { message: (error as Error).message }, { shouldFocus: true })
      }
    },
    [close, setError, t],
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <div id="create-contact-modal" className="h-[60rem] w-[40rem] overflow-hidden">
        <ModalDialog title={t("Add new contact")} className="size-full overflow-hidden">
          <form onSubmit={handleSubmit(submit)} className="flex size-full flex-col overflow-hidden">
            <div className="grow">
              <FormFieldContainer error={errors.name?.message} label={t("Name")}>
                <FormFieldInputText
                  type="text"
                  {...register("name")}
                  placeholder={t("Contact name")}
                  autoComplete="off"
                  spellCheck="false"
                />
              </FormFieldContainer>
              <FormFieldContainer error={errors.address?.message} label={t("Address")}>
                <FormFieldInputText
                  type="text"
                  {...register("searchAddress")}
                  placeholder={t("Address")}
                  autoComplete="off"
                  spellCheck="false"
                  /* Fixes implicit min-width of approx. 180px */
                  size={1}
                  after={
                    <AddressFieldNsBadge
                      nsLookup={nsLookup}
                      nsLookupType={nsLookupType}
                      isNsLookup={isNsLookup}
                      isNsFetching={isNsFetching}
                    />
                  }
                />
              </FormFieldContainer>
              {isAddressSs58 && (
                <FormFieldContainer label={t("Limit to network")}>
                  <ContactNetworkPickerButton
                    networks={compatibleNetworks}
                    selected={selectedNetworkId}
                    onChange={handleNetworkChange}
                    containerId="create-contact-modal"
                  />
                </FormFieldContainer>
              )}
            </div>
            <div className="flex items-stretch gap-4 pt-4">
              <Button fullWidth onClick={close}>
                {t("Cancel")}
              </Button>
              <Button type="submit" fullWidth primary processing={isSubmitting} disabled={!isValid}>
                {t("Save")}
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    </Modal>
  )
}
