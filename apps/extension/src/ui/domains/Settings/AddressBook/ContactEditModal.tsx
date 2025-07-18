import { yupResolver } from "@hookform/resolvers/yup"
import { encodeAddressSs58 } from "@talismn/crypto"
import { CopyIcon } from "@talismn/icons"
import { HexString } from "@talismn/util"
import { isAccountAddressSs58, isAddressCompatibleWithNetwork } from "extension-core"
import { keyBy } from "lodash-es"
import { FC, useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  Button,
  FormFieldContainer,
  FormFieldInputText,
  IconButton,
  Modal,
  ModalDialog,
} from "talisman-ui"
import * as yup from "yup"

import { notify } from "@talisman/components/Notifications"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useNetworks } from "@ui/state"

import { ContactNetworkPickerButton } from "./ContactNetworkModal"
import { ExistingContactModalProps } from "./types"

type FormValues = {
  name: string
  genesisHash?: HexString
}

const schema = yup.object({
  name: yup.string().required(" "),
  genesisHash: yup.mixed<HexString>(),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact edit",
}

export const ContactEditModal = ({ contact, isOpen, close }: ExistingContactModalProps) => {
  const { t } = useTranslation()

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
      name: contact.name,
      genesisHash: contact.genesisHash,
    },
  })

  const { genesisHash } = watch()

  const isAddressSs58 = useMemo(() => isAccountAddressSs58(contact), [contact])
  const dotNetworks = useNetworks({ platform: "polkadot" })

  const [compatibleNetworks, compatibleNetworksById, compatibleNetworksByGenesisHash] =
    useMemo(() => {
      const arrResult = dotNetworks.filter((n) =>
        isAddressCompatibleWithNetwork(n, contact.address),
      )
      return [arrResult, keyBy(arrResult, (n) => n.id), keyBy(arrResult, (n) => n.genesisHash)]
    }, [dotNetworks, contact.address])

  const selectedNetworkId = useMemo(() => {
    if (!genesisHash) return null
    return compatibleNetworksByGenesisHash[genesisHash]?.id ?? null
  }, [compatibleNetworksByGenesisHash, genesisHash])

  const submit = useCallback(
    async (formData: FormValues) => {
      if (!contact) return
      try {
        const { name, genesisHash } = formData
        await api.accountUpdateContact({ ...contact, name, genesisHash })
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
    [close, contact, setError],
  )

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

  const address = useMemo(() => {
    if (isAddressSs58 && genesisHash) {
      const network = compatibleNetworksByGenesisHash[genesisHash]
      if (network) return encodeAddressSs58(contact.address, network.prefix)
    }
    return contact.address
  }, [contact.address, isAddressSs58, genesisHash, compatibleNetworksByGenesisHash])

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <div id="edit-contact-modal" className="h-[60rem] w-[40rem] overflow-hidden">
        <ModalDialog title={t("Edit contact")} className="size-full overflow-hidden">
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
              <FormFieldContainer label={t("Address")}>
                <FormFieldInputText
                  type="text"
                  value={address}
                  readOnly
                  after={<CopyAddressIconButton address={address} className="text-[2rem]" />}
                />
              </FormFieldContainer>
              {isAddressSs58 && (
                <FormFieldContainer label={t("Limit to network")}>
                  <ContactNetworkPickerButton
                    networks={compatibleNetworks}
                    selected={selectedNetworkId}
                    onChange={handleNetworkChange}
                  />
                </FormFieldContainer>
              )}
            </div>
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
      </div>
    </Modal>
  )
}

const CopyAddressIconButton: FC<{ address: string; className?: string }> = ({
  address,
  className,
}) => {
  const { t } = useTranslation()
  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address)
      notify({
        type: "success",
        title: t(`Address copied`),
        subtitle: shortenAddress(address, 6, 6),
      })
    } catch (err) {
      notify({
        type: "error",
        title: t("Error"),
        subtitle: (err as Error).message ?? "Failed to copy address",
      })
    }
  }, [address, t])

  return (
    <IconButton className={className} onClick={handleClick} disabled={!address}>
      <CopyIcon />
    </IconButton>
  )
}
