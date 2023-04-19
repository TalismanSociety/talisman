import { useCallback, useState } from "react"
import { Button } from "talisman-ui"

import { Section } from "../shared/Section"
import { DecryptResult, EncryptResult, TalismanSigner } from "./types"
import { useWallet } from "./useWallet"

const DATA_TO_ENCRYPT =
  "data to encrypt yeet yeet yeeeeeet. this is a loooooong message blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah"

// substrate dev 1 (pwned)
const DECRYPTER_ADDRESS = "13Dg1mYyNddpzDxZZ2ksZeAQxjDAqAzH24bGmBhzs5dQcmwF"
const DECRYPTER_PUB_KEY = "0x6222bdf686960b8ee8aeda225d885575c2238f0403003983b392cde500aeb06c"

// substrate dev 2
const ENCRYPTER_ADDRESS = "1YmEYgtfPbwx5Jos1PjKDWRpuJWSpTzytwZgYan6kgiquNS"
const ENCRYPTER_PUB_KEY = "0x183982ce80e4b52f2e80aaf36d18b1eba1a32005ffbefd952962227f2f4db309"

export const Sumi = () => {
  const { account, extension } = useWallet()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<Error>()
  const [encryptResult, setEncryptResult] = useState<EncryptResult>()
  const [decryptResult, setDecryptResult] = useState<DecryptResult>()
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleEncrypt = useCallback(
    async (data: string | undefined) => {
      setError(undefined)
      setEncryptResult(undefined)
      if (!extension?.signer?.signRaw || !account) return
      if (!data) return

      try {
        setIsProcessing(true)
        setEncryptResult(
          await (extension.signer as TalismanSigner).encryptMessage({
            address: ENCRYPTER_ADDRESS,
            recipient: DECRYPTER_PUB_KEY,
            message: data,
          })
        )
      } catch (err) {
        setError(err as Error)
      }
      setIsProcessing(false)
    },
    [account, extension?.signer]
  )

  const handleDecrypt = useCallback(
    async (data: string | undefined) => {
      setError(undefined)
      setDecryptResult(undefined)
      if (!extension?.signer?.signRaw || !account) return
      if (!data) return

      try {
        setIsProcessing(true)
        setDecryptResult(
          await (extension.signer as TalismanSigner).decryptMessage({
            address: DECRYPTER_ADDRESS,
            sender: ENCRYPTER_PUB_KEY,
            message: data,
          })
        )
      } catch (err) {
        setError(err as Error)
      }
      setIsProcessing(false)
    },
    [account, extension?.signer]
  )

  return (
    <Section title="Sumi">
      <Button
        processing={isProcessing}
        disabled={!account || !extension}
        onClick={() => handleEncrypt(DATA_TO_ENCRYPT)}
      >
        Encrypt Message
      </Button>
      {encryptResult && <pre className="my-8 ">{JSON.stringify(encryptResult, undefined, 2)}</pre>}
      <br />
      <br />
      <Button
        processing={isProcessing}
        disabled={!account || !extension}
        onClick={() => handleDecrypt(encryptResult?.result)}
      >
        Decrypt Message
      </Button>
      {decryptResult && <pre className="my-8 ">{JSON.stringify(decryptResult, undefined, 2)}</pre>}
    </Section>
  )
}
