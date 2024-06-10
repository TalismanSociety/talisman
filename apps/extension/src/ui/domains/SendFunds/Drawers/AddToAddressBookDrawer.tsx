import { AddressBookContact } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { convertAddress } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Address } from "@ui/domains/Account/Address"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { LimitToNetworkTooltip } from "@ui/domains/Settings/AddressBook/LimitToNetworkTooltip"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { FC, FormEventHandler, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Button, Checkbox, Drawer, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { AccountIcon } from "../../Account/AccountIcon"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Send Funds",
  featureVersion: 1,
  page: "Add to address book",
}

type FormValues = {
  name: string
  limitToNetwork?: boolean
}

const schema = yup.object({
  name: yup.string().trim().required(""),
  limitToNetwork: yup.bool(),
})

const AddToAddressBookDrawerForm: FC<{
  address: string
  addressType: AddressBookContact["addressType"]
  tokenGenesisHash?: string
  onClose?: () => void
}> = ({ address, addressType, tokenGenesisHash, onClose }) => {
  const { t } = useTranslation("send-funds")
  const { add } = useAddressBook()
  const isGenericAddress = useMemo(
    () => addressType === "ss58" && address === convertAddress(address, null),
    [address, addressType]
  )
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
    reset,
    setFocus,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
    defaultValues: { limitToNetwork: !isGenericAddress },
  })

  const { limitToNetwork } = watch()
  const chain = useChainByGenesisHash(tokenGenesisHash)

  const submit = useCallback(
    async ({ name, limitToNetwork }: FormValues) => {
      try {
        await add({
          name,
          address,
          addressType,
          genesisHash: limitToNetwork ? tokenGenesisHash : undefined,
        })
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Interact",
          action: "Add address book contact",
          properties: {
            addressType,
          },
        })
        onClose?.()
      } catch (err) {
        setError("name", err as Error)
      }
    },
    [add, address, addressType, tokenGenesisHash, onClose, setError]
  )

  // don't bubble up submit event, in case we're in another form (send funds)
  const submitWithoutBubbleUp: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      handleSubmit(submit)(e)
      e.stopPropagation()
    },
    [handleSubmit, submit]
  )

  useEffect(() => {
    setTimeout(() => {
      setFocus("name")
    }, 250)
  }, [setFocus, reset])

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <form
      className="bg-grey-800 flex h-[26.8rem] flex-col justify-end rounded-t-xl p-12"
      onSubmit={submitWithoutBubbleUp}
    >
      <header className="flex flex-col items-center justify-center gap-6">
        <AccountIcon
          className="text-xl"
          address={address}
          genesisHash={limitToNetwork ? tokenGenesisHash : undefined}
        />
        <span className="font-bold">
          <Address className="address" address={address} endCharCount={6} startCharCount={6} />
        </span>
      </header>
      <section className="my-4 mt-10">
        <FormFieldContainer error={errors.name?.message}>
          <FormFieldInputText
            {...register("name")}
            placeholder={t("Contact name")}
            autoComplete="off"
          />
        </FormFieldContainer>
        {tokenGenesisHash ? (
          <Checkbox
            childProps={{ className: "flex items-center gap-2" }}
            {...register("limitToNetwork")}
          >
            <Trans
              t={t}
              defaults="Limit to <Chain><ChainLogo />{{chainName}}</Chain>"
              components={{
                Chain: <div className="text-body inline-flex items-baseline gap-1" />,
                ChainLogo: <ChainLogo className="self-center" id={chain?.id} />,
              }}
              values={{ chainName: chain?.name }}
            />
            <LimitToNetworkTooltip />
          </Checkbox>
        ) : null}
      </section>
      <footer className="grid grid-cols-2 gap-8">
        <Button fullWidth onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          className="disabled:bg-grey-750"
          type="submit"
          fullWidth
          primary
          processing={isSubmitting}
          disabled={!isValid}
        >
          {t("Save")}
        </Button>
      </footer>
    </form>
  )
}

export const AddToAddressBookDrawer: FC<{
  isOpen: boolean
  close: () => void
  address: string
  addressType: AddressBookContact["addressType"]
  tokenGenesisHash?: string
  containerId?: string
  asChild?: boolean
}> = ({ address, addressType, tokenGenesisHash, containerId, isOpen, close }) => {
  return (
    <Drawer isOpen={isOpen} anchor="bottom" onDismiss={close} containerId={containerId}>
      <AddToAddressBookDrawerForm
        address={address}
        addressType={addressType}
        tokenGenesisHash={tokenGenesisHash}
        onClose={close}
      />
    </Drawer>
  )
}
