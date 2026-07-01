/** ******************************************************************************
 *  Vendored from @zondax/ledger-substrate@1.1.2 (Apache-2.0).
 *
 *  The registry of legacy (per-chain) Substrate Ledger apps. @zondax/ledger-substrate
 *  v2 removed this list along with the legacy `SubstrateApp`; Talisman still needs
 *  it to resolve the CLA / SLIP-0044 of accounts created under those apps (see
 *  ./substrateApp.ts). Values reproduced verbatim from 1.1.2
 *  (name / cla / slip0044 / ss58); guarded by substrateApp.test.ts.
 *
 *  (c) 2019 - 2024 Zondax AG
 *  (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */

export interface SubstrateAppParams {
  name: string
  cla: number
  slip0044: number
  ss58_addr_type: number
}

export const supportedApps: SubstrateAppParams[] = [
  {
    name: "Polkadot",
    cla: 0x90,
    slip0044: 0x80000162,
    ss58_addr_type: 0,
  },
  {
    name: "Polymesh",
    cla: 0x91,
    slip0044: 0x80000253,
    ss58_addr_type: 12,
  },
  {
    name: "Dock",
    cla: 0x92,
    slip0044: 0x80000252,
    ss58_addr_type: 22,
  },
  {
    name: "Centrifuge",
    cla: 0x93,
    slip0044: 0x800002eb,
    ss58_addr_type: 36,
  },
  {
    name: "Edgeware",
    cla: 0x94,
    slip0044: 0x8000020b,
    ss58_addr_type: 7,
  },
  {
    name: "Equilibrium",
    cla: 0x95,
    slip0044: 0x85f5e0fd,
    ss58_addr_type: 67,
  },
  {
    name: "Statemint",
    cla: 0x96,
    slip0044: 0x80000162,
    ss58_addr_type: 0,
  },
  {
    name: "Statemine",
    cla: 0x97,
    slip0044: 0x800001b2,
    ss58_addr_type: 2,
  },
  {
    name: "Nodle",
    cla: 0x98,
    slip0044: 0x800003eb,
    ss58_addr_type: 37,
  },
  {
    name: "Kusama",
    cla: 0x99,
    slip0044: 0x800001b2,
    ss58_addr_type: 2,
  },
  {
    name: "Karura",
    cla: 0x9a,
    slip0044: 0x800002ae,
    ss58_addr_type: 8,
  },
  {
    name: "Acala",
    cla: 0x9b,
    slip0044: 0x80000313,
    ss58_addr_type: 10,
  },
  {
    name: "VTB",
    cla: 0x9c,
    slip0044: 0x800002b6,
    ss58_addr_type: 42,
  },
  {
    name: "Peer",
    cla: 0x9d,
    slip0044: 0x800002ce,
    ss58_addr_type: 42,
  },
  {
    name: "Genshiro",
    cla: 0x9e,
    slip0044: 0x85f5e0fc,
    ss58_addr_type: 67,
  },
  {
    name: "Sora",
    cla: 0x9f,
    slip0044: 0x80000269,
    ss58_addr_type: 69,
  },
  {
    name: "Polkadex",
    cla: 0xa0,
    slip0044: 0x8000031f,
    ss58_addr_type: 88,
  },
  {
    name: "Bifrost",
    cla: 0xa1,
    slip0044: 0x80000314,
    ss58_addr_type: 6,
  },
  {
    name: "Reef",
    cla: 0xa2,
    slip0044: 0x80000333,
    ss58_addr_type: 42,
  },
  {
    name: "XXNetwork",
    cla: 0xa3,
    slip0044: 0x800007a3,
    ss58_addr_type: 55,
  },
  {
    name: "AlephZero",
    cla: 0xa4,
    slip0044: 0x80000283,
    ss58_addr_type: 42,
  },
  {
    name: "Interlay",
    cla: 0xa5,
    slip0044: 0x80000162,
    ss58_addr_type: 2032,
  },
  {
    name: "Parallel",
    cla: 0xa6,
    slip0044: 0x80000162,
    ss58_addr_type: 172,
  },
  {
    name: "Picasso",
    cla: 0xa7,
    slip0044: 0x800001b2,
    ss58_addr_type: 49,
  },
  {
    name: "Composable",
    cla: 0xa8,
    slip0044: 0x80000162,
    ss58_addr_type: 49,
  },
  {
    name: "Astar",
    cla: 0xa9,
    slip0044: 0x8000032a,
    ss58_addr_type: 5,
  },
  {
    name: "OriginTrail",
    cla: 0xaa,
    slip0044: 0x80000162,
    ss58_addr_type: 101,
  },
  {
    name: "HydraDX",
    cla: 0xab,
    slip0044: 0x80000162,
    ss58_addr_type: 63,
  },
  {
    name: "Stafi",
    cla: 0xac,
    slip0044: 0x8000038b,
    ss58_addr_type: 20,
  },
  {
    name: "Unique",
    cla: 0xad,
    slip0044: 0x80000295,
    ss58_addr_type: 7391,
  },
  {
    name: "BifrostKusama",
    cla: 0xae,
    slip0044: 0x80000314,
    ss58_addr_type: 6,
  },
  {
    name: "Phala",
    cla: 0xaf,
    slip0044: 0x80000162,
    ss58_addr_type: 30,
  },
  {
    name: "Khala",
    cla: 0xb1,
    slip0044: 0x800001b2,
    ss58_addr_type: 30,
  },
  {
    name: "Darwinia",
    cla: 0xb2,
    slip0044: 0x80000162,
    ss58_addr_type: 18,
  },
  {
    name: "Ajuna",
    cla: 0xb3,
    slip0044: 0x80000162,
    ss58_addr_type: 1328,
  },
  {
    name: "Bittensor",
    cla: 0xb4,
    slip0044: 0x800003ed,
    ss58_addr_type: 42,
  },
  {
    name: "Ternoa",
    cla: 0xb5,
    slip0044: 0x800003e3,
    ss58_addr_type: 42,
  },
  {
    name: "Pendulum",
    cla: 0xb6,
    slip0044: 0x80000162,
    ss58_addr_type: 56,
  },
  {
    name: "Zeitgeist",
    cla: 0xb7,
    slip0044: 0x80000162,
    ss58_addr_type: 73,
  },
  {
    name: "Joystream",
    cla: 0xb8,
    slip0044: 0x80000219,
    ss58_addr_type: 126,
  },
  {
    name: "Enjin",
    cla: 0xb9,
    slip0044: 0x80000483,
    ss58_addr_type: 2135,
  },
  {
    name: "Matrixchain",
    cla: 0xba,
    slip0044: 0x80000483,
    ss58_addr_type: 1110,
  },
  {
    name: "Quartz",
    cla: 0xbb,
    slip0044: 0x80000277,
    ss58_addr_type: 255,
  },
  {
    name: "Avail",
    cla: 0xbc,
    slip0044: 0x800002c5,
    ss58_addr_type: 42,
  },
  {
    name: "Entropy",
    cla: 0xbd,
    slip0044: 0x80000520,
    ss58_addr_type: 42,
  },
  {
    name: "Peaq",
    cla: 0x61,
    slip0044: 0x8000003c,
    ss58_addr_type: 42,
  },
  {
    name: "AvailRecovery",
    cla: 0xbe,
    slip0044: 0x80000162,
    ss58_addr_type: 42,
  },
]
