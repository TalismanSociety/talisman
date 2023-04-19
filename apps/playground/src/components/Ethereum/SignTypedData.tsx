import { SignTypedDataVersion, recoverTypedSignature } from "@metamask/eth-sig-util"
import { classNames } from "@talismn/util"
import { ethers } from "ethers"
import { useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"
import { useAccount, useNetwork } from "wagmi"

import { Section } from "../shared/Section"

// same test messages as MetaMasks's test-dapp
const TEST_MESSAGES = {
  eth_signTypedData: () => [
    {
      type: "string",
      name: "Message",
      value: "Hi, Alice!",
    },
    {
      type: "uint32",
      name: "A number",
      value: "1337",
    },
  ],
  eth_signTypedData_v3: (chainId: number) => ({
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    },
    primaryType: "Mail",
    domain: {
      name: "Ether Mail",
      version: "1",
      chainId,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    },
    message: {
      from: {
        name: "Cow",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello, Bob!",
    },
  }),
  eth_signTypedData_v4: (chainId: number) => ({
    domain: {
      chainId: chainId.toString(),
      name: "Ether Mail",
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
      version: "1",
    },
    message: {
      contents: "Hello, Bob!",
      from: {
        name: "Cow",
        wallets: [
          "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF",
        ],
      },
      to: [
        {
          name: "Bob",
          wallets: [
            "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
            "0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57",
            "0xB0B0b0b0b0b0B000000000000000000000000000",
          ],
        },
      ],
    },
    primaryType: "Mail",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Group: [
        { name: "name", type: "string" },
        { name: "members", type: "Person[]" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person[]" },
        { name: "contents", type: "string" },
      ],
      Person: [
        { name: "name", type: "string" },
        { name: "wallets", type: "address[]" },
      ],
    },
  }),
}

const getMethod = (version: SignTypedDataVersion) => {
  switch (version) {
    case SignTypedDataVersion.V1:
      return "eth_signTypedData"
    case SignTypedDataVersion.V3:
      return "eth_signTypedData_v3"
    case SignTypedDataVersion.V4:
      return "eth_signTypedData_v4"
  }
}

const getParams = (version: SignTypedDataVersion, from: string, message: string) => {
  switch (version) {
    case SignTypedDataVersion.V1:
      return [message, from]
    case SignTypedDataVersion.V3:
      return [from, message]
    case SignTypedDataVersion.V4:
      return [from, message]
  }
}

export const SignTypedData = () => {
  const { isConnected, address, connector } = useAccount()
  const { chain } = useNetwork()
  const [processing, setProcessing] = useState<SignTypedDataVersion>()
  const [error, setError] = useState<Error>()
  const [signature, setSignature] = useState<string>()
  const [signedBy, setSignedBy] = useState<string>()

  const disabled = useMemo(() => !chain || !connector || !address, [address, chain, connector])

  const handleSignClick = useCallback(
    (version: SignTypedDataVersion) => async () => {
      setProcessing(version)
      setError(undefined)
      setSignature(undefined)
      setSignedBy(undefined)
      try {
        if (!connector || !chain || !address) return

        const method = getMethod(version)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message: any = TEST_MESSAGES[method](chain?.id)
        const params = getParams(version, address, JSON.stringify(message))

        const provider = await connector.getProvider()
        const sig = await provider.request({
          method,
          params,
        })

        setSignature(sig)

        const signer = recoverTypedSignature({ data: message, signature: sig, version })
        setSignedBy(signer)
      } catch (err) {
        setError(err as Error)
      }
      setProcessing(undefined)
    },
    [address, chain, connector]
  )

  if (!isConnected) return null

  return (
    <Section title="Sign Typed Data">
      <div className="flex gap-8">
        <Button
          onClick={handleSignClick(SignTypedDataVersion.V1)}
          processing={processing === SignTypedDataVersion.V1}
          disabled={processing !== SignTypedDataVersion.V1 && disabled}
        >
          Legacy
        </Button>
        <Button
          onClick={handleSignClick(SignTypedDataVersion.V3)}
          processing={processing === SignTypedDataVersion.V3}
          disabled={processing !== SignTypedDataVersion.V3 && disabled}
        >
          V3
        </Button>
        <Button
          onClick={handleSignClick(SignTypedDataVersion.V4)}
          processing={processing === SignTypedDataVersion.V4}
          disabled={processing !== SignTypedDataVersion.V4 && disabled}
        >
          V4
        </Button>
      </div>

      <div className="my-8">
        {signature && (
          <div>
            Signature : <span className="font-mono">{signature}</span>
          </div>
        )}
        {error && <div className="text-alert-error my-8 ">Error : {error.message}</div>}
        {signature && (
          <div>
            Signed by :{" "}
            <span
              className={classNames(
                "font-mono",
                ethers.utils.getAddress(signedBy ?? "SIGNED_BY") ===
                  ethers.utils.getAddress(address ?? "ADDRESS")
                  ? "text-alert-success"
                  : "text-alert-error"
              )}
            >
              {signedBy}
            </span>
          </div>
        )}
      </div>
    </Section>
  )
}
