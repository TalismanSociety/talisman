import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"

import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { LegacyWalletTransaction, WalletTransaction, WalletTransactionInfo } from "../types"

// For DB version 11, Wallet version 2.13.0
export const migrateTransactionsV2: Migration = {
  forward: new MigrationFunction(async () => {
    try {
      await db.transaction("readwrite", ["transactions", "transactionsV2"], async (tx) => {
        // migrate legacy data to new table with new typing
        const legacyTransactions = await tx.table<LegacyWalletTransaction>("transactions").toArray()
        const newTransactions = legacyTransactions.map(migrateLegacyTransaction).filter(isNotNil)
        await tx.table<WalletTransaction>("transactionsV2").bulkPut(newTransactions)

        // clear legacy transactions table
        await tx.table("transactions").clear()
      })
    } catch (err) {
      // not a blocker
      log.error("Error migrating transactions", err)
    }
  }),
}

const migrateLegacyTransaction = (tx: LegacyWalletTransaction): WalletTransaction | null => {
  const txInfo: WalletTransactionInfo | undefined =
    tx.txInfo ??
    (tx.to && tx.tokenId && tx.value
      ? {
          type: "transfer",
          tokenId: tx.tokenId,
          value: tx.value,
          to: tx.to,
        }
      : undefined)

  if (tx.networkType === "substrate" && GENESIS_HASH_TO_NETWORK_ID[tx.genesisHash])
    return {
      id: tx.hash,
      platform: "polkadot",
      networkId: GENESIS_HASH_TO_NETWORK_ID[tx.genesisHash],
      account: tx.account,
      payload: tx.unsigned,
      status: tx.status,
      timestamp: tx.timestamp,
      hash: tx.hash as `0x${string}`,
      nonce: tx.nonce as number,
      blockNumber: tx.blockNumber,
      confirmed: !!tx.confirmed,
      label: tx.label,
      siteUrl: tx.siteUrl,
      txInfo,
    }

  if (tx.networkType === "evm") {
    return {
      id: tx.hash,
      platform: "ethereum",
      networkId: tx.evmNetworkId,
      account: tx.account as `0x${string}`,
      payload: tx.unsigned,
      status: tx.status,
      timestamp: tx.timestamp,
      hash: tx.hash as `0x${string}`,
      nonce: tx.nonce as number,
      confirmed: !!tx.confirmed,
      label: tx.label,
      siteUrl: tx.siteUrl,
      isReplacement: !!tx.isReplacement,
      txInfo,
    }
  }

  return null
}

