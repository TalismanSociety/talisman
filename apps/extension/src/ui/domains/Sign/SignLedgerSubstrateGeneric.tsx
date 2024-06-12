import {
  AccountJsonHardwareSubstrate,
  SignerPayloadJSON,
  SignerPayloadRaw,
  isJsonPayload,
} from "@extension/core"
import { log } from "@extension/shared"
import { TypeRegistry } from "@polkadot/types"
import { u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { classNames } from "@talismn/util"
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { PolkadotGenericApp } from "@zondax/ledger-substrate"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button } from "talisman-ui"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"
import { useShortenedMetadata } from "./useShortenedMetadata"

// const TEST_BLOB =
//   "04020345b98de14f55fc5171cd60c8f20ab891520610529700bb6a460e6ffeefe01a240306dae85c2cfafaef7fbe1b429bd684ca7002e55e9fff354bdacc349069fbe09a33d7607f18f06fbc4afd3990496390a89df400031a20835133efde6e46ae100c27795afb90d9257c120121710f001a0000006408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063ee62d3e65bc11b648222e470666763d880c3025f5a4b267f0edb1c301a4a6f3d501b6648e3f302d557ff1ee5e6d2462f2c668b1c4ac92db6a05c6ab857372c10a13"
// const TEST_METADATA =
//   "60082873705f72756e74696d65384d756c74695369676e6174757265011c4564323535313904001651010148656432353531393a3a5369676e6174757265007d02082873705f72756e74696d65384d756c74695369676e6174757265011c5372323535313904001651010148737232353531393a3a5369676e6174757265047d02082873705f72756e74696d65384d756c74695369676e617475726501144563647361040016b901014065636473613a3a5369676e6174757265087d0204184f7074696f6e0110536f6d650400160400047d0510306672616d655f73797374656d28657874656e73696f6e733c636865636b5f6d6f7274616c69747938436865636b4d6f7274616c697479000400168505010c4572618105102873705f72756e74696d651c67656e657269630c6572610c45726101244d6f7274616c32343404000300d103850510306672616d655f73797374656d28657874656e73696f6e732c636865636b5f6e6f6e636528436865636b4e6f6e6365000400110120543a3a4e6f6e63658905086870616c6c65745f7472616e73616374696f6e5f7061796d656e74604368617267655472616e73616374696f6e5061796d656e7400040013013042616c616e63654f663c543e8d0508746672616d655f6d657461646174615f686173685f657874656e73696f6e44436865636b4d6574616461746148617368000401106d6f646516950501104d6f6465910508746672616d655f6d657461646174615f686173685f657874656e73696f6e104d6f6465011c456e61626c6564000495050c1c73705f636f72651863727970746f2c4163636f756e7449643332000400160401205b75383b2033325d000003200000000304083c7072696d69746976655f74797065731048323536000400160401205b75383b2033325d0c0002031000031400000003480838726f636f636f5f72756e74696d652c52756e74696d6543616c6c012042616c616e636573040016f801b50173656c663a3a73705f6170695f68696464656e5f696e636c756465735f636f6e7374727563745f72756e74696d653a3a68696464656e5f696e636c7564653a3a64697370617463680a3a3a43616c6c61626c6543616c6c466f723c42616c616e6365732c2052756e74696d653e10b40c2873705f72756e74696d65306d756c746961646472657373304d756c746941646472657373010849640400160001244163636f756e74496400f40c2873705f72756e74696d65306d756c746961646472657373304d756c7469416464726573730114496e64657804001501304163636f756e74496e64657804f40c2873705f72756e74696d65306d756c746961646472657373304d756c746941646472657373010c52617704001610011c5665633c75383e08f40c2873705f72756e74696d65306d756c746961646472657373304d756c74694164647265737301244164647265737333320400160401205b75383b2033325d0cf40c2873705f72756e74696d65306d756c746961646472657373304d756c74694164647265737301244164647265737332300400164801205b75383b2032305d10f40c3c70616c6c65745f62616c616e6365731870616c6c65741043616c6c0138666f7263655f7472616e736665720c0118736f7572636516f401504163636f756e7449644c6f6f6b75704f663c543e01106465737416f401504163636f756e7449644c6f6f6b75704f663c543e011476616c7565130128543a3a42616c616e636508f800034000000003510100034100000003b901604e0800004f080000500800007c0b00007d0b0000720c00007e0c00007f0c0000800c0000820c00004106000042060000440600004506000074060000e106000034070000350700003607000037070000380700003a07000061070000d2070000050140d0e3a60bc0081c3b128f4b59f4f36fce637964ac88a483f393bc347e2cf2c9174d252347d44fbc336e54f775a9e18c94d8c5507a1741847c63c84b07b86ffcd15d59e300e37db1df68c58e25ccb5844c1e99f92556e5350e43a895e8a68aee177048829573d3be7fc180e3d1fcf89c9d216c557a5b6bed233683beb09031b29150addfdb7871ab3b8fe1617989d79cadbfbf4a18395ff6e36a47f33e7d5ea6ccae4df8cef4f7821789308d933604783168eaee9227abcbb71291f021463ff8350620514c4ac1c507900658e0974ea6253d25bd68e47d182b76bde0ba5f382a5b11f96580db6ea22014eda642584eb0a4b0a6c7729e644090ebbca3d9e706b7bc570e356ff73a3d14b6b31b6d479203cca4160faec678752c979cdf4444b2a9be46fb78654a4e119b627f9f517abff7861a14c416dde066cbb68579b84703fe92571f619e44c3b353e28e5767a9a2482218d217aec38a7d61ab73d658b1903f373095fc9ed721398289614edcab0df4975a1c8988623627f2b32e20442f1bad0054ba3a771a8701fa371677c99b9c0f838860ebf95e570ca9aeb980bce22ed9b5e004e784bd9adfca689b8e040a7ea58f58e4cf11c911ff258406adc598eb92bf50fe9f3c9c6af53edeb65176e68f3bdcb342e1a12a1a1a17b399057f8aeace1232dbe32821bd170c9687d0fdb8637e2ec73ac4d686aa236354d3399f3891d0257bc89a651b38ff85a00d86b455e5d6f8340e39cd7c7203c6f64e0bd430c0c57402ccfc40453e184b40bc86238306bc7ef4ebfec645eba8150d145503ddf731d53cfe4773394253ec3028b90910f933fe0e2bc89c094c28f1feba529cc046a1eee431a357fd9d413486fcaac0b1dc1ad93e344c827dee672e7d625e8da68ced657ff32497496d9d8d2984ea17ca635f6bcd30a0a022b77812ad3cd9e9684fd2fb7ffb10abea99b90962543faf81f4a4edfba7170e40dbf4752d2c0a26b762d6c0ef4169f4c2f87f88e937043236b4e0eeafd1ba3edea005febfc2b3dad82d20083621590530e3c52d5d722d6baf1c47394b4ad2c3fc5e8cfaf04d0f6c9f6acb2cc53870d5332f1c449cfad163bc3bd32063b06dbdfaa500f9df287dd5ab72f3679e4f617da558c1e108d493dec3d939fce24293998629b4a6db2b8aee779558170f99725cd1d47353400e367226cbbacf496df57cb668a35ef49de2a0015a6792a1d308d14a716c2393950d511e81f494c45080dc60234dcb225cae83ad5362fc70eac3a7bf12ece613164b86c22092c338e2f46406981ef7e6e51117b3de0b167f5a3f4723d3f7b3ea9a91fdce7474f4c06b452187cbe6bcc979118064e3d7d3814e151905ab6499c76ccb290d3cc9fa2f41bd00139140b7206e31ff9d98e4beef1d1a2e20bbc4a225773b9327590503729e589420b1a75d86eaabff22d7ce5d76d4656a74fa3e343ab4eb80d4212ff1e2099a42a828e49fae58e998245b09f1762cc8cef24c9dad98cef6946d17995bd30d13874e2942aab84a3a47c6abb4a93386d54893394185dd13c4dc6301f5c4a992d5c9e7bee268f970a9baccbdba990ed7f6d6300d9551d6c94639e67c725763a6f9d002d22c64b512fc0d2d6c3deab95bc432f3d69dc8b760f5615e3551d8dce671aab940fc9710ca415c35b7ea5b8797a42a22e9b91367aff359a80f0a9ce7163f16bd16804ee1e77f499eb932b6642b0a3cdb36e79afda7284e33aa4d7ee5c22b919c407e9911bc7d17ebdf98016d3d76a0de1dd9ba084205e532a7bcc815b559fd4f6176666c1383cbb5321eed7abf6905e07565671fce9b24a10d582aae55bcbd5715b802bbaa91ba75bb014085307d54da73c265a6da53a9b1f8f2abdd321ba53c5b76fc831c34eac90b912d360ce60960387f23743ceb2cc61b2f629d18936d1a213e80ceb8584704e31e4be6a94cb0b91cd271e74ae4edccff7878087b36d6a63d4273b66409db46bff5902746c5166e2d0b620d0e9ec033617946353a49f661befa9d6ff18173e43e9c6a48cd29343c2e50f81049131ac4e9d75614c713d6ede92de7f08abaff159d39bb5db3cb79c6fac00043f1f80cafaf42804db540544692e2e69b1ad876bfc4e9209a56be52c56699e9faf9429758f3cf4b098d9b84a84730df91cb86c0e329da73f7d95ee4974fc3904962541c29c55a213c489b1142b89ef72c09e7a13d54d26a15a9791304aca23cd430582e763810732c60f347720ddafdc520e2131da0cd31d241620df34d8fdfcb6b9172e717ce95d9309b1901b3c1e9cf1e161665c5d17612f1074191beb6555447ab77d6621c6c860cb7301e724b7bce8293bfe7fddfc0464670ccf37116fb274f8393cbf36cfd9077be17661356f2ae8b8062d857000fb9ef0ce72b296004cb951440515066cbd5dcda894e7755cedc61dc0a2a7e2854929e8eeea77d6200f6575e9771d01933e1ab656c9b5c4bedd854a542017616a6fe9b8ef6a18a7db05ddf49c69c385da5a1b06575395d3eeb5c038ea7dcb554dc73a53d33593aa48ba429b1709f9c6fe90b901954f4bf7a353b41600f501a31ef1689cf320e884672ae2ad7e11f02f7aa4bd473876dbca1a855bb65755d0c7afacfe3947cb5963dc1a5ca1525c89d0b9e52b00286d2a971f6c3d87f97eb13ae4061804568b0873e96e4d989489363e1474cb3dac4239c764dc0788095558229be044883a7f0521b6a5255cdfb68f5e6417f96490ef06ba2a77cded47bbd9367c9f2758c92c42949fb632a6c39cf7f60f521940d5676e732b1df216515b235e6bab1f276134f07264cb2743b938cca1138c1ca7d2696ce3468f26238480bac732b67f1237425d479b7a4124e07a09629e2bc9c5f841bb54c8f22f30f52e7ff39061fb7780ea6d43e65db1c9451b6555069a9c3c9ba3639004dfb6e5a7f4cac8f0416f416b4167d022448436865636b4e6f6e5a65726f53656e646572151540436865636b5370656356657273696f6e150538436865636b547856657273696f6e150530436865636b47656e6573697315160c38436865636b4d6f7274616c697479168105160c28436865636b4e6f6e6365168905152c436865636b5765696768741515604368617267655472616e73616374696f6e5061796d656e74168d051544436865636b4d6574616461746148617368169105167d0521710f0018726f636f636f2a000c0c524f43"

