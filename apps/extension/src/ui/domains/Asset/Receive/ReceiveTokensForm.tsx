import { AccountJsonAny } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
import { Dropdown, RenderItemFunc } from "@talisman/components/Dropdown"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { CheckIcon, CopyIcon } from "@talisman/theme/icons"
import Account from "@ui/domains/Account"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import useAccounts from "@ui/hooks/useAccounts"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import * as yup from "yup"

import { useReceiveTokensModal } from "./ReceiveTokensModalContext"

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  height: 18rem;
`

const AccountDropDown = styled(Dropdown)<AccountJsonAny>`
  z-index: 1;
  display: block;

  button {
    width: 100%;
    height: 56px;
    padding: 0 1.6rem;
    align-items: center;
    > span,
    > span * {
      max-height: none;
    }

    .account-name > .text > .account-name-row .copy {
      display: none;
    }

    > span + span > svg {
      font-size: 2.4rem;
    }
    .copy {
      display: none;
    }
  }

  > ul {
    top: 5.2rem;

    > li {
      padding: 0.8rem 1.6rem;
      opacity: 0.8;

      .account-name > .text > .account-name-row {
        color: var(--color-mid);
        opacity: 0.8;
      }

      &[aria-selected="true"] {
        opacity: 1;
        background-color: #333333;
        .account-name > .text > .account-name-row {
          opacity: 1;
        }
      }
    }
  }
`

const Button = styled(SimpleButton)`
  width: 100%;
  font-size: 1.8rem;
  height: 5.6rem;

  :disabled {
    background: var(--color-background-muted-3x);
    border: none;
    color: var(--color-background-muted-2x);
    opacity: 1;
  }
`

const Caption = styled.div`
  color: var(--color-background-muted-2x);
  font-size: var(--font-size-small);
  line-height: var(--font-size-small);
`

const renderAccountItem: RenderItemFunc<AccountJsonAny> = (account, key) => {
  return <Account.Name withAvatar address={account?.address} />
}

type FormData = {
  address: string
}

const schema = yup.object({
  address: yup.string().required(""),
})

export const ReceiveTokensForm = () => {
  const accounts = useAccounts()
  const { close } = useReceiveTokensModal()
  const { open: openCopyAddressModal } = useAddressFormatterModal()
  const [isCopied, setIsCopied] = useState(false)

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    mode: "all",
    resolver: yupResolver(schema),
  })

  const address = watch("address")

  useEffect(() => {
    setIsCopied(false)
  }, [address])

  const { isPolkadot } = useMemo(() => {
    const account = accounts.find((acc) => acc.address === address)
    const isEthAddress = isEthereumAddress(account?.address)
    return {
      isEthereum: account ? isEthAddress : false,
      isPolkadot: account ? !isEthAddress : false,
    }
  }, [accounts, address])

  const submit = useCallback(
    async (formData: FormData) => {
      if (!formData.address) throw new Error("Address not found")

      const account = accounts.find(({ address }) => address === formData.address)
      if (!account) throw new Error("Account not found")

      openCopyAddressModal(account.address)

      const isEthereumAccount = isEthereumAddress(account.address)
      if (isEthereumAccount) setIsCopied(true)
    },
    [accounts, openCopyAddressModal]
  )

  const handleOnChange = useCallback(
    (acc: AccountJsonAny) => {
      setValue("address", acc?.address, { shouldValidate: true })
    },
    [setValue]
  )

  return (
    <Form onSubmit={handleSubmit(submit)}>
      <AccountDropDown
        items={accounts as AccountJsonAny[]}
        propertyKey="address"
        renderItem={renderAccountItem}
        onChange={handleOnChange}
        placeholder="Select Account"
      />
      <Box grow>
        {isPolkadot && (
          <Caption>For Polkadot you'll need to pick a specific address format to continue.</Caption>
        )}
        {isCopied && (
          <Box fontsize="small" fg="primary" flex align="center" gap={0.4}>
            <Box fontsize="large" flex column justify="center">
              <CheckIcon />
            </Box>
            <Box>Address copied</Box>
          </Box>
        )}
      </Box>
      <Button type="submit" disabled={!isValid}>
        Copy Address <CopyIcon />
      </Button>
    </Form>
  )
}
