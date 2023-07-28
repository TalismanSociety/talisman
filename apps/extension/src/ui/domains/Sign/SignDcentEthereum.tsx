import { AccountJsonDcent } from "@core/domains/accounts/types"
import { EthSignMessageMethod } from "@core/domains/signing/types"
import i18next from "@core/i18nConfig"
import { isHexString } from "@ethereumjs/util"
import { hexToString } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { classNames } from "@talismn/util"
import { DcentError, dcentCall } from "@ui/util/dcent"
import DcentWebConnector from "dcent-web-connector"
import { ethers } from "ethers"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button } from "talisman-ui"

type DcentEthereumProps = {
  account: AccountJsonDcent
  method: EthSignMessageMethod | "eth_sendTransaction"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any // string message, typed object for eip712, TransactionRequest for tx
  containerId?: string
  className?: string
  onSignature?: ({ signature }: { signature: HexString }) => void | Promise<void>
  onReject: () => void
  onWaitingChanged?: (waiting: boolean) => void // triggered when tx is sent to the device, or when response is received
}

const signWithDcent = async (
  method: EthSignMessageMethod | "eth_sendTransaction",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  accountPath: string
): Promise<HexString> => {
  switch (method) {
    // case "eth_signTypedData":
    // case "eth_signTypedData_v1":
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      const version = (method.split("_")[2] ?? "v4").toUpperCase()
      const clearTextJson = isHexString(payload) ? hexToString(payload) : payload
      const json = JSON.parse(clearTextJson)

      const response = await dcentCall<{ address: string; sign: string }>(() =>
        DcentWebConnector.getSignedData(accountPath, {
          version,
          payload: json,
        })
      )

      return response.sign as HexString
    }

    case "personal_sign": {
      const clearText = isHexString(payload) ? hexToString(payload) : payload

      const response = await dcentCall<{ address: string; sign: string }>(() =>
        DcentWebConnector.getEthereumSignedMessage(clearText, accountPath)
      )

      return response.sign as HexString
    }

    case "eth_sendTransaction": {
      const {
        to,
        nonce,
        gasLimit,
        gasPrice,
        data,
        value,
        chainId,
        type,
        maxPriorityFeePerGas,
        maxFeePerGas,
      } = await ethers.utils.resolveProperties(
        payload.transaction as ethers.providers.TransactionRequest
      )

      const baseTx: ethers.utils.UnsignedTransaction = {
        to,
        gasLimit,
        chainId,
        type,
      }
      // TODO do the same for ledger or it will break for legacy gas networks
      if (nonce !== undefined) baseTx.nonce = ethers.BigNumber.from(nonce).toNumber()
      if (maxPriorityFeePerGas) baseTx.maxPriorityFeePerGas = maxPriorityFeePerGas
      if (maxFeePerGas) baseTx.maxFeePerGas = maxFeePerGas
      if (gasPrice) baseTx.gasPrice = gasPrice
      if (data) baseTx.data = data
      if (value) baseTx.value = value

      const args = [
        type === 2
          ? DcentWebConnector.coinType.ETHEREUM
          : DcentWebConnector.coinType.ETHEREUM_KOVAN, //try ETHEREUM_KOVAN
        ethers.BigNumber.from(nonce).toString(),
        type === 2 ? undefined : gasPrice?.toString(),
        gasLimit?.toString(),
        to,
        value?.toString(), // ?? "0"
        data ?? "0x",
        accountPath,
        chainId,
      ]

      if (type === 2)
        args.push(2, {
          accessList: [],
          maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
          maxFeePerGas: maxFeePerGas?.toString(),
        })

      const result = await dcentCall<{
        sign_v: string
        sign_r: string
        sign_s: string
        signed: string
      }>(() => DcentWebConnector.getEthereumSignedTransaction(...args))

      return ethers.utils.serializeTransaction(baseTx, {
        v: ethers.BigNumber.from(result.sign_v).toNumber(),
        r: result.sign_r,
        s: result.sign_s,
      }) as `0x${string}`
    }
    default: {
      throw new Error(i18next.t("This type of message cannot be signed with D'CENT."))
    }
  }
}

const SignDcentEthereum: FC<DcentEthereumProps> = ({
  account,
  method,
  payload,
  className,
  containerId,
  onWaitingChanged, // TODO to manage error, maybe rename and change to a have a boolean indicating if waiting signature or not (then call again with false )
  onSignature,
  onReject,
}) => {
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<DcentError>()

  // reset
  useEffect(() => {
    setIsSigned(false)
  }, [payload])

  const signLedger = useCallback(async () => {
    if (!onSignature || !payload || !account) {
      return
    }
    setIsSigning(true)
    setError(undefined)
    onWaitingChanged?.(true)
    try {
      const signature = await signWithDcent(method, payload, account.path)
      await onSignature({ signature })
      setIsSigned(true)
    } catch (err) {
      setError(err as DcentError)
      setIsSigning(false)
    }
    onWaitingChanged?.(false)
    setIsSigning(false)
  }, [onSignature, onWaitingChanged, method, payload, account])

  const handleCancelClick = useCallback(() => {
    onReject()
  }, [onReject])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      <Button
        className="w-full"
        disabled={!payload}
        primary
        onClick={signLedger}
        processing={isSigning || isSigned}
      >
        {t("Approve on DCENT")}
      </Button>
      <Button className="w-full" onClick={handleCancelClick}>
        {t("Cancel")}
      </Button>
      {error && (
        <Drawer
          anchor="bottom"
          isOpen
          containerId={containerId}
          onDismiss={() => setError(undefined)}
        >
          <div>
            [{error.code}] {error.message}
          </div>
        </Drawer>
      )}
    </div>
  )
}

// default export to allow for lazy loading
export default SignDcentEthereum