type RawLedgerError = {
  errorMessage: string
  name?: string
  returnCode: number
}

// TODO remove async
const sign = async (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
  metadata?: string | null
) => {
  // const { accountIndex, change, addressIndex } = getLedgerSubstrateAccountIds(
  //   account as AccountJsonHardwareSubstrate
  // )

  const path = getPolkadotLedgerDerivationPath(account)

  // console.log("path", path)

  if (isJsonPayload(payload)) {
    if (!metadata) throw new Error("Missing metadata")

    // console.log(payload)

    const registry = new TypeRegistry()
    registry.setSignedExtensions(payload.signedExtensions)
    const unsigned = registry.createType(
      "ExtrinsicPayload",
      {
        ...payload,
        metadataHash: "0xb6648e3f302d557ff1ee5e6d2462f2c668b1c4ac92db6a05c6ab857372c10a13",
      },
      {
        version: payload.version,
      }
    )
    //console.log("unsigned", unsigned.toHuman())

    const txBlob = Buffer.from(unsigned.toU8a(true))

    // const FROM_UNSIGNED = registry.createType("ExtrinsicPayload", bufferToU8a(txBlob), {
    //   version: payload.version,
    // })
    // console.log("FROM_UNSIGNED", FROM_UNSIGNED.toHuman())
    // const FROM_UNSIGNED_2 = registry.createType("ExtrinsicPayload", unsigned, {
    //   version: payload.version,
    // })
    // console.log("FROM_UNSIGNED_2", FROM_UNSIGNED_2.toHuman())

    // const TEST_UNPCKED = registry.createType("GenericExtrinsicPayloadV4", hexToU8a(TEST_BLOB), {
    //   version: payload.version,
    // })
    // console.log("TEST_UNPCKED", TEST_UNPCKED.toHuman())

    // console.log({ path })

    // const res = await ledger.signWithMetadata(
    //   path,
    //   Buffer.from(hexToU8a(TEST_BLOB)),
    //   Buffer.from(hexToU8a(TEST_METADATA))
    // )
    // console.log({ res })

    // const txMetadata = await ledger.getTxMetadata(
    //   txBlob,
    //   "roc",
    //   "https://api.zondax.ch/polkadot/transaction/metadata"
    // )

    // console.log({ path })

    // try {
    //   const hexMetadata = u8aToHex(
    //     await ledger.getTxMetadata(
    //       Buffer.from(unsigned.toU8a(true))
    //       // "roc",
    //       // "https://api.zondax.ch/polkadot/transaction/metadata"
    //     ),
    //     undefined,
    //     false
    //   )

    //   console.log("metada check", metadata === hexMetadata, { metadata, hexMetadata })
    // } catch (err) {
    //   console.error("Failed to fetch metadata from zondax", { err })
    // }

    // return ledger.signImpl(
    //   accountIndex,
    //   change,
    //   addressIndex,
    //   2,
    //   Buffer.from(unsigned.toU8a(true)),
    //   Buffer.from(hexToU8a(metadata))
    // )
    return ledger.sign(path, txBlob)

    // return ledger.signWithMetadata(
    //   path,
    //   txBlob,
    //   txMetadata
    //   //Buffer.from(hexToU8a(metadata))
    // )
  } else {
    // raw payload
    const unsigned = u8aWrapBytes(payload.data)

    return ledger.signRaw(path, Buffer.from(unsigned))

    // const hex1 = bufferToHex(signature) // signature.toString("hex")
    // const hex2 = signature.toString("hex")
    // const hex3 = u8aToHex(hexToU8a(hex1).slice(1), undefined, true)
    // // console.log("hex1", hex1)
    // // console.log("hex2", hex2)
    // // console.log("hex3", hex2)
    // const verify1 = signatureVerify(payload.data, hex1, account.address)
    // //console.log("1", JSON.stringify(verify1, null, 2))
    // // const verify2 = signatureVerify(payload.data, hex2, account.address)
    // // console.log({ verify2 })
    // const verify3 = signatureVerify(payload.data, hex3, account.address)
    // //console.log("3", JSON.stringify(verify3, null, 2))

    // // console.log({
    // //   hex1,
    // //   hex2,
    // //   hex3,
    // //   verify1: JSON.stringify(verify1, null, 2),
    // //   //verify2,
    // //   verify3: JSON.stringify(verify3, null, 2),
    // //   address: account.address,
    // //   data: payload.data,
    // // })

    // // alert("hey")

    // // const hexMinusType = u8aToHex(hexToU8a(hex1).slice(1))
    // // console.log({ hex: hex1, hexMinusType })

    // // alert(JSON.stringify(signatureVerify(payload.data, hexMinusType, account.address), null, 2))

    // return { signature: hex3 }
  }
}

