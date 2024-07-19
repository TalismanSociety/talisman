/* eslint-env node, es2021 */

const fs = require("fs")
const child_process = require("child_process")

const input = [
  {
    id: "polkadot",
    url: "wss://apps-rpc.polkadot.io",
  },
  {
    id: "kusama",
    url: "wss://kusama-rpc.polkadot.io",
  },
  {
    id: "3-dpass",
    url: "wss://rpc.3dpscan.io",
  },
  {
    id: "acala",
    url: "wss://acala-rpc.dwellir.com",
  },
  {
    id: "acurast",
    url: "wss://acurast-canarynet-ws.prod.gke.papers.tech",
  },
  {
    id: "ajuna",
    url: "wss://rpc-parachain.ajuna.network",
  },
  {
    id: "aleph-zero",
    url: "wss://ws.azero.dev",
  },
  {
    id: "altair",
    url: "wss://fullnode.altair.centrifuge.io",
  },
  {
    id: "amplitude",
    url: "wss://amplitude-rpc.dwellir.com",
  },
  {
    id: "astar",
    url: "wss://astar-rpc.dwellir.com",
  },
  {
    id: "aventus",
    url: "wss://public-rpc.mainnet.aventus.io",
  },
  {
    id: "bajun",
    url: "wss://rpc-parachain.bajun.network",
  },
  {
    id: "basilisk",
    url: "wss://basilisk-rpc.dwellir.com",
  },
  {
    id: "bifrost-kusama",
    url: "wss://bifrost-rpc.dwellir.com",
  },
  {
    id: "bifrost-polkadot",
    url: "wss://bifrost-polkadot-rpc.dwellir.com",
  },
  {
    id: "bitcountry-pioneer",
    url: "wss://pioneer-rpc-3.bit.country/wss",
  },
  {
    id: "bitgreen",
    url: "wss://mainnet.bitgreen.org",
  },
  {
    id: "bittensor",
    url: "wss://entrypoint-finney.opentensor.ai:443",
  },
  {
    id: "calamari",
    url: "wss://calamari.systems",
  },
  {
    id: "centrifuge-polkadot",
    url: "wss://centrifuge-rpc.dwellir.com",
  },
  {
    id: "cere",
    url: "wss://archive.mainnet.cere.network/ws",
  },
  {
    id: "chainflip",
    url: "wss://chainflip-rpc.dwellir.com",
  },
  {
    id: "chainx",
    url: "wss://mainnet.chainx.org/ws",
  },
  {
    id: "commune-ai",
    url: "wss://commune.api.onfinality.io/public-ws",
  },
  {
    id: "composable-finance",
    url: "wss://composable-rpc.dwellir.com",
  },
  {
    id: "continuum",
    url: "wss://continuum-rpc-1.metaverse.network/wss",
  },
  {
    id: "crab",
    url: "wss://crab-rpc.darwinia.network/",
  },
  {
    id: "creditcoin",
    url: "wss://mainnet.creditcoin.network/ws",
  },
  {
    id: "crust",
    url: "wss://crust-mainnet-rpc.dwellir.com",
  },
  {
    id: "crust-parachain",
    url: "wss://crust-parachain.crustapps.net",
  },
  {
    id: "curio",
    url: "wss://parachain.curioinvest.com/",
  },
  {
    id: "darwinia",
    url: "wss://darwinia-rpc.dwellir.com",
  },
  {
    id: "debio",
    url: "wss://gateway.mainnet.octopus.network/debionetwork/ae48005a0c7ecb4053394559a7f4069e",
  },
  {
    id: "dock-pos-mainnet",
    url: "wss://mainnet-node.dock.io",
  },
  {
    id: "edgeware",
    url: "wss://edgeware-rpc1.jelliedowl.net",
  },
  {
    id: "encointer",
    url: "wss://encointer-kusama-rpc.dwellir.com",
  },
  {
    id: "enjin-matrixchain",
    url: "wss://rpc.matrix.blockchain.enjin.io",
  },
  {
    id: "enjin-relay",
    url: "wss://rpc.relay.blockchain.enjin.io",
  },
  {
    id: "equilibrium-polkadot",
    url: "wss://equilibrium-rpc.dwellir.com",
  },
  {
    id: "ewx",
    url: "wss://public-rpc.mainnet.energywebx.com",
  },
  {
    id: "frequency",
    url: "wss://frequency-rpc.dwellir.com",
  },
  {
    id: "geminis",
    url: "wss://rpc.geminis.network",
  },
  {
    id: "gm",
    url: "wss://ws.gm.bldnodes.org/",
  },
  {
    id: "hashed",
    url: "wss://c1.hashed.network",
  },
  {
    id: "humanode",
    url: "wss://explorer-rpc-ws.mainnet.stages.humanode.io",
  },
  {
    id: "hydradx",
    url: "wss://hydradx-rpc.dwellir.com",
  },
  {
    id: "hyperbridge-polkadot",
    url: "wss://hyperbridge-nexus-rpc.blockops.network",
  },
  {
    id: "imbue",
    url: "wss://kusama.imbuenetwork.com",
  },
  {
    id: "integritee-kusama",
    url: "wss://kusama.api.integritee.network",
  },
  {
    id: "integritee-polkadot",
    url: "wss://integritee-rpc.dwellir.com",
  },
  {
    id: "interlay",
    url: "wss://interlay-rpc.dwellir.com",
  },
  {
    id: "invarch",
    url: "wss://invarch-rpc.dwellir.com",
  },
  {
    id: "ipci",
    url: "wss://kusama.rpc.ipci.io",
  },
  {
    id: "joystream",
    url: "wss://rpc.joyutils.org",
  },
  {
    id: "k-laos",
    url: "wss://rpc.klaos.laosfoundation.io",
  },
  {
    id: "kabocha",
    url: "wss://kabocha.jelliedowl.net",
  },
  {
    id: "karura",
    url: "wss://karura-rpc-0.aca-api.network",
  },
  {
    id: "khala",
    url: "wss://khala-rpc.dwellir.com",
  },
  {
    id: "kilt-spiritnet",
    url: "wss://kilt-rpc.dwellir.com",
  },
  {
    id: "kintsugi",
    url: "wss://kintsugi-rpc.dwellir.com",
  },
  {
    id: "kpron",
    url: "wss://kusama-kpron-rpc.apron.network/",
  },
  {
    id: "kreivo",
    url: "wss://kreivo.kippu.rocks/",
  },
  {
    id: "krest",
    url: "wss://krest.api.onfinality.io/public-ws",
  },
  {
    id: "kulupu",
    url: "wss://rpc.kulupu.corepaper.org/ws",
  },
  {
    id: "kusama-asset-hub",
    url: "wss://sys.ibp.network/statemine",
  },
  {
    id: "kusama-bridge-hub",
    url: "wss://kusama-bridge-hub-rpc.dwellir.com",
  },
  {
    id: "kusama-people",
    url: "wss://people-kusama-rpc.dwellir.com",
  },
  {
    id: "kusama-coretime",
    url: "wss://coretime-kusama-rpc.dwellir.com",
  },
  {
    id: "liberland",
    url: "wss://liberland-rpc.dwellir.com",
  },
  {
    id: "litentry",
    url: "wss://litentry-rpc.dwellir.com",
  },
  {
    id: "litmus",
    url: "wss://rpc.litmus-parachain.litentry.io",
  },
  {
    id: "logion-polkadot",
    url: "wss://para-rpc01.logion.network",
  },
  {
    id: "mangata",
    url: "wss://kusama-archive.mangata.online",
  },
  {
    id: "manta",
    url: "wss://ws.manta.systems",
  },
  {
    id: "moonbeam",
    url: "wss://moonbeam-rpc.dwellir.com",
  },
  {
    id: "moonriver",
    url: "wss://moonriver-rpc.dwellir.com",
  },
  {
    id: "myriad",
    url: "wss://gateway.mainnet.octopus.network/myriad/a4cb0a6e30ff5233a3567eb4e8cb71e0",
  },
  {
    id: "mythos",
    url: "wss://polkadot-mythos-rpc.polkadot.io",
  },
  {
    id: "neatcoin",
    url: "wss://rpc.neatcoin.org/ws",
  },
  {
    id: "neuroweb",
    url: "wss://origintrail-rpc.dwellir.com",
  },
  {
    id: "nftmart",
    url: "wss://mainnet.nftmart.io/rpc/ws",
  },
  {
    id: "nodle-polkadot",
    url: "wss://nodle-rpc.dwellir.com",
  },
  {
    id: "oak",
    url: "wss://rpc.oak.tech",
  },
  {
    id: "omnibtc",
    url: "wss://psc-parachain.coming.chat",
  },
  {
    id: "parallel",
    url: "wss://parallel-rpc.dwellir.com",
  },
  {
    id: "pendulum",
    url: "wss://rpc-pendulum.prd.pendulumchain.tech",
  },
  {
    id: "phala",
    url: "wss://phala-rpc.dwellir.com",
  },
  {
    id: "picasso",
    url: "wss://picasso-rpc.dwellir.com",
  },
  {
    id: "polimec",
    url: "wss://polimec.rpc.amforc.com",
  },
  {
    id: "polkadex-polkadot-2",
    url: "wss://polkadex-parachain-rpc.dwellir.com",
  },
  {
    id: "polkadex-standalone",
    url: "wss://polkadex-mainnet-rpc.dwellir.com",
  },
  {
    id: "polkadot-asset-hub",
    url: "wss://sys.ibp.network/statemint",
  },
  {
    id: "polkadot-bridge-hub",
    url: "wss://polkadot-bridge-hub-rpc.dwellir.com",
  },
  {
    id: "polkadot-collectives",
    url: "wss://polkadot-collectives-rpc.dwellir.com",
  },
  {
    id: "polymesh",
    url: "wss://mainnet-rpc.polymesh.network",
  },
  {
    id: "quartz",
    url: "wss://quartz-rpc.dwellir.com",
  },
  {
    id: "robonomics-kusama",
    url: "wss://robonomics-rpc.dwellir.com",
  },
  {
    id: "sakura",
    url: "wss://api-sakura.clover.finance",
  },
  {
    id: "shadow-kusama",
    url: "wss://rpc-shadow.crust.network/",
  },
  {
    id: "shiden-kusama",
    url: "wss://shiden-rpc.dwellir.com",
  },
  {
    id: "sora-kusama",
    url: "wss://ws.parachain-collator-2.c2.sora2.soramitsu.co.jp",
  },
  {
    id: "sora-polkadot",
    url: "wss://ws.parachain-collator-3.pc3.sora2.soramitsu.co.jp",
  },
  {
    id: "sora-standalone",
    url: "wss://ws.mof.sora.org",
  },
  {
    id: "subdao",
    url: "wss://parachain-rpc.subdao.org",
  },
  {
    id: "subsocial-polkadot",
    url: "wss://subsocial-rpc.dwellir.com",
  },
  {
    id: "t-3-rn",
    url: "wss://ws.t3rn.io",
  },
  {
    id: "tangle",
    url: "wss://rpc.tangle.tools",
  },
  {
    id: "ternoa",
    url: "wss://mainnet.ternoa.network",
  },
  {
    id: "thebifrost-mainnet",
    url: "wss://public-01.mainnet.bifrostnetwork.com/wss",
  },
  {
    id: "tinker",
    url: "wss://tinkernet-rpc.dwellir.com",
  },
  {
    id: "turing",
    url: "wss://rpc.turing.oak.tech",
  },
  {
    id: "unique",
    url: "wss://unique-rpc.dwellir.com",
  },
  {
    id: "vara",
    url: "wss://rpc.vara.network",
  },
  {
    id: "vtb",
    url: "wss://substratenode.vtbcfoundation.org/explorer",
  },
  {
    id: "watr",
    url: "wss://watr.public.curie.radiumblock.co/ws",
  },
  {
    id: "xode",
    url: "wss://rpcnodea01.xode.net/n7yoxCmcIrCF6VziCcDmYTwL8R03a/rpc",
  },
  {
    id: "xxnetwork",
    url: "wss://rpc.xx.network/",
  },
  {
    id: "zeitgeist",
    url: "wss://zeitgeist-rpc.dwellir.com",
  },
  {
    id: "zero",
    url: "wss://rpc-1.kusama.node.zero.io",
  },
]

const output = fs.openSync("papi.log", "a")
for (const item of input) {
  const command = `npx papi add ${item.id} -w ${item.url} >&2`
  console.log(command)
  fs.writeSync(output, `\n${command}\n`)

  try {
    child_process.execSync(command, { stdio: ["ignore", output, output] })
  } catch {
    // no-op
  }
}
fs.closeSync(output)
