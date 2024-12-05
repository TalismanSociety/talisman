export const chains = [
  {
    id: "polkadot",
    isTestnet: false,
    isDefault: true,
    sortIndex: 1,
    genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    prefix: 0,
    name: "Polkadot",
    themeColor: "#e6007a",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot.svg",
    chainName: "Polkadot",
    chainType: "Live",
    implName: "parity-polkadot",
    specName: "polkadot",
    specVersion: "1003004",
    nativeToken: {
      id: "polkadot-substrate-native",
    },
    tokens: [
      {
        id: "polkadot-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: "https://polkadot.subscan.io/",
    chainspecQrUrl: "https://metadata.parity.io/qr/polkadot_specs.png",
    latestMetadataQrUrl: "https://metadata.parity.io/qr/polkadot_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://rpc.ibp.network/polkadot",
      },
      {
        url: "wss://polkadot-rpc.dwellir.com",
      },
      {
        url: "wss://polkadot-rpc-tn.dwellir.com",
      },
      {
        url: "wss://polkadot-rpc.publicnode.com",
      },
      {
        url: "wss://polkadot-public-rpc.blockops.network/ws",
      },
      {
        url: "wss://polkadot.dotters.network",
      },
      {
        url: "wss://rpc-polkadot.luckyfriday.io",
      },
      {
        url: "wss://polkadot.public.curie.radiumblock.co/ws",
      },
      {
        url: "wss://rockx-dot.w3node.com/polka-public-dot/ws",
      },
      {
        url: "wss://dot-rpc.stakeworld.io",
      },
      {
        url: "wss://polkadot.rpc.subquery.network/public/ws",
      },
    ],
    evmNetworks: [],
    parathreads: [
      {
        id: "acala",
        paraId: 2000,
        name: "Acala",
      },
      {
        id: "ajuna",
        paraId: 2051,
        name: "Ajuna",
      },
      {
        id: "astar",
        paraId: 2006,
        name: "Astar",
      },
      {
        id: "aventus",
        paraId: 2056,
        name: "Aventus",
      },
      {
        id: "bifrost-polkadot",
        paraId: 2030,
        name: "Bifrost Polkadot",
      },
      {
        id: "bitgreen",
        paraId: 2048,
        name: "Bitgreen",
      },
      {
        id: "centrifuge-polkadot",
        paraId: 2031,
        name: "Centrifuge",
      },
      {
        id: "composable-finance",
        paraId: 2019,
        name: "Composable Finance",
      },
      {
        id: "continuum",
        paraId: 3346,
        name: "Continuum",
      },
      {
        id: "crust-parachain",
        paraId: 2008,
        name: "Crust",
      },
      {
        id: "darwinia",
        paraId: 2046,
        name: "Darwinia",
      },
      {
        id: "ewx",
        paraId: 3345,
        name: "Energy Web X",
      },
      {
        id: "frequency",
        paraId: 2091,
        name: "Frequency",
      },
      {
        id: "hashed",
        paraId: 2093,
        name: "Hashed",
      },
      {
        id: "hydradx",
        paraId: 2034,
        name: "Hydration",
      },
      {
        id: "hyperbridge-polkadot",
        paraId: 3367,
        name: "Hyperbridge",
      },
      {
        id: "integritee-polkadot",
        paraId: 3359,
        name: "Integritee",
      },
      {
        id: "interlay",
        paraId: 2032,
        name: "Interlay",
      },
      {
        id: "invarch",
        paraId: 3340,
        name: "InvArch",
      },
      {
        id: "kilt-spiritnet",
        paraId: 2086,
        name: "KILT Spiritnet",
      },
      {
        id: "laos",
        paraId: 3370,
        name: "LAOS",
      },
      {
        id: "litentry",
        paraId: 2013,
        name: "Litentry",
      },
      {
        id: "logion-polkadot",
        paraId: 3354,
        name: "Logion",
      },
      {
        id: "manta",
        paraId: 2104,
        name: "Manta",
      },
      {
        id: "moonbeam",
        paraId: 2004,
        name: "Moonbeam",
      },
      {
        id: "mythos",
        paraId: 3369,
        name: "Mythos",
      },
      {
        id: "neuroweb",
        paraId: 2043,
        name: "NeuroWeb",
      },
      {
        id: "nodle-polkadot",
        paraId: 2026,
        name: "Nodle",
      },
      {
        id: "peaq",
        paraId: 3338,
        name: "Peaq",
      },
      {
        id: "pendulum",
        paraId: 2094,
        name: "Pendulum",
      },
      {
        id: "phala",
        paraId: 2035,
        name: "Phala",
      },
      {
        id: "polimec",
        paraId: 3344,
        name: "Polimec",
      },
      {
        id: "polkadex-polkadot-2",
        paraId: 2040,
        name: "Polkadex",
      },
      {
        id: "polkadot-asset-hub",
        paraId: 1000,
        name: "Polkadot Asset Hub",
      },
      {
        id: "polkadot-bridge-hub",
        paraId: 1002,
        name: "Polkadot Bridge Hub",
      },
      {
        id: "polkadot-collectives",
        paraId: 1001,
        name: "Polkadot Collectives",
      },
      {
        id: "polkadot-coretime",
        paraId: 1005,
        name: "Polkadot Coretime",
      },
      {
        id: "polkadot-people",
        paraId: 1004,
        name: "Polkadot People",
      },
      {
        id: "robonomics-polkadot",
        paraId: 3388,
        name: "Robonomics Polkadot",
      },
      {
        id: "sora-polkadot",
        paraId: 2025,
        name: "Sora",
      },
      {
        id: "subsocial-polkadot",
        paraId: 2101,
        name: "Subsocial",
      },
      {
        id: "t-3-rn",
        paraId: 3333,
        name: "t3rn",
      },
      {
        id: "unique",
        paraId: 2037,
        name: "Unique",
      },
      {
        id: "zeitgeist",
        paraId: 2092,
        name: "Zeitgeist",
      },
    ],
    paraId: null,
    relay: null,
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "polkadot",
          dcentName: "POLKADOT",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "kusama",
    isTestnet: false,
    isDefault: true,
    sortIndex: 2,
    genesisHash: "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
    prefix: 2,
    name: "Kusama",
    themeColor: "#ffffff",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama.svg",
    chainName: "Kusama",
    chainType: "Live",
    implName: "parity-kusama",
    specName: "kusama",
    specVersion: "1003003",
    nativeToken: {
      id: "kusama-substrate-native",
    },
    tokens: [
      {
        id: "kusama-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: "https://kusama.subscan.io/",
    chainspecQrUrl: "https://metadata.parity.io/qr/kusama_specs.png",
    latestMetadataQrUrl: "https://metadata.parity.io/qr/kusama_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://rpc.ibp.network/kusama",
      },
      {
        url: "wss://kusama-rpc.dwellir.com",
      },
      {
        url: "wss://kusama-rpc-tn.dwellir.com",
      },
      {
        url: "wss://kusama-rpc.publicnode.com",
      },
      {
        url: "wss://kusama.dotters.network",
      },
      {
        url: "wss://rpc-kusama.luckyfriday.io",
      },
      {
        url: "wss://kusama.public.curie.radiumblock.co/ws",
      },
      {
        url: "wss://rockx-ksm.w3node.com/polka-public-ksm/ws",
      },
      {
        url: "wss://ksm-rpc.stakeworld.io",
      },
      {
        url: "wss://kusama.rpc.subquery.network/public/ws",
      },
    ],
    evmNetworks: [],
    parathreads: [
      {
        id: "acurast",
        paraId: 2239,
        name: "Acurast Canary",
      },
      {
        id: "altair",
        paraId: 2088,
        name: "Altair",
      },
      {
        id: "amplitude",
        paraId: 2124,
        name: "Amplitude",
      },
      {
        id: "bajun",
        paraId: 2119,
        name: "Bajun",
      },
      {
        id: "basilisk",
        paraId: 2090,
        name: "Basilisk",
      },
      {
        id: "bifrost-kusama",
        paraId: 2001,
        name: "Bifrost Kusama",
      },
      {
        id: "bitcountry-pioneer",
        paraId: 2096,
        name: "Pioneer",
      },
      {
        id: "calamari",
        paraId: 2084,
        name: "Calamari",
      },
      {
        id: "crab",
        paraId: 2105,
        name: "Darwinia Crab",
      },
      {
        id: "curio",
        paraId: 3339,
        name: "Curio",
      },
      {
        id: "encointer",
        paraId: 1001,
        name: "Encointer",
      },
      {
        id: "imbue",
        paraId: 2121,
        name: "Imbue",
      },
      {
        id: "integritee-kusama",
        paraId: 2015,
        name: "Integritee",
      },
      {
        id: "ipci",
        paraId: 2222,
        name: "DAO IPCI",
      },
      {
        id: "kabocha",
        paraId: 2113,
        name: "Kabocha",
      },
      {
        id: "karura",
        paraId: 2000,
        name: "Karura",
      },
      {
        id: "khala",
        paraId: 2004,
        name: "Khala",
      },
      {
        id: "kintsugi",
        paraId: 2092,
        name: "Kintsugi",
      },
      {
        id: "kreivo",
        paraId: 2281,
        name: "Kreivo",
      },
      {
        id: "krest",
        paraId: 2241,
        name: "Krest",
      },
      {
        id: "kusama-asset-hub",
        paraId: 1000,
        name: "Kusama Asset Hub",
      },
      {
        id: "kusama-bridge-hub",
        paraId: 1002,
        name: "Kusama Bridge Hub",
      },
      {
        id: "kusama-coretime",
        paraId: 1005,
        name: "Coretime",
      },
      {
        id: "kusama-people",
        paraId: 1004,
        name: "Kusama People",
      },
      {
        id: "mangata",
        paraId: 2110,
        name: "MangataX",
      },
      {
        id: "moonriver",
        paraId: 2023,
        name: "Moonriver",
      },
      {
        id: "picasso",
        paraId: 2087,
        name: "Picasso",
      },
      {
        id: "quartz",
        paraId: 2095,
        name: "Quartz",
      },
      {
        id: "robonomics-kusama",
        paraId: 2048,
        name: "Robonomics Kusama",
      },
      {
        id: "shadow-kusama",
        paraId: 2012,
        name: "Crust Shadow",
      },
      {
        id: "shiden-kusama",
        paraId: 2007,
        name: "Shiden",
      },
      {
        id: "sora-kusama",
        paraId: 2011,
        name: "Sora",
      },
      {
        id: "tinker",
        paraId: 2125,
        name: "InvArch Tinkernet",
      },
      {
        id: "turing",
        paraId: 2114,
        name: "Turing",
      },
      {
        id: "xode",
        paraId: 3344,
        name: "Xode",
      },
    ],
    paraId: null,
    relay: null,
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "kusama",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ksm.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "kusama-asset-hub",
    isTestnet: false,
    isDefault: true,
    sortIndex: 521,
    genesisHash: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
    prefix: 2,
    name: "Kusama Asset Hub",
    themeColor: "#ffffff",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg",
    chainName: "Kusama Asset Hub",
    chainType: "Live",
    implName: "statemine",
    specName: "statemine",
    specVersion: "1003004",
    nativeToken: {
      id: "kusama-asset-hub-substrate-native",
    },
    tokens: [
      {
        id: "kusama-asset-hub-substrate-assets-8-rmrk",
      },
      {
        id: "kusama-asset-hub-substrate-assets-16-aris",
      },
      {
        id: "kusama-asset-hub-substrate-assets-1984-usdt",
      },
      {
        id: "kusama-asset-hub-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: "https://assethub-kusama.subscan.io/",
    chainspecQrUrl: "https://metadata.parity.io/qr/kusama-statemine_specs.png",
    latestMetadataQrUrl: "https://metadata.parity.io/qr/kusama-statemine_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://sys.ibp.network/statemine",
      },
      {
        url: "wss://asset-hub-kusama-rpc.dwellir.com",
      },
      {
        url: "wss://statemine-rpc-tn.dwellir.com",
      },
      {
        url: "wss://asset-hub-kusama.dotters.network",
      },
      {
        url: "wss://rpc-asset-hub-kusama.luckyfriday.io",
      },
      {
        url: "wss://kusama-asset-hub-rpc.polkadot.io",
      },
      {
        url: "wss://statemine.public.curie.radiumblock.co/ws",
      },
      {
        url: "wss://ksm-rpc.stakeworld.io/assethub",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 1000,
    relay: {
      id: "kusama",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "kusama",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ksm.svg",
        },
      },
      {
        moduleType: "substrate-assets",
        moduleConfig: {
          tokens: [
            {
              assetId: 8,
              symbol: "RMRK",
              coingeckoId: "rmrk",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/rmrk.svg",
            },
            {
              assetId: 16,
              symbol: "ARIS",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/aris.svg",
            },
            {
              assetId: 1984,
              symbol: "USDT",
              coingeckoId: "tether",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdt.svg",
            },
          ],
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "kusama-bridge-hub",
    isTestnet: false,
    isDefault: true,
    sortIndex: 522,
    genesisHash: "0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5",
    prefix: 2,
    name: "Kusama Bridge Hub",
    themeColor: "#ffffff",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-bridge-hub.svg",
    chainName: "Kusama BridgeHub",
    chainType: "Live",
    implName: "bridge-hub-kusama",
    specName: "bridge-hub-kusama",
    specVersion: "1003003",
    nativeToken: {
      id: "kusama-bridge-hub-substrate-native",
    },
    tokens: [
      {
        id: "kusama-bridge-hub-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: "https://metadata.parity.io/qr/kusama-bridge-hub-kusama_specs.png",
    latestMetadataQrUrl:
      "https://metadata.parity.io/qr/kusama-bridge-hub-kusama_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://sys.ibp.network/bridgehub-kusama",
      },
      {
        url: "wss://bridge-hub-kusama-rpc.dwellir.com",
      },
      {
        url: "wss://kusama-bridge-hub-rpc-tn.dwellir.com",
      },
      {
        url: "wss://bridge-hub-kusama.dotters.network",
      },
      {
        url: "wss://rpc-bridge-hub-kusama.luckyfriday.io",
      },
      {
        url: "wss://kusama-bridge-hub-rpc.polkadot.io",
      },
      {
        url: "wss://bridgehub-kusama.public.curie.radiumblock.co/ws",
      },
      {
        url: "wss://ksm-rpc.stakeworld.io/bridgehub",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 1002,
    relay: {
      id: "kusama",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "kusama",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-bridge-hub.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "polkadot-asset-hub",
    isTestnet: false,
    isDefault: true,
    sortIndex: 753,
    genesisHash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
    prefix: 0,
    name: "Polkadot Asset Hub",
    themeColor: "#321d47",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg",
    chainName: "Polkadot Asset Hub",
    chainType: "Live",
    implName: "statemint",
    specName: "statemint",
    specVersion: "1003004",
    nativeToken: {
      id: "polkadot-asset-hub-substrate-native",
    },
    tokens: [
      {
        id: "polkadot-asset-hub-substrate-assets-1337-usdc",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-1984-usdt",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-18-dota",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-23-pink",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-30-ded",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-17-wifd",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-555-game",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-690-bork",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-31337-wud",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-eq",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-ksm",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-bnc",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-eqd",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-glmr",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-myth",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-vdot",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-hdx",
      },
      {
        id: "polkadot-asset-hub-substrate-foreignassets-ajun",
      },
      {
        id: "polkadot-asset-hub-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: "https://assethub-polkadot.subscan.io/",
    chainspecQrUrl: "https://metadata.parity.io/qr/polkadot-statemint_specs.png",
    latestMetadataQrUrl: "https://metadata.parity.io/qr/polkadot-statemint_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://sys.ibp.network/statemint",
      },
      {
        url: "wss://sys.dotters.network/statemint",
      },
      {
        url: "wss://sys.ibp.network/asset-hub-polkadot",
      },
      {
        url: "wss://asset-hub-polkadot-rpc.dwellir.com",
      },
      {
        url: "wss://statemint-rpc-tn.dwellir.com",
      },
      {
        url: "wss://asset-hub-polkadot.dotters.network",
      },
      {
        url: "wss://rpc-asset-hub-polkadot.luckyfriday.io",
      },
      {
        url: "wss://polkadot-asset-hub-rpc.polkadot.io",
      },
      {
        url: "wss://statemint.public.curie.radiumblock.co/ws",
      },
      {
        url: "wss://dot-rpc.stakeworld.io/assethub",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 1000,
    relay: {
      id: "polkadot",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "polkadot",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg",
        },
      },
      {
        moduleType: "substrate-assets",
        moduleConfig: {
          tokens: [
            {
              assetId: 1337,
              symbol: "USDC",
              coingeckoId: "usd-coin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdc.svg",
            },
            {
              assetId: 1984,
              symbol: "USDT",
              coingeckoId: "tether",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdt.svg",
            },
            {
              assetId: 18,
              symbol: "DOTA",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dota.svg",
            },
            {
              assetId: 23,
              symbol: "PINK",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/pink.svg",
            },
            {
              assetId: 30,
              symbol: "DED",
              coingeckoId: "dot-is-ded",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ded.svg",
            },
            {
              assetId: 17,
              symbol: "WIFD",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/wifd.svg",
            },
            {
              assetId: 555,
              symbol: "GAME",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/game.svg",
            },
            {
              assetId: 690,
              symbol: "BORK",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/bork.svg",
            },
            {
              assetId: 31337,
              symbol: "WUD",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/wud.webp",
            },
          ],
        },
      },
      {
        moduleType: "substrate-foreignassets",
        moduleConfig: {
          tokens: [
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":2011}}}',
              symbol: "EQ",
              coingeckoId: "equilibrium-token",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eq.svg",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0"}}]}}',
              symbol: "WETH.e",
              coingeckoId: "weth",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/weth.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x6982508145454ce325ddbe47a25d4ec3d2311933"}}]}}',
              symbol: "PEPE.e",
              coingeckoId: "pepe",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/pepe.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X1","value":{"type":"GlobalConsensus","value":{"type":"Kusama"}}}}',
              symbol: "KSM",
              coingeckoId: "kusama",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ksm.svg",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"hex:0x0001000000000000000000000000000000000000000000000000000000000000"}}]}}',
              symbol: "BNC",
              coingeckoId: "bifrost-native-coin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/bnc.svg",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}}]}}',
              symbol: "USDC.e",
              coingeckoId: "usd-coin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/usd-coin.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xba41ddf06b7ffd89d1267b5a93bfef2424eb2003"}}]}}',
              symbol: "MYTH.e",
              coingeckoId: "mythos",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/mythos.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x18084fba666a33d37592fa2633fd49a74dd93a88"}}]}}',
              symbol: "tBTC.e",
              coingeckoId: "tbtc",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/tbtc.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0"}}]}}',
              symbol: "wstETH.e",
              coingeckoId: "wrapped-steth",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/wrapped-steth.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x582d872a1b094fc48f5de31d3b73f2d9be47def1"}}]}}',
              symbol: "TONCOIN.e",
              coingeckoId: "the-open-network",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/the-open-network.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x6b175474e89094c44da98b954eedeac495271d0f"}}]}}',
              symbol: "DAI.e",
              coingeckoId: "dai",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/dai.webp",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce"}}]}}',
              symbol: "SHIB.e",
              coingeckoId: "shiba-inu",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/shiba-inu.webp",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2011},{"type":"GeneralKey","value":{"length":3,"data":"hex:0x6571640000000000000000000000000000000000000000000000000000000000"}}]}}',
              symbol: "EQD",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eqd.svg",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"}}]}}',
              symbol: "WBTC.e",
              coingeckoId: "wrapped-bitcoin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/wrapped-bitcoin.webp",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2004},{"type":"PalletInstance","value":10}]}}',
              symbol: "GLMR",
              coingeckoId: "moonbeam",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/glmr.svg",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":3369}}}',
              symbol: "MYTH",
              coingeckoId: "mythos",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/myth.svg",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"hex:0x0900000000000000000000000000000000000000000000000000000000000000"}}]}}',
              symbol: "vDOT",
              coingeckoId: "voucher-dot",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/vdot.svg",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0x8daebade922df735c38c80c7ebd708af50815faa"}}]}}',
              symbol: "tBTC.e",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2034},{"type":"GeneralIndex","value":"bigint:0"}]}}',
              symbol: "HDX",
              coingeckoId: "hydradx",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/hdx.svg",
            },
            {
              onChainId:
                '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xdac17f958d2ee523a2206206994597c13d831ec7"}}]}}',
              symbol: "USDT.e",
              coingeckoId: "tether",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/tether.webp",
            },
            {
              onChainId:
                '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":2051}}}',
              symbol: "AJUN",
              coingeckoId: "ajuna-network-2",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ajun.svg",
            },
          ],
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "polkadot-bridge-hub",
    isTestnet: false,
    isDefault: true,
    sortIndex: 754,
    genesisHash: "0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464",
    prefix: 0,
    name: "Polkadot Bridge Hub",
    themeColor: "#321d47",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-bridge-hub.svg",
    chainName: "Polkadot BridgeHub",
    chainType: "Live",
    implName: "bridge-hub-polkadot",
    specName: "bridge-hub-polkadot",
    specVersion: "1003003",
    nativeToken: {
      id: "polkadot-bridge-hub-substrate-native",
    },
    tokens: [
      {
        id: "polkadot-bridge-hub-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: "https://metadata.parity.io/qr/polkadot-bridge-hub-polkadot_specs.png",
    latestMetadataQrUrl:
      "https://metadata.parity.io/qr/polkadot-bridge-hub-polkadot_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://sys.ibp.network/bridgehub-polkadot",
      },
      {
        url: "wss://bridge-hub-polkadot-rpc.dwellir.com",
      },
      {
        url: "wss://polkadot-bridge-hub-rpc-tn.dwellir.com",
      },
      {
        url: "wss://bridge-hub-polkadot.dotters.network",
      },
      {
        url: "wss://rpc-bridge-hub-polkadot.luckyfriday.io",
      },
      {
        url: "wss://polkadot-bridge-hub-rpc.polkadot.io",
      },
      {
        url: "wss://bridgehub-polkadot.public.curie.radiumblock.co/ws",
      },
      {
        url: "wss://dot-rpc.stakeworld.io/bridgehub",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 1002,
    relay: {
      id: "polkadot",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "polkadot",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-bridge-hub.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
]