// chaindata provider might not be avalable while the migration is running
// hardcoded mappings of substrate networks genesisHash => networkId
const GENESIS_HASH_TO_NETWORK_ID: Record<string, string> = {
  "0x6c5894837ad89b6d92b114a2fb3eafa8fe3d26a54848e3447015442cd6ef4e66": "3-dpass",
  "0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c": "acala",
  "0xce7681fb12aa8f7265d229a9074be0ea1d5e99b53eedcec2deade43857901808": "acurast",
  "0xe358eb1d11b31255a286c12e44fe6780b7edb171d657905a97e39f71d9c6c3ee": "ajuna",
  "0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e": "aleph-zero",
  "0x05d5279c52c484cc80396535a316add7d47b1c5b9e0398dd1f584149341460c5": "aleph-zero-testnet",
  "0xa518884657dc1ae5492b530666bc3b3c4d49a65341a0721095400dc7ccaa105d": "melodie-testnet",
  "0xaa3876c1dc8a1afcc2e9a685a49ff7704cfd36ad8c90bf2702b9d1b00cc40011": "altair",
  "0xcceae7f3b9947cdb67369c026ef78efa5f34a08fe5808d373c04421ecf4f1aaf": "amplitude",
  "0x6d04f01a398a0de6466f7e3d8300e81fb1e5e8428a48ac4975469e90bedb96b6": "analog-testnet",
  "0x1459b0204b92719ffc978c5da3d6a2057973916bd548f8076df2064bc1cb4cfc": "analog-timechain",
  "0x66dc4e5ff85faddb0311b768eb73a58d9a00c65f06056ffaa370a1b1354d7411": "argon-testnet",
  "0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6": "astar",
  "0x66455a580aabff303720aa83adbe6c44502922251c03ba73686d5245da9e21bd": "autonomys",
  "0x5a367ed131b9d8807f0166651095a9ed51aefa9aaec3152d3eb5cee322220ce6":
    "autonomys-taurus-evm-testnet",
  "0x295aeafca762a304d92ee1505548695091f6082d3f0aa4d092ac3cd6397a6c5e": "autonomys-taurus-testnet",
  "0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a": "avail",
  "0xd3d2f3a3495dc597434a99d7d449ebad6616db45e4e4f178f31cc6fa14378b70": "avail-turing-testnet",
  "0x8b5c955b5c8fd7112562327e3859473df4e3dff49bd72a113dbb668d2cfa20d7": "aventus",
  "0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755": "basilisk",
  "0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed": "bifrost-kusama",
  "0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b": "bifrost-polkadot",
  "0xc14597baeccb232d662770d2d50ae832ca8c3192693d2b0814e6433f2888ddd6": "bitgreen",
  "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03": "bittensor",
  "0x8f9cf856bf558a14440e75569c9e58594757048d7b3a84b5d25f6bd978263105": "bittensor-testnet",
  "0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82": "centrifuge-polkadot",
  "0x81443836a9a24caaa23f1241897d1235717535711d1d3fe24eae4fdc942c092c": "cere",
  "0x8b8c140b0af9db70686583e3f6bf2a59052bfe9584b97d20c45068281e976eb9": "chainflip",
  "0x7a5d4db858ada1d20ed6ded4933c33313fc9673e5fffab560d0ca714782f2080": "chainflip-testnet",
  "0x6ac13efb5b368b97b4934cef6edfdd99c2af51ba5109bfb8dacc116f9c584c10": "chainx",
  "0xbc6eb9753e2417476601485f9f8ef8474701ec199d456f989bd397682c9425c5": "communeai",
  "0xdaab8df776eb52ec604a5df5d388bb62a050a0aaec4556a64265b9d42755552d": "composable-finance",
  "0x86e49c195aeae7c5c4a86ced251f1a28c67b3c35d8289c387ede1776cdd88b24": "crab",
  "0x4436a7d64e363df85e065a894721002a86643283f9707338bf195d360ba2ee71": "creditcoin",
  "0xdd954cbf4000542ef1a15bca509cd89684330bee5e23766c527cdb0d7275e9c2": "creditcoin-classic",
  "0xc2e43792c8acc075e564558f9a2184a0ffe9b0fd573969599eee9b647358c6cf":
    "creditcoin-classic-testnet",
  "0xfc4ec97a1c1f119c4353aecb4a17c7c0cf7b40d5d660143d8bad9117e9866572": "creditcoin-testnet",
  "0x4319cc49ee79495b57a1fec4d2bd43f59052dcc690276de566c2691d6df4f7b8": "crust-parachain",
  "0x1d73b9f5dc392744e0dee00a6d6254fcfa2305386cceba60315894fa4807053a": "curio",
  "0x983a1a72503d6cc3636776747ec627172b51272bf45e50a355348facb67a820a": "dancelight-testnet",
  "0xf0b8924b12e8108550d28870bc03f7b45a947e1b2b9abf81bfb0b89ecb60570e": "darwinia",
  "0x742a2ca70c2fda6cee4f8df98d64c4c670a052d9568058982dad9d5a7a135c5b": "edgeware",
  "0xa01fd8b004e04a4ce2c689a339b48b0585004de5844b9939071d44be07806a94": "elysium",
  "0x7dd99936c1e9e6d1ce7d90eb6f33bea8393b4bf87677d675aa63c9cb3e8c5b5b": "encointer",
  "0xe7eafa72eb58d1fdd906202f88d68f660ea6520bdc9c9ad08d6ebf91d14b4405":
    "encointer-testnet-standalone",
  "0x3af4ff48ec76d2efc8476730f423ac07e25ad48f5f4c9dc39c778b164d808615": "enjin-matrixchain",
  "0xa37725fd8943d2a524cb7ecc65da438f9fa644db78ba24dcd0003e2f95645e8f": "enjin-matrixchain-testnet",
  "0xd8761d3c88f26dc12875c00d3165f7d67243d56fc85b4cf19937601a7916e5a9": "enjin-relay",
  "0x735d8773c63e74ff8490fee5751ac07e15bfe2b3b5263be4d683c48dbdfbcd15": "enjin-relay-testnet",
  "0x5a51e04b88a4784d205091aa7bada002f3e5da3045e5b05655ee4db2589c33b5": "ewx",
  "0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1": "frequency",
  "0x2fc8bb6ed7c0051bdcf4866c322ed32b6276572713607e3297ccf411b8f14aa9": "heima",
  "0x40d175caba06c99521d5cd1bea3d1495b14d28b59eef1d5ffc2688cbb7e3dd76": "heima-testnet",
  "0xc56fa32442b2dad76f214b3ae07998e4ca09736e4813724bfb0717caae2c8bee": "humanode",
  "0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d": "hydradx",
  "0x61ea8a51fd4a058ee8c0e86df0a89cc85b8b67a0a66432893d09719050c9f540": "hyperbridge-polkadot",
  "0xcdedc8eadbfa209d3f207bba541e57c3c58a667b05a2e1d1e86353c9000758da": "integritee-kusama",
  "0xe13e7af377c64e83f95e0d70d5e5c3c01d697a84538776c5b9bbe0e7d7b6034c": "integritee-polkadot",
  "0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72": "interlay",
  "0x6f0f071506de39058fe9a95bbca983ac0e9c5da3443909574e95d52eb078d348": "ipci",
  "0xbb9233e202ec014707f82ddb90e84ee9efece8fefee287ad4ad646d869a6c24a": "jamton",
  "0x6b5e488e0fa8f9821110d5c13f4c468abcd43ce5e297e62b34c53c3346465956": "joystream",
  "0xfeb426ca713f0f46c96465b8f039890370cf6bfd687c9076ea2843f58a6ae8a7": "kabocha",
  "0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b": "karura",
  "0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21": "kilt-spiritnet",
  "0xa0c6e3bac382b316a68bca7141af1fba507207594c761076847ce358aeedcc21": "kilt-testnet-standalone-2",
  "0x9af9a64e6e4da8e3073901c3ff0cc4c3aad9563786d89daf6ad820b6e14a0b8b": "kintsugi",
  "0xc710a5f16adc17bcd212cff0aedcbf1c1212a043cdc0fb2dcba861efe5305b01": "kreivo",
  "0xb3dd5ad6a82872b30aabaede8f41dfd4ff6c32ff82f8757d034a45be63cf104c": "krest",
  "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe": "kusama",
  "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a": "kusama-asset-hub",
  "0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5": "kusama-bridge-hub",
  "0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050": "kusama-coretime",
  "0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f": "kusama-people",
  "0xe8aecc950e82f1a375cf650fa72d07e0ad9bef7118f49b92283b63e88b1de88b": "laos",
  "0x6324385efe4e93beadb6167414fd77e2ae505557db538ea26d297f1208520ae1": "laos-testnet",
  "0x6bd89e052d67a45bb60a9a23e8581053d5e0d619f15cb9865946937e690c42d6": "liberland",
  "0x131a8f81116a6ee880aa5f84b16115499a50f5f8dccfed80d87e204ec9203f3c": "liberland-testnet",
  "0x28e1d199bc6066751490ae2112010464ee8950f76ae9e2f11a03e9ea336b528b": "logion-polkadot",
  "0x87ac53add0e7b7cd6cac65a1fc42284ec3a98246c1daaac535805e80216199e8": "logion-testnet",
  "0xd611f22d291c5b7b69f1e105cca03352984c344c4421977efaa4cbdd1834e2aa": "mangata",
  "0xf3c7ad88f6a80f366c4be216691411ef0622e8b809b1046ea297ef106058d4eb": "manta",
  "0x91bc6e169807aaa54802737e1c504b2577d4fafedd5a02c10293b1cd60e39527": "moonbase-alpha-testnet",
  "0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d": "moonbeam",
  "0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b": "moonriver",
  "0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9": "mythos",
  "0xe7e0962324a3b86c83404dbea483f25fb5dab4c224791c81b756cfc948006174": "neuroweb",
  "0x97da7ede98d7bad4e36b4d734b6055425a3be036da2a332ea5a7037656427a21": "nodle-polkadot",
  "0xc87870ef90a438d574b8e320f17db372c50f62beb52e479c8ff6ee5b460670b9": "opal-testnet",
  "0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2": "paseo-asset-hub",
  "0x77afd6190f1554ad45fd0d31aee62aacc33c6db0ea801129acb813f913e0764f": "paseo-testnet",
  "0xd2a5d385932d1f650dae03ef8e2748983779ee342c614f80854d32b8cd8fa48c": "peaq",
  "0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86": "pendulum",
  "0x1bb969d85965e4bb5a651abbedf21a54b6b31a21f66b5401cc3f1e286268d736": "phala",
  "0xd9b288f9083f852f2729af58476b82b04bc9ed7e07d705614a843c93460974b2": "phala-testnet",
  "0x6811a339673c9daa897944dcdac99c6e2939cc88245ed21951a0a3c9a2be75bc": "picasso",
  "0x7eb9354488318e7549c722669dcbdcdc526f1fef1420e7944667212f3601fdbd": "polimec",
  "0x3920bcb4960a1eef5580cd5367ff3f430eef052774f78468852f7b9cb39f8a3c": "polkadex-standalone",
  "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3": "polkadot",
  "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f": "polkadot-asset-hub",
  "0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464": "polkadot-bridge-hub",
  "0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2": "polkadot-collectives",
  "0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4": "polkadot-coretime",
  "0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008": "polkadot-people",
  "0x6fbd74e5e1d0a61d52ccfe9d4adaed16dd3a7caa37c6bc4d0c2fa12e8b2f4063": "polymesh",
  "0x2ace05e703aa50b48c0ccccfc8b424f7aab9a1e2c424ed12e45d20b1e8ffd0d6": "polymesh-testnet",
  "0xcd4d732201ebe5d6b014edda071c4203e16867305332301dc8d092044b28e554": "quartz",
  "0x631ccc82a078481584041656af292834e1ae6daab61d2875b4dd0c14bb9b17bc": "robonomics-kusama",
  "0xf8820c64d415196a42723347a305420ce55940c8a3f7ab38bc134b2ba8844a50": "rococo-basilisk-testnet",
  "0xec39b15e5a1945ff19b8e8c0f76990b5758ce19faa4578e8ed57eda33e844452": "rococo-bifrost-testnet",
  "0x466edf864b4314b97f36e45ec21ddb39e0bdc52789377b91be0957d5afad2eb2": "rococo-ewx-testnet",
  "0x6f58daca460670a15c4c49c752c07eeab025e07bc142a50f94186b052a4538a8": "rococo-kinera-testnet",
  "0xf2b8faefcf9c370872d0b4d2eee31d46b4de4a8688153d23d82a39e2d6bc8bbc": "rococo-neuro-web-testnet",
  "0x1ad405b58a84050383b7c6ec01baaf1a446c81cf841513a25b75bc01a00f450f": "rococo-sora-testnet",
  "0xfb2f6c0837c11d62c3554fc042b644563e3be9362efeddf63e95042607a3904f": "rococo-zeitgeist-testnet",
  "0xd4c0c08ca49dc7c680c3dac71a7c0703e5b222f4b6c03fe4c5219bb8f22c18dc": "shadow-kusama",
  "0xddb89973361a170839f80f152d2e9e38a376a5a7eccefcade763f46a8e567019": "shibuya-testnet",
  "0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108": "shiden-kusama",
  "0x6d8d9f145c2177fa83512492cdd80a71e29f22473f4a8943a6292149ac319fb9": "sora-kusama",
  "0xe92d165ad41e41e215d09713788173aecfdbe34d3bed29409d33a2ef03980738": "sora-polkadot",
  "0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5": "sora-standalone",
  "0x3266816be9fa51b32cfea58d3e33ca77246bc9618595a4300e44c8856a8d8a17": "sora-substrate-testnet",
  "0x4a12be580bb959937a1c7a61d5cf24428ed67fa571974b4007645d1886e7c89f": "subsocial-polkadot",
  "0x92e91e657747c41eeabed5129ff51689d2e935b9f6abfbd5dfcb2e1d0d035095":
    "subspace-gemini-3-f-testnet",
  "0x44f68476df71ebf765b630bf08dc1e0fedb2bf614a1aa0563b3f74f20e47b3e0": "tangle",
  "0xdd6d086f75ec041b66e20c4186d327b23c8af244c534a2418de6574e8c041a60": "tanssi",
  "0x6859c81ca95ef624c9dfe4dc6e3381c33e5d6509e35e147092bfbc780f777c4e": "ternoa",
  "0x0e00b212768e28b176d069890c106e37c331ea9b16b207f4e9baf67b3f3f3021": "torus",
  "0x84322d9cddbf35088f1e54e9a85c967a41a56a4f43445768125e61af166c7d31": "unique",
  "0xfe1b4c55fd4d668101126434206571a7838a8b6b93a6d1b95d607e78e6c53763": "vara",
  "0x525639f713f397dcf839bd022cd821f367ebcf179de7b9253531f8adbe5436d6": "vara-testnet",
  "0x21a1ba24a807ab70ade25cbd741e6428746a7007926ac7b82d102df7d620e2ea": "vtb",
  "0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9": "westend-asset-hub-testnet",
  "0x0441383e31d1266a92b4cb2ddd4c2e3661ac476996db7e5844c52433b81fe782":
    "westend-bridge-hub-testnet",
  "0x713daf193a6301583ff467be736da27ef0a72711b248927ba413f573d2b38e44":
    "westend-collectives-testnet",
  "0xf938510edee7c23efa6e9db74f227c827a1b518bffe92e2f6c9842dc53d38840": "westend-coretime-testnet",
  "0xafb18a620de2f0a9bf9c56cf8c8b05cacc6c608754959f3020e4fc90f9ae0c9f": "westend-penpal-testnet",
  "0x1eb6fb0ba5187434de017a70cb84d4f47142df1d571d0ef9e7e1407f2b80b93c": "westend-people-testnet",
  "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e": "westend-testnet",
  "0x28cc1df52619f4edd9f0389a7e910a636276075ecc429600f1dd434e281a04e9": "xode",
  "0x50dd5d206917bf10502c68fb4d18a59fc8aa31586f4e8856b493e43544aa82aa": "xxnetwork",
  "0x1bf2a2ecb4a868de66ea8610f2ce7c8c43706561b6476031315f6640fe38e060": "zeitgeist",
  "0xff7fe5a610f15fe7a0c52f94f86313fb7db7d3786e7f8acf2b66c11d5be7c242": "zkverify-volta-testnet",
}
