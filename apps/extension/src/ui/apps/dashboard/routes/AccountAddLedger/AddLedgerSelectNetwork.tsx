import { Chain } from "@core/domains/chains/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { Dropdown, RenderItemFunc } from "@talisman/components/Dropdown"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { classNames } from "@talisman/util/classNames"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import Asset from "@ui/domains/Asset"
import useChain from "@ui/hooks/useChain"
import { useLedger } from "@ui/hooks/useLedger"
import { useLedgerChains } from "@ui/hooks/useLedgerChains"
import useToken from "@ui/hooks/useToken"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

import Layout from "../../layout"
import { useAddLedgerAccount } from "./context"

const Container = styled(Layout)`
  .dropdown {
    margin: 1.6rem 0 1.3rem 0;
  }

  ${SimpleButton} {
    width: 24rem;
  }

  .step2 {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    max-width: 53rem;
  }
  .fadeIn {
    opacity: 1;
  }

  form {
    display: flex;
    flex-direction: column;
    height: 53.4rem;
    max-height: 100vh;

    .grow {
      flex-grow: 1;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
    }
  }
`

const H1 = styled.h1`
  margin-bottom: 1.6rem;
`
const H2 = styled.h2`
  font-size: 1.6rem;
  margin-top: 2.4rem;
`

const Flex = styled.span`
  display: flex;
  gap: 0.8rem;
  width: 100%;
  font-size: 1.6rem;
  line-height: 1;

  .grow {
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1;
  }
`

const Text = styled.p`
  color: var(--color-mid);
  margin: 0;
`

type FormData = {
  chainId: string
}

const renderOption: RenderItemFunc<Chain> = (chain) => {
  return (
    <Flex>
      <Asset.Logo id={chain.id} />
      <span className="grow">{chain.name}</span>
    </Flex>
  )
}

const Highlight = styled.span`
  color: var(--color-foreground);
`

export const AddLedgerSelectNetwork = () => {
  const { data: defaultValues, updateData } = useAddLedgerAccount()

  const navigate = useNavigate()
  const ledgerChains = useLedgerChains()
  const defaultChain = useChain(defaultValues.chainId as string)

  const schema = useMemo(
    () =>
      yup
        .object({
          chainId: yup
            .string()
            .required("")
            .test(
              "is-ledger-chain",
              "Network not supported",
              (id) => !!ledgerChains.find((c) => c.id === id)
            ),
        })
        .required(),
    [ledgerChains]
  )

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const chainId = watch("chainId")
  const chain = useChain(chainId)
  const token = useToken(chain?.nativeToken?.id)
  const ledger = useLedger(chain?.genesisHash)

  const submit = useCallback(
    async ({ chainId }: FormData) => {
      updateData({ chainId })
      navigate("account")
    },
    [navigate, updateData]
  )

  const handleNetworkChange = useCallback(
    (chain: Chain | null) => {
      setValue("chainId", chain?.id as string, { shouldValidate: true })
    },
    [setValue]
  )

  return (
    <Container withBack centered>
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <div className="grow">
          <H1>Import from Ledger</H1>
          <H2>Step 1</H2>
          <Dropdown
            key={defaultChain?.id ?? "DEFAULT"}
            propertyKey="id"
            items={ledgerChains}
            defaultSelectedItem={defaultChain}
            placeholder="Select a network"
            renderItem={renderOption}
            onChange={handleNetworkChange}
          />
          <Text>Please note: a Ledger account can only be used on a single network.</Text>
          <div className={classNames("step2", chainId && "fadeIn")}>
            <H2>Step 2</H2>
            <Text>
              Connect and unlock your Ledger, then open the{" "}
              <Highlight>
                {chain?.chainName} {token?.symbol ? `(${token.symbol})` : null}
              </Highlight>{" "}
              app on your Ledger.
            </Text>
            <Spacer small />
            <LedgerConnectionStatus {...ledger} />
          </div>
          <Spacer />
        </div>
        <div className="buttons">
          <SimpleButton
            type="submit"
            primary
            disabled={!ledger.isReady || !isValid}
            processing={isSubmitting}
          >
            Continue
          </SimpleButton>
        </div>
      </form>
    </Container>
  )
}
