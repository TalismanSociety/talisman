import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { isValidSubstrateAddress } from "@talismn/util"
import { AccountContact } from "extension-core"
import { HexString } from "extension-shared"
import { useCallback, useEffect, useMemo } from "react"
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

import { notify } from "@talisman/components/Notifications"
import { convertAddress } from "@talisman/util/convertAddress"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import { NetworkDropdown } from "@ui/domains/Portfolio/NetworkPicker"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts, useChainsMapByGenesisHash } from "@ui/state"

import { useAddressEffects, useChainsFilteredByAddressPrefix, useGenesisHashEffects } from "./hooks"
import { LimitToNetworkTooltip } from "./LimitToNetworkTooltip"
import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  searchAddress: string
  address: string
  genesisHash?: HexString
  limitToNetwork?: boolean
}

interface ValidationContext {
  accounts: string[]
  contacts: AccountContact[]
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact create",
}

const normaliseMethods = {
  ss58: (addr: string) => convertAddress(addr, null),
  ethereum: (addr: string) => addr.toLowerCase(),
}

const normalise = (address: string, addressType?: "ss58" | "ethereum") =>
  normaliseMethods[addressType || "ss58"](address)

export const ContactCreateModal = ({ isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation("admin")
  const { add, contacts } = useAddressBook()
  const accounts = useAccounts()

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
            const context = ctx.options.context as ValidationContext
            if (!value) return false
            const isEthAddress = isEthereumAddress(value)

            const isValidAddress = isEthAddress || isValidSubstrateAddress(value)

            if (!isValidAddress) return ctx.createError({ message: t("Invalid Address") })

            const normalised = normalise(value, isEthAddress ? "ethereum" : "ss58")
            const { accounts, contacts } = context

            const contact = contacts.find((c) => isAddressEqual(c.address, normalised))

            if (!contact && accounts.includes(normalised))
              return ctx.createError({ message: t("Cannot save a wallet address as a contact") })

            if (contact) {
              // existing contact is limited to a single network
              if (contact.genesisHash)
                return ctx.createError({
                  message: t("Address already saved as a network-limited contact"),
                })

              // existing contact is a multichain contact
              return ctx.createError({ message: t("Contact already exists") })
            }
            return true
          }),
        genesisHash: yup.mixed<HexString>(),
        limitToNetwork: yup.bool(),
      }),
    [t],
  )

  const { existingNormalisedContacts, existingAccountAddresses } = useMemo(
    () => ({
      existingNormalisedContacts: contacts,
      existingAccountAddresses: accounts.map((acc) => normalizeAddress(acc.address)),
    }),
    [contacts, accounts],
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
    context: {
      contacts: existingNormalisedContacts,
      accounts: existingAccountAddresses,
    },
    mode: "all",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen, reset])

  const { searchAddress, genesisHash, limitToNetwork } = watch()

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

  const { address } = watch()
  const chains = useChainsFilteredByAddressPrefix(address)
  const chainsByGenesisHash = useChainsMapByGenesisHash()
  const setGenesisHash = useCallback(
    (genesisHash?: HexString) =>
      setValue("genesisHash", genesisHash, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }),
    [setValue],
  )
  useGenesisHashEffects(chains, genesisHash, setGenesisHash)
  const setLimitToNetwork = useCallback(
    (limitToNetwork?: boolean) =>
      setValue("limitToNetwork", limitToNetwork, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }),
    [setValue],
  )
  useAddressEffects(address, setLimitToNetwork)
  const showLimitToNetworkControl = useMemo(() => chains.length !== 0, [chains])

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        const { name, address, genesisHash, limitToNetwork } = formData
        await add({
          name,
          address,
          genesisHash: limitToNetwork ? genesisHash : undefined,
        })
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
    [close, add, setError, t],
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog title="Add new contact">
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
            <Button type="submit" fullWidth primary processing={isSubmitting} disabled={!isValid}>
              {t("Save")}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </Modal>
  )
}
