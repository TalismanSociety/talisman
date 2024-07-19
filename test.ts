import {
  acala,
  basilisk,
  bifrostdot,
  bifrostksm,
  composable,
  hydration,
  pendulum,
  pioneer,
} from "@polkadot-api/descriptors"
import { Binary, createClient, Enum } from "polkadot-api"
import { WebSocketProvider } from "polkadot-api/ws-provider/web"

// const client = createClient(WebSocketProvider("wss://acala-rpc.dwellir.com"))
// const address = "0x00"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stringify = (value: any) =>
  '\n"onChainId": ' +
  JSON.stringify(
    JSON.stringify(value, (key, value) => {
      // console.log("key\n\t", key, "\nvalue\n\t", value)

      if (typeof value === "object" && value !== null) {
        if (value instanceof Error) return { __error: value.toString() }
        // if (value instanceof Enum) return { __enum: value.toString() }

        if (value instanceof Binary) {
          try {
            return { __bin: new TextDecoder("UTF-8", { fatal: true }).decode(value.asBytes()) }
          } catch {
            return { __hex: value.asHex() }
          }
        }
      }

      if (typeof value === "bigint") return { __bigint: value.toString() }

      return value
    })
  ) +
  ","

// {
//   const api = client.getTypedApi(acala)

//   // { Token: "ACA" }
//   await api.query.Tokens.Accounts.getValue(address, Enum("Token", Enum("ACA")))

//   // { DexShare: [{ Erc20: "0x0000..." }, { LiquidCrowdloan: 1 }] }
//   await api.query.Tokens.Accounts.getValue(
//     address,
//     Enum("DexShare", [
//       // token 1
//       Enum("Erc20", Binary.fromHex("0x000...")),
//       // token 2
//       Enum("LiquidCrowdloan", 1),
//     ])
//   )

//   // { Token: "ACA" }
//   await api.query.Tokens.Accounts.getValue(address, Enum("Token", Enum("ACA")))

//   // { StableAssetPoolToken: 3 }
//   await api.query.Tokens.Accounts.getValue(address, Enum("StableAssetPoolToken", 3))

//   // { DexShare: [{ Token: "ACA" }, { StableAssetPoolToken: 3 }] }
//   await api.query.Tokens.Accounts.getValue(
//     address,
//     Enum("DexShare", [
//       // token 1
//       Enum("Token", Enum("ACA")),
//       // token 2
//       Enum("StableAssetPoolToken", 3),
//     ])
//   )

console.log(
  stringify(Enum("Token", Enum("AUSD"))),
  stringify(Enum("Token", Enum("TAP"))),
  stringify(Enum("LiquidCrowdloan", 13)),
  stringify(Enum("Token", Enum("LDOT"))),
  stringify(Enum("Token", Enum("DOT"))),
  stringify(Enum("ForeignAsset", 8)),
  stringify(Enum("ForeignAsset", 4)),
  stringify(Enum("ForeignAsset", 6)),
  stringify(Enum("ForeignAsset", 2)),
  stringify(Enum("ForeignAsset", 9)),
  stringify(Enum("ForeignAsset", 1)),
  stringify(Enum("ForeignAsset", 0)),
  stringify(Enum("ForeignAsset", 5)),
  stringify(Enum("ForeignAsset", 7)),
  stringify(Enum("ForeignAsset", 3)),
  stringify(Enum("ForeignAsset", 13)),
  stringify(Enum("StableAssetPoolToken", 0)),
  stringify(Enum("Erc20", Binary.fromHex("0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"))),
  stringify(Enum("Erc20", Binary.fromHex("0xf4c723e61709d90f89939c1852f516e373d418a8"))),
  stringify(Enum("Erc20", Binary.fromHex("0x54a37a01cd75b616d63e0ab665bffdb0143c52ae"))),
  stringify(Enum("Erc20", Binary.fromHex("0x5a4d6acdc4e3e5ab15717f407afe957f7a242578"))),
  stringify(Enum("Erc20", Binary.fromHex("0xc80084af223c8b598536178d9361dc55bfda6818"))),
  stringify(Enum("DexShare", [Enum("Token", Enum("AUSD")), Enum("Token", Enum("LDOT"))])),
  stringify(Enum("DexShare", [Enum("Token", Enum("AUSD")), Enum("ForeignAsset", 3)])),
  stringify(Enum("DexShare", [Enum("Token", Enum("AUSD")), Enum("LiquidCrowdloan", 13)])),
  stringify(Enum("DexShare", [Enum("Token", Enum("ACA")), Enum("Token", Enum("AUSD"))])),
  stringify(Enum("DexShare", [Enum("Token", Enum("DOT")), Enum("LiquidCrowdloan", 13)])),
  stringify(Enum("DexShare", [Enum("Token", Enum("AUSD")), Enum("ForeignAsset", 4)]))
)

