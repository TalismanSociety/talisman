import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"
import * as yup from "yup"

import { ContactModalProps } from "./types"

type FormValues = {
  name: string
}

const schema = yup.object({
  name: yup.string().required(""),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact edit",
}

export const ContactEditModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { edit } = useAddressBook()
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
    defaultValues: { name: contact.name },
  })

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        await edit({ ...contact, ...formData })
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
    <Modal open={isOpen} className="bg-black-secondary">
      <ModalDialog title="Edit contact">
        <form onSubmit={handleSubmit(submit)} className="grid gap-8">
          <FormField error={errors.name} label="Name">
            <input
              type="text"
              {...register("name")}
              placeholder="Contact name"
              autoComplete="off"
              spellCheck="false"
            />
          </FormField>
          <div>
            <span className="text-body-secondary block">Address</span>
            <span className="mt-10 block bg-none text-xs text-white">{contact.address}</span>
          </div>
          <div className="flex items-stretch gap-4 pt-4">
            <Button fullWidth onClick={close}>
              Cancel
            </Button>
            <Button type="submit" fullWidth primary disabled={!isValid}>
              Save
            </Button>
          </div>
        </form>
      </ModalDialog>
    </Modal>
  )
}
