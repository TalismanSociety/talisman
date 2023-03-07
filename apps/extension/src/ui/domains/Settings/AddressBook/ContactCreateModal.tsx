import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { notify } from "@talisman/components/Notifications"
import { convertAddress } from "@talisman/util/convertAddress"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { isValidSubstrateAddress } from "@talisman/util/isValidSubstrateAddress"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import useAccounts from "@ui/hooks/useAccounts"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  address: string
  addressType: AccountAddressType
}

const schema = yup.object({
  name: yup.string().required(""),
  address: yup.string().required(""),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact create",
}

export const ContactCreateModal = ({ isOpen, close }: ContactModalProps) => {
  const { add, contacts } = useAddressBook()
  const accounts = useAccounts()
  const [addressInput, setAddressInput] = useState("")

  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
    setValue,
    clearErrors,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
  })

  const ethRegex = useRef(new RegExp("^0[xX][a-fA-F0-9]{40}$"))
  // using a simple regex for this means we don't have to do an expensive isEthereumAddress call unless it looks like it might be one
  const ethAddressMatch = useMemo(
    () => ethRegex.current.test(addressInput),
    [ethRegex, addressInput]
  )

  const isValidAddressInput = useMemo(() => {
    return ethAddressMatch
      ? isEthereumAddress(addressInput.toLowerCase())
      : isValidSubstrateAddress(addressInput)
  }, [ethAddressMatch, addressInput])

  useEffect(() => {
    if (isValidAddressInput) {
      if (ethAddressMatch) setValue("addressType", "ethereum")
      else setValue("addressType", "ss58")
    }
  }, [ethAddressMatch, isValidAddressInput, setValue])

  const normalize = useCallback(
    (addr = "") =>
      !isValidAddressInput
        ? addr // don't do anything if not a valid address
        : ethAddressMatch
        ? addr.toLowerCase()
        : convertAddress(addr, null),
    [ethAddressMatch, isValidAddressInput]
  )

  const { existingContactAddresses, existingAccountAddresses } = useMemo(() => {
    const existingContacts = contacts
      .filter((c) => (ethAddressMatch ? c.addressType === "ethereum" : c.addressType === "ss58"))
      .map((c) => normalize(c.address))
    const existingAccounts = accounts
      .filter((acc) => (ethAddressMatch ? acc.type === "ethereum" : acc.type !== "ethereum"))
      .map((acc) => normalize(acc.address))
    return {
      existingContactAddresses: existingContacts,
      existingAccountAddresses: existingAccounts,
    }
  }, [contacts, accounts, ethAddressMatch, normalize])

  useEffect(() => {
    clearErrors()

    if (!addressInput || addressInput === "") return
    if (!isValidAddressInput) setError("address", { message: "Invalid Address" })
    const normalisedAddress = normalize(addressInput)
    if (existingContactAddresses.includes(normalisedAddress))
      setError("address", { message: "Address already saved in contacts" })
    else if (existingAccountAddresses.includes(normalisedAddress))
      setError("address", { message: "Cannot save a wallet address as a contact" })
    else setValue("address", normalisedAddress)
  }, [
    addressInput,
    normalize,
    isValidAddressInput,
    existingAccountAddresses,
    existingContactAddresses,
    setError,
    clearErrors,
    setValue,
  ])

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        await add({ ...formData })
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Interact",
          action: "Create address book contact",
        })
        notify({
          type: "success",
          title: "New contact added",
          subtitle: `'${formData.name}' is now in your address book`,
        })
        close()
      } catch (error) {
        setError("name", error as Error)
      }
    },
    [close, add, setError]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal open={isOpen} className="bg-black-secondary" onClose={close}>
      <ModalDialog title="Add new contact">
        <form onSubmit={handleSubmit(submit)} className="grid gap-8">
          <FormFieldContainer error={errors.name?.message} label="Name">
            <FormFieldInputText
              type="text"
              {...register("name")}
              placeholder="Contact name"
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.address?.message} label="Address">
            <FormFieldInputText
              type="text"
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Address"
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>

          <div className="flex items-stretch gap-4 pt-4">
            <Button fullWidth onClick={close}>
              Cancel
            </Button>
            <Button type="submit" fullWidth primary disabled={!isValid || isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </ModalDialog>
    </Modal>
  )
}
