import { EthGasSettings } from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { Box } from "@talisman/components/Box"
import InputAutoWidth from "@talisman/components/Field/InputAutoWidth"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { LoaderIcon, UserPlusIcon } from "@talisman/theme/icons"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { getChainAddressType } from "@talisman/util/getChainAddressType"
import { isValidAddress } from "@talisman/util/isValidAddress"
import { tokensToPlanck } from "@talismn/util"
import Account from "@ui/domains/Account"
import { useBalance } from "@ui/hooks/useBalance"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import { useSettings } from "@ui/hooks/useSettings"
import { useTip } from "@ui/hooks/useTip"
import {
  ChangeEventHandler,
  ReactNode,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { FieldError, useForm } from "react-hook-form"
import styled from "styled-components"
import { PillButton } from "talisman-ui"
import * as yup from "yup"

import Balance from "../Balance"
import AssetPicker from "../Picker"
import { AddToAddressBookDrawer } from "./AddToAddressBookDrawer"
import { useSendTokens } from "./context"
import { EthTransactionFees, FeeSettings } from "./EthTransactionFees"
import { SendDialogContainer } from "./SendDialogContainer"
import { SendTokensInputs, TransferableToken } from "./types"
import { useTransferableTokenById } from "./useTransferableTokens"

const SendAddressConvertInfo = lazy(() => import("./SendAddressConvertInfo"))

const Container = styled(SendDialogContainer)`
  display: block;

  > form {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  > form > article {
    position: relative;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;

    > div > div {
      height: 3.2rem;
    }
    > div > .field {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    > div > .field .children,
    > div > .field .children span,
    > div > .field .children div {
      height: 3.2rem;
    }

    > div {
      font-size: var(--font-size-large);
      line-height: var(--font-size-xlarge);
      display: flex;
      margin: 0;
      align-items: center;
      position: relative;

      button,
      button > .account-name > .name {
        font-size: var(--font-size-large);
        line-height: var(--font-size-xlarge);
      }

      .account-avatar,
      .account-avatar svg {
        font-size: 2.4rem;
        line-height: 2.4rem;
      }
    }

    .amount {
      color: var(--color-background-muted-2x);
      margin: 0;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      background: none;

      .children {
        background: none;
      }

      input,
      .input-auto-width {
        font-size: var(--font-size-large);
        padding: 0;
        background: none;
        padding: 0 0.4em 0 0;
        min-width: 1.2em;
        border-radius: 0;
      }

      &.active {
        color: var(--color-mid);
      }
    }

    .amount:hover ::placeholder,
    .amount:focus-within ::placeholder {
      color: var(--color-mid);
    }

    .amount:hover input,
    .amount:focus-within input {
      color: var(--color-foreground-muted-2x);
    }

    .btn-select-asset {
      height: 3.2rem;
    }
  }

  > form > footer {
    position: relative;
    min-height: 10.2rem; //reserve space for error msg;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    .info,
    .info span,
    .chain-balance-column > .tokens {
      font-size: 1.2rem;
      line-height: 1.8rem;
    }

    ${SimpleButton} {
      height: 5.6rem;
      min-height: 5.6rem;
      font-size: 1.8rem;
      line-height: 1.8rem;
      width: 100%;
    }
  }
`

const FieldContainer = ({ error, children }: { error?: FieldError; children: ReactNode }) => (
  <div className="relative">
    {children}
    {!!error?.message && (
      <div className="text-alert-warn absolute bottom-[-1em] left-0 !h-[1em] text-xs leading-none">
        {error?.message}
      </div>
    )}
  </div>
)

const AvailableBalance = styled(Balance)`
  .loader {
    display: none;
  }
`

const cleanupAmount = (amount: string) => {
  return (
    amount
      // remove anything which isn't a number or a decimal point
      .replace(/[^.\d]/g, "")
      // remove any decimal points after the first decimal point
      .replace(/\./g, (match: string, offset: number, string: string) =>
        match === "." ? (string.indexOf(".") === offset ? "." : "") : ""
      )
  )
}

const cleanupAmountInput = (amount: string) => {
  return cleanupAmount(
    amount
      // if user starts by typing a '.', prefix with 0
      .replace(/^\./g, "0.")
  )
}

// ensures the input doesn't have more decimals than target token allows
const isDecimalsValid = (amount?: string, token?: Token) => {
  if (!amount || !token) return true
  const decimals = Number(amount.split(".")[1]?.length ?? 0)
  return decimals <= token.decimals
}

const REVALIDATE = { shouldValidate: true, shouldDirty: true, shouldTouch: true }

const substrateSchema = {
  tip: yup.string().required(), // this will disable the review button until tip is fetched from tip station
}

// validation checks, used only to toggle submit button's disabled prop
// (validation errors are not displayed on screen)
const getSchema = (isEvm: boolean, tokens?: TransferableToken[]) =>
  yup
    .object({
      transferableTokenId: yup.string().required(""),
      amount: yup
        .string()
        .required("")
        .transform(cleanupAmount)
        .test("amount-gt0", "", (value) => Number(value) > 0)
        .when("transferableTokenId", (transferableTokenId, schema) => {
          const token = tokens?.find((t) => t.id === transferableTokenId)?.token
          return schema.test({
            test: (amount: string) => isDecimalsValid(amount, token),
            message: `To many decimals (max ${token?.decimals})`,
          })
        }),
      from: yup
        .string()
        .required("")
        .test("from-valid", "Invalid address (from)", (address) =>
          isValidAddress(address as string)
        ),
      to: yup
        .string()
        .required("")
        .test("to-valid", "Invalid address (to)", (address) => isValidAddress(address as string)),
      ...(isEvm ? {} : substrateSchema),
    })
    .required("")

export const SendForm = () => {
  const { formData, check, showForm, transferableTokens } = useSendTokens()
  const [isEvm, setIsEvm] = useState(false)
  const [gasSettings, setGasSettings] = useState<EthGasSettings | undefined>(formData?.gasSettings)
  const schema = useMemo(() => getSchema(isEvm, transferableTokens), [isEvm, transferableTokens])
  const { toggle: toggleAddContact, isOpen: isOpenAddContact } = useOpenClose()

  // react-hook-form
  const {
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { isValid: isValidForm, isSubmitting, errors },
  } = useForm<SendTokensInputs>({
    mode: "onChange",
    defaultValues: formData,
    resolver: yupResolver(schema),
  })

  const isValid = useMemo(
    () => isValidForm && (!isEvm || !!gasSettings),
    [gasSettings, isEvm, isValidForm]
  )

  const [errorMessage, setErrorMessage] = useState<string>()
  const submit = useCallback(
    async (data: SendTokensInputs) => {
      try {
        await check({ ...data, gasSettings })
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : (err as string))
      }
    },
    [check, gasSettings]
  )

  // handlers for all input components
  // because these input components are all custom, we need to programmatically update form state
  // (can't use RHF register here without major changes)
  const onAssetChange = useCallback(
    (transferableTokenId: string) => {
      setValue("transferableTokenId", transferableTokenId, REVALIDATE)
    },
    [setValue]
  )
  const onAmountChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue("amount", cleanupAmountInput(e.target.value), REVALIDATE),
    [setValue]
  )
  const onFromChange = useCallback(
    (value: string) => setValue("from", value, REVALIDATE),
    [setValue]
  )
  const onToChange = useCallback((value: string) => setValue("to", value, REVALIDATE), [setValue])

  // current form values
  const { amount, transferableTokenId, from, to } = watch()
  // derived data
  const transferableToken = useTransferableTokenById(transferableTokenId)

  // Detect if 'to' address is one of ours, or pasted in
  const isKnownRecipient = useIsKnownAddress(to)

  useEffect(() => {
    setIsEvm(!!transferableToken?.evmNetworkId)
  }, [transferableToken?.evmNetworkId])

  const { useTestnets = false } = useSettings()
  const { token } = transferableToken ?? {}
  const balance = useBalance(from, token?.id as string)

  const { chainsMap } = useChains(useTestnets)
  const { evmNetworksMap } = useEvmNetworks(useTestnets)

  // account filters based on selected token
  const {
    addressType,
    genesisHash,
  }: { addressType: AccountAddressType; genesisHash?: string | null } = useMemo(() => {
    const chain = transferableToken?.chainId ? chainsMap[transferableToken.chainId] : undefined
    const evmNetwork = transferableToken?.evmNetworkId
      ? evmNetworksMap[transferableToken.evmNetworkId]
      : undefined

    return chain
      ? {
          addressType: getChainAddressType(chain),
          genesisHash: chain.genesisHash,
        }
      : {
          addressType: evmNetwork ? "ethereum" : "UNKNOWN",
        }
  }, [chainsMap, evmNetworksMap, transferableToken?.chainId, transferableToken?.evmNetworkId])

  // refresh tip while on edit form, but stop refreshing after review (showForm becomes false)
  const { tip, error: tipError } = useTip(transferableToken?.chainId, showForm)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setValue("tip", isEvm ? undefined : tip!, REVALIDATE)
  }, [isEvm, setValue, tip])

  useEffect(() => {
    // clear non-form error if any field is changed
    setErrorMessage(tipError)
  }, [amount, token, from, to, tip, tipError])

  // error if insufficient balance (it would be complicated do validate in schema while watching for balance & token)
  useEffect(() => {
    if (
      !errorMessage &&
      token &&
      amount &&
      balance &&
      isValid &&
      tip &&
      // user input may include to many decimals, make sure to exclude them before converting to BigInt
      balance.transferable.planck <
        BigInt(tokensToPlanck(amount, token.decimals).split(".")[0]) + BigInt(tip)
    )
      setErrorMessage("Insufficient balance")
  }, [amount, balance, errorMessage, isValid, setError, token, tip])

  const handleEvmFeeChange = useCallback(
    (fees: FeeSettings, error?: string) => {
      setValue("priority", fees.priority)
      setGasSettings(fees.gasSettings)
      setErrorMessage(error)
    },
    [setValue]
  )

  if (!showForm) return null

  return (
    <Container>
      <form onSubmit={handleSubmit(submit)}>
        <article>
          <div>I want to send</div>
          <FieldContainer error={errors.amount}>
            <InputAutoWidth
              className={`amount ${amount?.length > 0 && parseFloat(amount) > 0 ? `active` : ""}`}
              value={amount} // controlled : this is bad but we need to enforce the value to be a number
              numberOnly
              fieldProps={{
                placeholder: "0",
                autoFocus: true,
                pattern: "^\\s*?[\\d]+(.[\\d]*)?\\s*?$",
                inputMode: "decimal",
                onChange: onAmountChange,
              }}
            />
            <AssetPicker
              key={formData.transferableTokenId ?? "unknown"} // force a reset of the component
              defaultValue={formData.transferableTokenId}
              onChange={onAssetChange}
              showChainsWithBalanceFirst
            />
          </FieldContainer>

          <div>
            <span>from</span>
            {/* Set a tabindex to ensure the underlying popup can receive focus (workaround to the wildcard transform issue) */}
            <Account.Picker
              defaultValue={formData.from}
              onChange={onFromChange}
              placeholder={"account?"}
              tabIndex={0}
              addressType={addressType}
              genesisHash={genesisHash}
            />
          </div>
          <div>
            <span>to</span>
            {/* Set a tabindex to ensure the underlying popup can receive focus (workaround to the wildcard transform issue) */}
            <Account.Picker
              defaultValue={formData.to}
              exclude={from}
              onChange={onToChange}
              withAddressInput
              withAddressBook
              placeholder={"who?"}
              tabIndex={0}
              addressType={addressType}
              genesisHash={genesisHash}
            />
          </div>
          {to && !isKnownRecipient && (
            <span>
              <PillButton
                size="sm"
                icon={() => <UserPlusIcon stroke="#D5FF5C" />}
                onClick={toggleAddContact}
              >
                Add to address book
              </PillButton>
            </span>
          )}
          {to && token?.chain && (
            <Suspense fallback={null}>
              <SendAddressConvertInfo address={to} chainId={token?.chain?.id} />
            </Suspense>
          )}
        </article>
        <footer>
          <div className="message">{errorMessage}</div>
          <div className="info">
            <Box flex column justify="flex-end" gap={0.1}>
              {balance && (
                <>
                  <div className="flex items-center gap-2">
                    <div>Balance: </div>
                    <div>
                      {balance.status === "cache" && (
                        <LoaderIcon className="opacity-1 h-6 w-6 animate-spin" />
                      )}
                    </div>
                  </div>
                  <Box>
                    <AvailableBalance row withFiat noCountUp balance={balance} />
                  </Box>
                </>
              )}
            </Box>
            {isEvm && (
              <EthTransactionFees
                amount={amount}
                from={from}
                to={to}
                transferableTokenId={transferableTokenId}
                onChange={handleEvmFeeChange}
              />
            )}
          </div>
          <SimpleButton
            type="submit"
            primary
            processing={isSubmitting}
            disabled={Boolean(errorMessage) || !isValid}
          >
            Review
          </SimpleButton>
        </footer>
      </form>
      <AddToAddressBookDrawer
        isOpen={isOpenAddContact}
        close={toggleAddContact}
        address={to}
        addressType={addressType}
      />
    </Container>
  )
}
