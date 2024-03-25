import {
  MessageTypes,
  SignTypedDataVersion,
  TypedDataV1,
  TypedMessage,
  recoverTypedSignature,
} from "@metamask/eth-sig-util"
import { classNames } from "@talismn/util"
import { useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"
import { Hex, getAddress } from "viem"
import { useAccount, useWalletClient } from "wagmi"

import { Section } from "../../shared/Section"

const getTestDataV1 = (): TypedDataV1 => [
  {
    type: "string",
    name: "Question",
    value: "Sup nerd?",
  },
  {
    type: "uint32",
    name: "Integer value",
    value: "420",
  },
]

const getTestDataV3 = (
  chainId: number,
  validContractAddress: boolean
): TypedMessage<MessageTypes> => ({
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
    verifyingContract: validContractAddress
      ? "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
      : "javascript:alert(1)",
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
})

const getTestDataV4 = (
  chainId: number,
  validContractAddress: boolean
): TypedMessage<MessageTypes> => ({
  domain: {
    chainId: chainId,
    name: "Ether Mail",
    verifyingContract: validContractAddress
      ? "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
      : "javascript:alert(1)",
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
})

type TypedDataTestPayload = {
  version: SignTypedDataVersion
  method: string
  getData: (chainId: number) => TypedMessage<MessageTypes> | TypedDataV1
  getParams: (address: string, chainId: number) => [unknown, unknown]
}

type TestCases = "V1" | "V3" | "V3_INVALID" | "V4" | "V4_INVALID"

const TEST_PAYLOADS: Record<TestCases, TypedDataTestPayload> = {
  V1: {
    version: SignTypedDataVersion.V1,
    method: "eth_signTypedData",
    getData: () => getTestDataV1(),
    getParams: (address: string) => [getTestDataV1(), address],
  },
  V3: {
    version: SignTypedDataVersion.V3,
    method: "eth_signTypedData_v3",
    getData: (chainId: number) => getTestDataV3(chainId, true),
    getParams: (address: string, chainId: number) => [
      address,
      JSON.stringify(getTestDataV3(chainId, true)),
    ],
  },
  V3_INVALID: {
    version: SignTypedDataVersion.V3,
    method: "eth_signTypedData_v3",
    getData: (chainId: number) => getTestDataV3(chainId, false),
    getParams: (address: string, chainId: number) => [
      address,
      JSON.stringify(getTestDataV3(chainId, false)),
    ],
  },
  V4: {
    version: SignTypedDataVersion.V4,
    method: "eth_signTypedData_v4",
    getData: (chainId: number) => getTestDataV4(chainId, true),
    getParams: (address: string, chainId: number) => [
      address,
      JSON.stringify(getTestDataV4(chainId, true)),
    ],
  },
  V4_INVALID: {
    version: SignTypedDataVersion.V4,
    method: "eth_signTypedData_v4",
    getData: (chainId: number) => getTestDataV4(chainId, false),
    getParams: (address: string, chainId: number) => [
      address,
      JSON.stringify(getTestDataV4(chainId, false)),
    ],
  },
} as const

const SignTypedDataInner = () => {
  const { isConnected, address, connector, chain } = useAccount()
  const [processing, setProcessing] = useState<TestCases>()
  const [error, setError] = useState<Error>()
  const [signature, setSignature] = useState<Hex>()
  const [signedBy, setSignedBy] = useState<string>()
  const { data: walletClient } = useWalletClient()

  const disabled = useMemo(() => !chain || !connector || !address, [address, chain, connector])

  const handleSignClick = useCallback(
    (testCase: TestCases) => async () => {
      setError(undefined)
      setSignature(undefined)
      setSignedBy(undefined)
      try {
        if (!connector || !chain || !address || !walletClient) return

        const { version, method, getData, getParams } = TEST_PAYLOADS[testCase]
        setProcessing(version)
        const params = getParams(address, chain.id)
        const data = getData(chain.id)

        const sig: Hex = await walletClient.request({
          method,
          params,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        setSignature(sig)

        const signer = recoverTypedSignature({
          data: data,
          signature: sig,
          version,
        })
        setSignedBy(signer)
      } catch (err) {
        setError(err as Error)
      }
      setProcessing(undefined)
    },
    [address, chain, connector, walletClient]
  )

  if (!isConnected) return null

  return (
    <>
      <div className="flex gap-8 pt-4">
        <Button
          small
          onClick={handleSignClick("V1")}
          processing={processing === "V1"}
          disabled={processing !== "V1" && disabled}
        >
          Legacy
        </Button>
        <Button
          small
          onClick={handleSignClick("V3")}
          processing={processing === "V3"}
          disabled={processing !== "V3" && disabled}
        >
          V3
        </Button>
        <Button
          small
          onClick={handleSignClick("V3_INVALID")}
          processing={processing === "V3_INVALID"}
          disabled={processing !== "V3_INVALID" && disabled}
        >
          V3 invalid
        </Button>
        <Button
          small
          onClick={handleSignClick("V4")}
          processing={processing === "V4"}
          disabled={processing !== "V4" && disabled}
        >
          V4
        </Button>
        <Button
          small
          onClick={handleSignClick("V4_INVALID")}
          processing={processing === "V4_INVALID"}
          disabled={processing !== "V4_INVALID" && disabled}
        >
          V4 invalid
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
                signedBy && getAddress(signedBy ?? "SIGNED_BY") === getAddress(address ?? "ADDRESS")
                  ? "text-alert-success"
                  : "text-alert-error"
              )}
            >
              {signedBy}
            </span>
          </div>
        )}
      </div>
    </>
  )
}

export const SignTypedData = () => (
  <Section title="Sign Typed Data">
    <SignTypedDataInner />
  </Section>
)