// {
//   const api = client.getTypedApi(pendulum)

//   await api.query.Tokens.Accounts.getValue(
//     address,
//     Enum(
//       "Stellar",
//       Enum("AlphaNum4", {
//         code: Binary.fromText("USDC"),
//         issuer: Binary.fromHex(
//           "0x3b9911380efe988ba0a8900eb1cfe44f366f7dbe946bed077240f7f624df15c5"
//         ),
//       })
//     )
//   )
// }

console.log(
  stringify(Enum("XCM", 0)),
  stringify(Enum("XCM", 1)),
  stringify(Enum("Stellar", Enum("StellarNative"))),
  stringify(
    Enum(
      "Stellar",
      Enum("AlphaNum4", {
        code: Binary.fromText("TZS"),
        issuer: Binary.fromHex(
          "0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba"
        ),
      })
    )
  ),
  stringify(
    Enum(
      "Stellar",
      Enum("AlphaNum4", {
        code: Binary.fromText("BRL"),
        issuer: Binary.fromHex(
          "0xeaac68d4d0e37b4c24c2536916e830735f032d0d6b2a1c8fca3bc5a25e083e3a"
        ),
      })
    )
  ),
  stringify(
    Enum(
      "Stellar",
      Enum("AlphaNum4", {
        code: Binary.fromText("USDC"),
        issuer: Binary.fromHex(
          "0x3b9911380efe988ba0a8900eb1cfe44f366f7dbe946bed077240f7f624df15c5"
        ),
      })
    )
  ),
  stringify(
    Enum(
      "Stellar",
      Enum("AlphaNum4", {
        code: Binary.fromText("AUDD"),
        issuer: Binary.fromHex(
          "0xc5fbe9979e240552860221f4fe2f2219f35e40458b8b58fc32da520a154a561d"
        ),
      })
    )
  ),
  stringify(
    Enum(
      "Stellar",
      Enum("AlphaNum4", {
        code: Binary.fromText("EURC"),
        issuer: Binary.fromHex(
          "0x2112ee863867e4e219fe254c0918b00bc9ea400775bfc3ab4430971ce505877c"
        ),
      })
    )
  ),
  stringify(
    Enum(
      "Stellar",
      Enum("AlphaNum4", {
        code: Binary.fromText("NGNC"),
        issuer: Binary.fromHex(
          "0x241afadf31883f79972545fc64f3b5b0c95704c6fb4917474e42b0057841606b"
        ),
      })
    )
  )
)

// {
//   const api = client.getTypedApi(basilisk)
//   await api.query.Tokens.Accounts.getValue(address, 2)
// }

// {
//   const api = client.getTypedApi(bifrostksm)
// }

console.log(
  stringify(Enum("Token", Enum("BNC"))),
  stringify(Enum("Token", Enum("DOT"))),
  stringify(Enum("Token", Enum("KAR"))),
  stringify(Enum("Token", Enum("KSM"))),
  stringify(Enum("Token", Enum("KUSD"))),
  stringify(Enum("Token", Enum("MOVR"))),
  stringify(Enum("Token", Enum("PHA"))),
  stringify(Enum("Token", Enum("RMRK"))),
  stringify(Enum("Token", Enum("ZLK"))),
  stringify(Enum("Stable", Enum("KUSD"))),
  stringify(Enum("Token2", 0)),
  stringify(Enum("Token2", 1)),
  stringify(Enum("Token2", 2)),
  stringify(Enum("Token2", 3)),
  stringify(Enum("Token2", 4)),
  stringify(Enum("VToken", Enum("BNC"))),
  stringify(Enum("VToken", Enum("MOVR"))),
  stringify(Enum("VToken", Enum("KSM"))),
  stringify(Enum("VSToken", Enum("KSM"))),
  stringify(Enum("BLP", 0)),
  stringify(Enum("BLP", 1)),
  stringify(Enum("BLP", 2)),
  stringify(Enum("BLP", 3))
)