const SignLedgerSubstrateGeneric: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
}) => {
  const account = useAccountByAddress(payload?.address)
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ledger, refresh, status, message, isReady, requiresManualRetry } =
    useLedgerSubstrateGeneric()

  // reset
  useEffect(() => {
    setIsSigned(false)
  }, [payload])

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? t("Please approve from your Ledger.") : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry, t]
  )

  const {
    data: metadata,
    error: errorMetadata,
    isLoading: isLoadingMetadata,
  } = useShortenedMetadata(payload && isJsonPayload(payload) ? payload : null)

  useEffect(() => {
    if (errorMetadata)
      setError(errorMetadata instanceof Error ? errorMetadata.message : errorMetadata.toString())
  }, [errorMetadata])

  const inputsReady = useMemo(() => {
    return !!account && !!payload && (!isJsonPayload(payload) || !!metadata)
  }, [account, metadata, payload])

  const signLedger = useCallback(async () => {
    if (!ledger || !payload || !onSigned || !account || !inputsReady) return

    if (isJsonPayload(payload) && !metadata) {
      if (errorMetadata) return setError((errorMetadata as Error).message)
      if (!isLoadingMetadata) return setError("Metadata unavailable") // shouldn't happen, useShortenedMetadata throws if no metadata
      return setError(null) // wait for metadata
    }

    setError(null)

    try {
      const response = await sign(
        ledger,
        payload,
        account as AccountJsonHardwareSubstrate,
        metadata
      )

      // if (response.error_message !== "No errors")
      //   throw new LedgerError(response.error_message, "LedgerError", response.return_code)

      // await to keep loader spinning until popup closes
      await onSigned({
        signature: isJsonPayload(payload)
          ? u8aToHex(response.signature)
          : u8aToHex(response.signature.slice(1)), // remove first byte (type) or signatureVerify will fail
      })
    } catch (error) {
      log.error("signLedger", { error })
      const message = (error as Error)?.message ?? (error as RawLedgerError)?.errorMessage
      switch (message) {
        case "Transaction rejected":
          return

        case "Instruction not supported":
          return setError(
            t(
              "This instruction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
            )
          )

        default:
          log.error("ledger sign Substrate : " + message, { error })
          setError(message)
      }
    }
  }, [
    ledger,
    payload,
    onSigned,
    account,
    inputsReady,
    metadata,
    errorMetadata,
    isLoadingMetadata,
    t,
  ])

  const onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const handleSendClick = useCallback(() => {
    setIsSigning(true)
    onSentToDevice?.(true)
    signLedger()
      .catch(() => onSentToDevice?.(false))
      .finally(() => setIsSigning(false))
  }, [onSentToDevice, signLedger])

  const handleCloseDrawer = useCallback(() => setError(null), [setError])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <>
          {isReady ? (
            <Button
              className="w-full"
              disabled={!inputsReady}
              primary
              processing={isSigning}
              onClick={handleSendClick}
            >
              {t("Approve on Ledger")}
            </Button>
          ) : (
            !isSigned && <LedgerConnectionStatus {...{ ...connectionStatus }} refresh={onRefresh} />
          )}
        </>
      )}
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      )}
      {error && (
        <Drawer anchor="bottom" isOpen={true} containerId={containerId}>
          <LedgerSigningStatus
            message={error ? error : ""}
            status={error ? "error" : isSigning ? "signing" : undefined}
            confirm={handleCloseDrawer}
          />
        </Drawer>
      )}
    </div>
  )
}

// default export to allow for lazy loading
export default SignLedgerSubstrateGeneric
