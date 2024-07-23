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
    specVersion: "1002006",
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
        url: "wss://apps-rpc.polkadot.io",
      },
      {
        url: "wss://polkadot-rpc.dwellir.com",
      },
      {
        url: "wss://polkadot-rpc-tn.dwellir.com",
      },
      {
        url: "wss://rpc.ibp.network/polkadot",
      },
      {
        url: "wss://rpc.dotters.network/polkadot",
      },
      {
        url: "wss://1rpc.io/dot",
      },
      {
        url: "wss://polkadot-public-rpc.blockops.network/ws",
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
        id: "equilibrium-polkadot",
        paraId: 2011,
        name: "Equilibrium",
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
        id: "geminis",
        paraId: 2038,
        name: "Geminis",
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
        id: "oak",
        paraId: 2090,
        name: "Oak",
      },
      {
        id: "omnibtc",
        paraId: 2053,
        name: "OmniBTC",
      },
      {
        id: "parallel",
        paraId: 2012,
        name: "Parallel",
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
        name: "Collectives",
      },
      {
        id: "sora-polkadot",
        paraId: 2025,
        name: "Sora",
      },
      {
        id: "subdao",
        paraId: 2018,
        name: "SubDAO",
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
        id: "watr",
        paraId: 2058,
        name: "Watr",
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
    specVersion: "1002006",
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
        url: "wss://kusama-rpc.polkadot.io",
      },
      {
        url: "wss://kusama-rpc.dwellir.com",
      },
      {
        url: "wss://kusama-rpc-tn.dwellir.com",
      },
      {
        url: "wss://rpc.ibp.network/kusama",
      },
      {
        url: "wss://rpc.dotters.network/kusama",
      },
      {
        url: "wss://1rpc.io/ksm",
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
        id: "gm",
        paraId: 2123,
        name: "GM",
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
        id: "k-laos",
        paraId: 3336,
        name: "K-Laos",
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
        id: "kpron",
        paraId: 2019,
        name: "Kpron",
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
        id: "kusama-people",
        paraId: 1004,
        name: "Kusama People",
      },
      {
        id: "kusama-coretime",
        paraId: 1005,
        name: "Kusama Coretime",
      },
      {
        id: "litmus",
        paraId: 2106,
        name: "Litmus",
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
        name: "Robonomics",
      },
      {
        id: "sakura",
        paraId: 2016,
        name: "Sakura",
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
      {
        id: "zero",
        paraId: 2236,
        name: "Subzero",
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
    sortIndex: 454,
    genesisHash: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
    prefix: 2,
    name: "Kusama Asset Hub",
    themeColor: "#ffffff",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg",
    chainName: "Kusama Asset Hub",
    chainType: "Live",
    implName: "statemine",
    specName: "statemine",
    specVersion: "1002006",
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
        url: "wss://sys.dotters.network/statemine",
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
      {
        url: "wss://statemine-rpc.dwellir.com",
      },
      {
        url: "wss://statemine-rpc-tn.dwellir.com",
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
    sortIndex: 455,
    genesisHash: "0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5",
    prefix: 2,
    name: "Kusama Bridge Hub",
    themeColor: "#ffffff",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-bridge-hub.svg",
    chainName: "Kusama BridgeHub",
    chainType: "Live",
    implName: "bridge-hub-kusama",
    specName: "bridge-hub-kusama",
    specVersion: "1002005",
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
        url: "wss://kusama-bridge-hub-rpc.dwellir.com",
      },
      {
        url: "wss://kusama-bridge-hub-rpc-tn.dwellir.com",
      },
      {
        url: "wss://sys.ibp.network/bridgehub-kusama",
      },
      {
        url: "wss://sys.dotters.network/bridgehub-kusama",
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
    balancesConfig: [],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "polkadot-asset-hub",
    isTestnet: false,
    isDefault: true,
    sortIndex: 656,
    genesisHash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
    prefix: 0,
    name: "Polkadot Asset Hub",
    themeColor: "#321d47",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg",
    chainName: "Polkadot Asset Hub",
    chainType: "Live",
    implName: "statemint",
    specName: "statemint",
    specVersion: "1002006",
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
        id: "polkadot-asset-hub-substrate-assets-23-pink",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-30-ded",
      },
      {
        id: "polkadot-asset-hub-substrate-assets-17-wifd",
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
      {
        url: "wss://statemint-rpc.dwellir.com",
      },
      {
        url: "wss://statemint-rpc-tn.dwellir.com",
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
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/usd-coin.webp",
            },
            {
              assetId: 1984,
              symbol: "USDT",
              coingeckoId: "tether",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdt.svg",
            },
            {
              assetId: 23,
              symbol: "PINK",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/pink.png",
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
          ],
        },
      },
      {
        moduleType: "substrate-foreignassets",
        moduleConfig: {
          tokens: [
            {
              assetId: '{"parents":1,"interior":{"X1":{"Parachain":2011}}}',
              symbol: "EQ",
              coingeckoId: "equilibrium-token",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eq.svg",
            },
            {
              assetId:
                '{"parents":2,"interior":{"X2":[{"GlobalConsensus":{"Ethereum":{"chainId":1} }},{"AccountKey20":{"network":null,"key":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}]}}',
              symbol: "WETH",
              coingeckoId: "weth",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/weth.webp",
            },
            {
              assetId: '{"parents":2,"interior":{"X1":{"GlobalConsensus":"Kusama"}}}',
              symbol: "KSM",
              coingeckoId: "kusama",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ksm.svg",
            },
            {
              assetId:
                '{"parents":1,"interior":{"X2":[{"Parachain":2030},{"GeneralKey":{"length":2,"data":"0x0001000000000000000000000000000000000000000000000000000000000000"}}]}}',
              symbol: "BNC",
              coingeckoId: "bifrost-native-coin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/bnc.svg",
            },
            {
              assetId:
                '{"parents":1,"interior":{"X2":[{"Parachain":2011},{"GeneralKey":{"length":3,"data":"0x6571640000000000000000000000000000000000000000000000000000000000"}}]}}',
              symbol: "EQD",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eqd.svg",
            },
            {
              assetId: '{"parents":1,"interior":{"X2":[{"Parachain":2004},{"PalletInstance":10}]}}',
              symbol: "GLMR",
              coingeckoId: "moonbeam",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/moonbeam.webp",
            },
            {
              assetId:
                '{"parents":1,"interior":{"X2":[{"Parachain":2030},{"GeneralKey":{"length":2,"data":"0x0900000000000000000000000000000000000000000000000000000000000000"}}]}}',
              symbol: "vDOT",
              coingeckoId: "voucher-dot",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/vdot.svg",
            },
            {
              assetId: '{"parents":1,"interior":{"X2":[{"Parachain":2034},{"GeneralIndex":0}]}}',
              symbol: "HDX",
              coingeckoId: "hydradx",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/hydradx.webp",
            },
            {
              assetId: '{"parents":1,"interior":{"X1":{"Parachain":2051}}}',
              symbol: "AJUN",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
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
    sortIndex: 657,
    genesisHash: "0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464",
    prefix: 0,
    name: "Polkadot Bridge Hub",
    themeColor: "#321d47",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-bridge-hub.svg",
    chainName: "Polkadot BridgeHub",
    chainType: "Live",
    implName: "bridge-hub-polkadot",
    specName: "bridge-hub-polkadot",
    specVersion: "1002005",
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
        url: "wss://polkadot-bridge-hub-rpc.dwellir.com",
      },
      {
        url: "wss://polkadot-bridge-hub-rpc-tn.dwellir.com",
      },
      {
        url: "wss://sys.ibp.network/bridgehub-polkadot",
      },
      {
        url: "wss://sys.dotters.network/bridgehub-polkadot",
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
    balancesConfig: [],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
]