// {
//   const api = client.getTypedApi(bifrostdot)

//   const test = [
//     api.query.Tokens.Accounts.getValue(address, Enum("Token", Enum("BNC"))),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 0)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 1)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 2)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 3)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 4)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 5)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 6)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Token2", 7)),
//     api.query.Tokens.Accounts.getValue(address, Enum("VToken2", 0)),
//     api.query.Tokens.Accounts.getValue(address, Enum("VToken2", 1)),
//     api.query.Tokens.Accounts.getValue(address, Enum("VToken2", 3)),
//     api.query.Tokens.Accounts.getValue(address, Enum("VToken2", 4)),
//     api.query.Tokens.Accounts.getValue(address, Enum("VSToken2", 0)),
//   ]
// }

console.log(
  stringify(Enum("Token", Enum("BNC"))),
  stringify(Enum("Token2", 0)),
  stringify(Enum("Token2", 1)),
  stringify(Enum("Token2", 2)),
  stringify(Enum("Token2", 3)),
  stringify(Enum("Token2", 4)),
  stringify(Enum("Token2", 5)),
  stringify(Enum("Token2", 6)),
  stringify(Enum("Token2", 7)),
  stringify(Enum("VToken2", 0)),
  stringify(Enum("VToken2", 1)),
  stringify(Enum("VToken2", 3)),
  stringify(Enum("VToken2", 4)),
  stringify(Enum("VSToken2", 0))
)

// {
//   const api = client.getTypedApi(pioneer)

//   const test = [
//     api.query.Tokens.Accounts.getValue(address, Enum("NativeToken", 1n)),
//     api.query.Tokens.Accounts.getValue(address, Enum("NativeToken", 2n)),
//     api.query.Tokens.Accounts.getValue(address, Enum("Stable", 0n)),
//     api.query.Tokens.Accounts.getValue(address, Enum("MiningResource", 0n)),
//   ]
// }

console.log(
  stringify(Enum("NativeToken", 1n)),
  stringify(Enum("NativeToken", 2n)),
  stringify(Enum("Stable", 0n)),
  stringify(Enum("MiningResource", 0n))
)

// {
//   const api = client.getTypedApi(composable)

//   const test = [
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950342n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950370n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950351n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950340n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950337n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543952342n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950343n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950346n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543952343n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543952347n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950344n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950376n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950463n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950354n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950355n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950361n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950352n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950369n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950367n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950368n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950359n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950485n),
//     api.query.Tokens.Accounts.getValue(address, 79228162514264337593543950486n),
//   ]
// }

console.log(
  stringify(79228162514264337593543950342n),
  stringify(79228162514264337593543950370n),
  stringify(79228162514264337593543950351n),
  stringify(79228162514264337593543950340n),
  stringify(79228162514264337593543950337n),
  stringify(79228162514264337593543952342n),
  stringify(79228162514264337593543950343n),
  stringify(79228162514264337593543950346n),
  stringify(79228162514264337593543952343n),
  stringify(79228162514264337593543952347n),
  stringify(79228162514264337593543950344n),
  stringify(79228162514264337593543950376n),
  stringify(79228162514264337593543950463n),
  stringify(79228162514264337593543950354n),
  stringify(79228162514264337593543950355n),
  stringify(79228162514264337593543950361n),
  stringify(79228162514264337593543950352n),
  stringify(79228162514264337593543950369n),
  stringify(79228162514264337593543950367n),
  stringify(79228162514264337593543950368n),
  stringify(79228162514264337593543950359n),
  stringify(79228162514264337593543950485n),
  stringify(79228162514264337593543950486n)
)

// {
//   const api = client.getTypedApi(hydration)

//   const test = [api.query.Tokens.Accounts.getValue(address, 1000082)]
// }

console.log(stringify(1000082))
