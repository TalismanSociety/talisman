import { web3FromSource } from "@polkadot/extension-dapp"
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { u8aToHex } from "@polkadot/util"
import { decodeAddress } from "@polkadot/util-crypto"
import { ChangeEventHandler, FC, useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useWallet } from "../useWallet"
import { DecryptResult, EncryptResult, TalismanSigner } from "./types"

const DATA_TO_ENCRYPT =
  "This is a secret message that will be encrypted and then decrypted using the Talisman signer"

// // substrate dev 1 (pwned)
// const DECRYPTER_ADDRESS = "13Dg1mYyNddpzDxZZ2ksZeAQxjDAqAzH24bGmBhzs5dQcmwF"
// const DECRYPTER_PUB_KEY = "0x6222bdf686960b8ee8aeda225d885575c2238f0403003983b392cde500aeb06c"

// // substrate dev 2
// const ENCRYPTER_ADDRESS = "1YmEYgtfPbwx5Jos1PjKDWRpuJWSpTzytwZgYan6kgiquNS"
// const ENCRYPTER_PUB_KEY = "0x183982ce80e4b52f2e80aaf36d18b1eba1a32005ffbefd952962227f2f4db309"

const getPublicKeyFromAddress = (address: string) => u8aToHex(decodeAddress(address))

const AccountPicker: FC<{
  accounts: InjectedAccountWithMeta[]
  selectedAccount?: InjectedAccountWithMeta
  onChange?: (account?: InjectedAccountWithMeta) => void
}> = ({ accounts, selectedAccount, onChange }) => {
  const accountsWithIds = useMemo(
    () => accounts.map((account) => ({ id: `${account.address}-${account.meta.source}`, account })),
    [accounts]
  )

  const selected = useMemo(
    () => accountsWithIds.find((account) => account.account === selectedAccount)?.id ?? "select",
    [accountsWithIds, selectedAccount]
  )

  const handleAccountChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      const account = accountsWithIds.find((account) => account.id === e.target.value)?.account
      onChange?.(account)
    },
    [accountsWithIds, onChange]
  )

  //console.log({ selected })

  return (
    <select
      className="form-select bg-black-tertiary text-md outline-none"
      onChange={handleAccountChange}
      value={selected}
    >
      <option value="select" disabled>
        --- select ---
      </option>
      {accountsWithIds.map(({ id, account }) => (
        <option key={id} value={id}>
          [{account.type}] {account.meta.name ?? account.address} - {account.meta.source}
        </option>
      ))}
    </select>
  )
}

export const EncryptDecrypt = () => {
  const { accounts = [] } = useWallet()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<Error>()
  const [encryptResult, setEncryptResult] = useState<EncryptResult>()
  const [decryptResult, setDecryptResult] = useState<DecryptResult>()
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const [senderAccount, setSenderAccount] = useState<InjectedAccountWithMeta>()
  const [recipientAccount, setRecipientAccount] = useState<InjectedAccountWithMeta>()

  // const pubKey = useEffect(() => {
  //   console.log({ accounts, z: accounts[0], r: accounts[1] })
  //   setSenderAccount((prev) => (prev ? prev : accounts[0]))
  //   setRecipientAccount((prev) => (prev ? prev : accounts[1]))
  // }, [accounts])

  const handleEncrypt = useCallback(
    async (data: string | undefined) => {
      setError(undefined)
      setDecryptResult(undefined)
      if (!data || !senderAccount || !recipientAccount) return

      const extension = await web3FromSource(senderAccount.meta.source)

      try {
        setIsProcessing(true)
        setEncryptResult(
          await (extension.signer as TalismanSigner).encryptMessage({
            address: senderAccount.address,
            recipient: getPublicKeyFromAddress(recipientAccount.address), // DECRYPTER_PUB_KEY,
            message: data,
          })
        )
      } catch (err) {
        setError(err as Error)
      }
      setIsProcessing(false)
    },
    [recipientAccount, senderAccount]
  )

  const handleDecrypt = useCallback(
    async (data: string | undefined) => {
      setError(undefined)
      setDecryptResult(undefined)

      if (!data || !senderAccount || !recipientAccount) return

      const extension = await web3FromSource(recipientAccount.meta.source)

      try {
        setIsProcessing(true)
        setDecryptResult(
          await (extension.signer as TalismanSigner).decryptMessage({
            address: recipientAccount.address,
            sender: getPublicKeyFromAddress(senderAccount.address),
            message: data,
          })
        )
      } catch (err) {
        setError(err as Error)
      }
      setIsProcessing(false)
    },
    [recipientAccount, senderAccount]
  )

  // console.log({
  //   // recipientAccount,
  //   // senderAccount,
  //   senderAddress1: senderAccount && encodeAddress(senderAccount?.address, 0),

  //   //recipientAddress1: recipientAccount && encodeAddress(recipientAccount?.address, 0),
  //   // pubKey1:
  //   //   recipientAccount?.address &&
  //   //   u8aToHex(decodeAddress(encodeAddress(recipientAccount?.address))),
  //   senderPubKey: senderAccount?.address && u8aToHex(decodeAddress(senderAccount?.address)),
  //   // DECRYPTER_ADDRESS,
  //   // DECRYPTER_PUB_KEY,
  //   ENCRYPTER_ADDRESS,
  //   ENCRYPTER_PUB_KEY,
  // })

  return (
    <Section title="EncryptDecrypt (Sumi)">
      <div className="py-4">
        <div className="flex items-center">
          <div className="w-36">From : </div>
          <div>
            <AccountPicker
              accounts={accounts}
              selectedAccount={senderAccount}
              onChange={setSenderAccount}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="w-36">To : </div>
          <div>
            <AccountPicker
              accounts={accounts}
              selectedAccount={recipientAccount}
              onChange={setRecipientAccount}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="w-36">Data : </div>
          <div>{DATA_TO_ENCRYPT}</div>
        </div>
      </div>
      <Button
        small
        processing={isProcessing}
        disabled={!recipientAccount || !senderAccount}
        onClick={() => handleEncrypt(DATA_TO_ENCRYPT)}
      >
        Encrypt Message
      </Button>
      {encryptResult && <pre className="my-8 ">{JSON.stringify(encryptResult, undefined, 2)}</pre>}
      <br />
      <br />
      <Button
        small
        processing={isProcessing}
        disabled={!encryptResult?.result || !recipientAccount || !senderAccount}
        onClick={() => handleDecrypt(encryptResult?.result)}
      >
        Decrypt Message
      </Button>
      {decryptResult?.result && (
        <pre className="my-8 ">{JSON.stringify(decryptResult, undefined, 2)}</pre>
      )}
    </Section>
  )
}
