import { AddressBookContact } from "@core/domains/app/store.addressBook"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { Address } from "@ui/domains/Account/Address"
import { useAddressBook } from "@ui/hooks/useAddressBook"
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
        close()
      } catch (error) {
        setError("name", error as Error)
      }
    },
    [close, contact, edit, setError]
  )

  return (
    <Modal open={isOpen} className="bg-black-secondary">
      <ModalDialog title="Edit contact">
        <p className="text-body-secondary text-sm">
          Edit contact with address {<Address className="address" address={contact.address} />}
        </p>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <FormField error={errors.name} label="Name">
            <input
              type="text"
              {...register("name")}
              placeholder="Contact name"
              autoComplete="off"
              spellCheck="false"
            />
          </FormField>
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
