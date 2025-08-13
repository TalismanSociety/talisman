import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"

export const migrateSubstrateTokensIds: Migration = {
  forward: new MigrationFunction(async () => {
    const migratedTokenIds = new Map(
      Object.entries({
        "acala-substrate-tokens-lp-aseed-lcdot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiADIBLAI4VVAEwDCuVgHdtZVth59yVBAEYAzDIC6MoA",
        "acala-substrate-tokens-lp-aseed-intr":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiAGKt8ASwDmXUQGddMMLxLkqCACwyAujKA",
        "acala-substrate-tokens-lp-aseed-ibtc":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiAGKt8ASwDmXUQGddMMLxLkqCAMwyAujKA",
        "acala-substrate-tokens-lp-aseed-ldot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiNpx59yVBIpEAZJAHlmsmQF0ZQA",
        "acala-substrate-tokens-lp-aca-aseed":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAwqJABfaQSGNEbTjz7kqCBSNEBVdEhnSAutKA",
        "acala-substrate-tokens-lp-dot-lcdot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1ZAHlmIAL6SCQxogAyASwCOFJQBMAwrlYB3DWVbYefclQQBGAMySAupKA",
        "acala-substrate-tokens-dot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiACIDySIAvi0A",
        "acala-substrate-tokens-ldot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiADIAiA8kiAL5tA",
        "acala-substrate-tokens-aseed":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAIICqAygCIgC+7QA",
        "acala-substrate-tokens-tap":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAsgIIAKIAvs0A",
        "acala-substrate-tokens-lcdot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIAyBLAjgVxQEwMICcB7Ad2wBtCBDAOxABoQA3SsjOeARgGYBfIA",
        "acala-substrate-tokens-weth":
          "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oFYiAWAEwDYi121WYAZhgsARgEYmAdnFSAZqyxSicmAE5pc5RlYZpADhABfIA",
        "acala-substrate-tokens-glmr":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AGAXyA",
        "acala-substrate-tokens-astr":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AmAXyA",
        "acala-substrate-tokens-eqd":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AOAXyA",
        "acala-substrate-tokens-intr":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AWAXyA",
        "acala-substrate-tokens-eq":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54B2AXyA",
        "acala-substrate-tokens-para":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
        "acala-substrate-tokens-pink":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAZgF8g",
        "acala-substrate-tokens-ibtc":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BmAXyA",
        "acala-substrate-tokens-pha":
          "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BOAXyA",
        "acala-substrate-tokens-wbtc":
          "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1rQA4stmAWIgMwwwGYWAIwCsATmYj+ANgCMAdmYATMTNlK0IkUO5Ki05rOYgAvkA",
        "acala-substrate-tokens-ape":
          "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oDMAWNAdgwGYYA2ARnZYAnABNhWJgA5hwrsLT8pAVgxNl-XjC7suolkqJSQAXyA",
        "acala-substrate-tokens-dai":
          "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oFYAWIgZgHYisBGNACacmAIwBsvMQLHsYWIuLGiAZsoEi+LdmiYYicAL5A",
        "acala-substrate-tokens-usdcet":
          "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1qwHYATAMwE4A2VgRgDMAFj5E2fbgCMio1kIF8YGNAA4hbTsxWTMOuAF8gA",
        "acala-substrate-tokens-tdot":
          "acala-substrate-tokens-N4IgLgngDgpiBcIDKYCGAjANjAggZzxjAAUB7UzAFVIGsYA7EAGhADdVMBXOeABgF8gA",
        "amplitude-substrate-tokens-ksm":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeABgF8g",
        "amplitude-substrate-tokens-usdt":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeARgF8g",
        "amplitude-substrate-tokens-tzs.s":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28ACoAtJLxkBnDeVyImMAB7wADAYDMXIQE4uUgEyZbmKzAAcUgKwB2e3Y9cvMSEpKTNjADMuLjMhSyljOzFMM1c7K0xXdMwARikxANdjGCiANhKpTBAAXxqgA",
        "amplitude-substrate-tokens-brl.s":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28AEIAlADK8ZAZ03lciJjAAe8AAyGYmTEIBsADjFcxJmAGYA7FK5CATF+8BWF2sATgBGaxhbFxM3F38AMxMXbycxaylvTFChW3ihTBcpIX9MAJgTKNdMEABfOqA",
        "amplitude-substrate-tokens-eurc.s":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28AKIBVAEoBhXjIDO28rkRMYAD3gAGYwCYAjNcswYADgBsAZhcB2GFxg2AnABmvgCsXEJmftaOUmZmUkJ+MJhcsR4ewVIBQq6YUlxcrhEe1kIwwWbBjmlCIAC+9UA",
        "amplitude-substrate-tokens-usdc.s":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28AKpIAIgGFeMgM5byuRExgAPeAAYjAZikBOawEY7FgBymYAMxjWnTqZlOYna1NXKTshDy4uNwsANhi3AHYxKU8uGJSxUwSEgCYuU0S3GLyxNzsAViFykABfOqA",
        "amplitude-substrate-tokens-audd.s":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28OgFUAIit4yAzpvK5ETGAA94ABkNCArADMpMAJx2A7HZgAmLiYsXXADgBsJq6uAIxWXFZuVkHBdlYAzBYwHlwWPlJpqVZCca5imN4mmMEWXPl+wWIgAL41QA",
        "amplitude-substrate-tokens-ngnc.s":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28VgHFWAYV4yAzpvK5ETGAA94ABkMAmLgEZMAM0xjbAZisAOV09sB2AJw+v5gCsXIG2QgBsXM5SgVImQj6BXiZcEbZSXD5WXlw5MFzmcSZJrtbhJuFSIAC+tUA",
        "amplitude-substrate-tokens-xlm":
          "amplitude-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwLKoY4BymYAloXAL6dA",
        "basilisk-substrate-tokens-aseed": "basilisk-substrate-tokens-ExA",
        "basilisk-substrate-tokens-tnkr": "basilisk-substrate-tokens-GxA",
        "basilisk-substrate-tokens-weth": "basilisk-substrate-tokens-IwBiA",
        "basilisk-substrate-tokens-teer": "basilisk-substrate-tokens-IwdiA",
        "basilisk-substrate-tokens-usdt": "basilisk-substrate-tokens-IwFiA",
        "basilisk-substrate-tokens-wusdt": "basilisk-substrate-tokens-IwJiA",
        "basilisk-substrate-tokens-xrt": "basilisk-substrate-tokens-IwNiA",
        "basilisk-substrate-tokens-dai": "basilisk-substrate-tokens-IwZiA",
        "basilisk-substrate-tokens-ksm": "basilisk-substrate-tokens-IxA",
        "basilisk-substrate-tokens-wbtc": "basilisk-substrate-tokens-IzI",
        "basilisk-substrate-tokens-usdcet": "basilisk-substrate-tokens-JxA",
        "bifrost-kusama-substrate-tokens-usdt":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54AGAXyA",
        "bifrost-kusama-substrate-tokens-mgx":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54AWAXyA",
        "bifrost-kusama-substrate-tokens-kint":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGAXyA",
        "bifrost-kusama-substrate-tokens-sdn":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BmAXyA",
        "bifrost-kusama-substrate-tokens-kbtc":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc55sBfIA",
        "bifrost-kusama-substrate-tokens-pha":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAAoASAgiAL6tA",
        "bifrost-kusama-substrate-tokens-dot":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiACIDySIAvi0A",
        "bifrost-kusama-substrate-tokens-bnc":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAEIByAwiAL6tA",
        "bifrost-kusama-substrate-tokens-rmrk":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAEoCydA0iAL5tA",
        "bifrost-kusama-substrate-tokens-zlk":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAFoAyA0iAL6tA",
        "bifrost-kusama-substrate-tokens-movr":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiALIDyAagEogC+7QA",
        "bifrost-kusama-substrate-tokens-kar":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANICCASiAL6tA",
        "bifrost-kusama-substrate-tokens-aseed":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIDKYCGAjANnANCAbqpgK5zyiSwIgDSAqkgCIgC+LQA",
        "bifrost-kusama-substrate-tokens-ksm":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIDKAsiAL6tA",
        "bifrost-kusama-substrate-tokens-blp0":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBCAZACiANCAbgQwBsBXOeABgF8g",
        "bifrost-kusama-substrate-tokens-blp2":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBCAZACiANCAbgQwBsBXOeAJgF8g",
        "bifrost-kusama-substrate-tokens-blp1":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBCAZACiANCAbgQwBsBXOeARgF8g",
        "bifrost-kusama-substrate-tokens-blp3":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBCAZACiANCAbgQwBsBXOeAZgF8g",
        "bifrost-kusama-substrate-tokens-vbnc":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOxAGhADcBDAGwFc55RJYEQAhAOQGEQBfdoA",
        "bifrost-kusama-substrate-tokens-vksm":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOxAGhADcBDAGwFc55RJYEQBpAZQFkQBfdoA",
        "bifrost-kusama-substrate-tokens-vmovr":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOxAGhADcBDAGwFc55RJYEQBZAeSQCUQBfDoA",
        "bifrost-kusama-substrate-tokens-vsksm":
          "bifrost-kusama-substrate-tokens-N4IgLgngDgpiBcIBqBlAKgewNYwHYgBoQA3AQwBsBXOeUSWBEAaRQFkQBfDoA",
        "bifrost-polkadot-substrate-tokens-ibtc":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54A2AXyA",
        "bifrost-polkadot-substrate-tokens-dot":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54AGAXyA",
        "bifrost-polkadot-substrate-tokens-manta":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54AOAXyA",
        "bifrost-polkadot-substrate-tokens-fil":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54AWAXyA",
        "bifrost-polkadot-substrate-tokens-intr":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54B2AXyA",
        "bifrost-polkadot-substrate-tokens-pink":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGABgF8g",
        "bifrost-polkadot-substrate-tokens-wave":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGAFgF8g",
        "bifrost-polkadot-substrate-tokens-ded":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGagXyA",
        "bifrost-polkadot-substrate-tokens-glmr":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGAXyA",
        "bifrost-polkadot-substrate-tokens-weth":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGAZgF8g",
        "bifrost-polkadot-substrate-tokens-pen":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BGbAXyA",
        "bifrost-polkadot-substrate-tokens-astr":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BmAXyA",
        "bifrost-polkadot-substrate-tokens-usdc":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc54BWAXyA",
        "bifrost-polkadot-substrate-tokens-usdt":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdgJhAGhADcBDAGwFc55sBfIA",
        "bifrost-polkadot-substrate-tokens-bnc":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAEIByAwiAL6tA",
        "bifrost-polkadot-substrate-tokens-vdot":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOwEwgBoQA3AQwBsBXOeABgF8g",
        "bifrost-polkadot-substrate-tokens-vmanta":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOwEwgBoQA3AQwBsBXOeADgF8g",
        "bifrost-polkadot-substrate-tokens-vfil":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOwEwgBoQA3AQwBsBXOeAFgF8g",
        "bifrost-polkadot-substrate-tokens-vglmr":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOwEwgBoQA3AQwBsBXOeARgF8g",
        "bifrost-polkadot-substrate-tokens-vastr":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOwEwgBoQA3AQwBsBXOeAZgF8g",
        "bifrost-polkadot-substrate-tokens-vbnc":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqAVA9gaxgOxAGhADcBDAGwFc55RJYEQAhAOQGEQBfdoA",
        "bifrost-polkadot-substrate-tokens-vsdot":
          "bifrost-polkadot-substrate-tokens-N4IgLgngDgpiBcIBqBlAKgewNYwHYCYQAaEANwEMAbAVzngAYBfIA",
        "centrifuge-polkadot-substrate-tokens-usdc":
          "centrifuge-polkadot-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54A2AXyA",
        "centrifuge-polkadot-substrate-tokens-glmr":
          "centrifuge-polkadot-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AWAXyA",
        "centrifuge-polkadot-substrate-tokens-usdt":
          "centrifuge-polkadot-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
        "centrifuge-polkadot-substrate-tokens-dot":
          "centrifuge-polkadot-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BWAXyA",
        "composable-finance-substrate-tokens-sdn":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuX1XIuCA",
        "composable-finance-substrate-tokens-astr":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuX1XJOCA",
        "composable-finance-substrate-tokens-eq":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuX1XKMWCA",
        "composable-finance-substrate-tokens-bld":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAY6jgg",
        "composable-finance-substrate-tokens-lsdot":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAY6tgg",
        "composable-finance-substrate-tokens-tia":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAY79gg",
        "composable-finance-substrate-tokens-movr":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAY7lgg",
        "composable-finance-substrate-tokens-silk":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAY7Vgg",
        "composable-finance-substrate-tokens-eqd":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAYidzgg",
        "composable-finance-substrate-tokens-usdc":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAYiMdgg",
        "composable-finance-substrate-tokens-usdt":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAYiN9gg",
        "composable-finance-substrate-tokens-glmr":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAYqdgg",
        "composable-finance-substrate-tokens-vdot":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAYqngg",
        "composable-finance-substrate-tokens-pica":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZLFgg",
        "composable-finance-substrate-tokens-vksm":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZycNgg",
        "composable-finance-substrate-tokens-ist":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZyctgg",
        "composable-finance-substrate-tokens-bnc":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZydlgg",
        "composable-finance-substrate-tokens-statom":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZyidgg",
        "composable-finance-substrate-tokens-osmo":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZyijgg",
        "composable-finance-substrate-tokens-ksm":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZyingg",
        "composable-finance-substrate-tokens-atom":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZyLgg",
        "composable-finance-substrate-tokens-dot":
          "composable-finance-substrate-tokens-EQIwlg5mB2AuBcB2AnAJlQDgIwDZUFYsAWVHIgZnMX2XPwuXwAZyTgg",
        "hydradx-substrate-tokens-pha": "hydradx-substrate-tokens-BxA",
        "hydradx-substrate-tokens-weth": "hydradx-substrate-tokens-EwBiA",
        "hydradx-substrate-tokens-cru": "hydradx-substrate-tokens-EwdiA",
        "hydradx-substrate-tokens-kilt": "hydradx-substrate-tokens-EwDiA",
        "hydradx-substrate-tokens-sub": "hydradx-substrate-tokens-EwFiA",
        "hydradx-substrate-tokens-nodl": "hydradx-substrate-tokens-EwNiA",
        "hydradx-substrate-tokens-usdc": "hydradx-substrate-tokens-OxA",
        "hydradx-substrate-tokens-unq": "hydradx-substrate-tokens-EwViA",
        "hydradx-substrate-tokens-usdt": "hydradx-substrate-tokens-IwBjHYDZyA",
        "hydradx-substrate-tokens-dai": "hydradx-substrate-tokens-IwDiA",
        "hydradx-substrate-tokens-gdot": "hydradx-substrate-tokens-GwTiA",
        "hydradx-substrate-tokens-ape": "hydradx-substrate-tokens-GxA",
        "hydradx-substrate-tokens-aave": "hydradx-substrate-tokens-IwBjDYCYBYg",
        "hydradx-substrate-tokens-sol": "hydradx-substrate-tokens-IwBjHYFYCYg",
        "hydradx-substrate-tokens-wifd": "hydradx-substrate-tokens-IwBjIDgJiA",
        "hydradx-substrate-tokens-wud": "hydradx-substrate-tokens-IwBjIDgViA",
        "hydradx-substrate-tokens-pen": "hydradx-substrate-tokens-IwBjIDmI",
        "hydradx-substrate-tokens-pink": "hydradx-substrate-tokens-IwBjIJmI",
        "hydradx-substrate-tokens-aca": "hydradx-substrate-tokens-IwBjITgo",
        "hydradx-substrate-tokens-dota": "hydradx-substrate-tokens-IwBjIZgDiA",
        "hydradx-substrate-tokens-ded": "hydradx-substrate-tokens-IwBjOBOI",
        "hydradx-substrate-tokens-game": "hydradx-substrate-tokens-IwBjoFiA",
        "hydradx-substrate-tokens-ldot": "hydradx-substrate-tokens-IwBjpI",
        "hydradx-substrate-tokens-bork": "hydradx-substrate-tokens-IwBjwFgDiA",
        "hydradx-substrate-tokens-intr": "hydradx-substrate-tokens-IwdiA",
        "hydradx-substrate-tokens-bnc": "hydradx-substrate-tokens-IwFiA",
        "hydradx-substrate-tokens-ztg": "hydradx-substrate-tokens-IwJiA",
        "hydradx-substrate-tokens-glmr": "hydradx-substrate-tokens-IwNiA",
        "hydradx-substrate-tokens-wbtc": "hydradx-substrate-tokens-MxA",
        "hydradx-substrate-tokens-vdot": "hydradx-substrate-tokens-IwViA",
        "hydradx-substrate-tokens-cfg": "hydradx-substrate-tokens-IwZiA",
        "hydradx-substrate-tokens-h20": "hydradx-substrate-tokens-IxA",
        "hydradx-substrate-tokens-ibtc": "hydradx-substrate-tokens-IzI",
        "hydradx-substrate-tokens-astr": "hydradx-substrate-tokens-JxA",
        "hydradx-substrate-tokens-dot": "hydradx-substrate-tokens-KxA",
        "hydradx-substrate-tokens-myth": "hydradx-substrate-tokens-MwBiA",
        "hydradx-substrate-tokens-ajun": "hydradx-substrate-tokens-MwJiA",
        "hydradx-substrate-tokens-ring": "hydradx-substrate-tokens-MwRiA",
        "hydradx-substrate-tokens-vastr": "hydradx-substrate-tokens-MzI",
        "interlay-substrate-tokens-dot":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiACIDySIAvi0A",
        "interlay-substrate-tokens-ibtc":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAJIBCSAwiAL5tA",
        "interlay-substrate-tokens-intr":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAJIBySASiAL5tA",
        "interlay-substrate-tokens-kbtc":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIBCSAwiAL5tA",
        "interlay-substrate-tokens-kint":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANICSAckiAL5tA",
        "interlay-substrate-tokens-ksm":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIDKAsiAL6tA",
        "interlay-substrate-tokens-qdot":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAyMB2ATAKgewNZpABoQA3AQwBsBXOeAJgF8g",
        "interlay-substrate-tokens-qibtc":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAyMB2ATAKgewNZpABoQA3AQwBsBXOeARgF8g",
        "interlay-substrate-tokens-qusdt":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAyMB2ATAKgewNZpABoQA3AQwBsBXOeAZgF8g",
        "interlay-substrate-tokens-lp-dot-intr":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAyUAqB7A1jAdiANCAG4CGANgK5zwDaoksCIG2ehpl1901IAIgHlUIAL4j83Roha4CxclQSTeASQByqAEqiRAXRFA",
        "interlay-substrate-tokens-lp-ibtc-usdt":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAyUAqB7A1jAdiANCAG4CGANgK5zwDaoksCIG2ehpl1901IAkgCFUAYRABfMfm6NEAMXQAnGAEsA5jgCCAZy0wwBYuSoIATGIC6YoA",
        "interlay-substrate-tokens-lp-ibtc-dot":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIAyUAqB7A1jAdiANCAG4CGANgK5zwDaoksCIG2ehpl1901IAkgCFUAYRABfMfm6NELXAWLkqCabwAiAeVTixAXTFA",
        "interlay-substrate-tokens-usdt":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AmAXyA",
        "interlay-substrate-tokens-ldot":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
        "interlay-substrate-tokens-hdx":
          "interlay-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAZgF8g",
        "karura-substrate-tokens-lp-kar-qtz":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAggCUQAXxkEhjRADFW+AJYBzLuIDOumGF4lyVBACYZAXRlA",
        "karura-substrate-tokens-lp-kar-lksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAggCUQAXxkEhjRG048+5KgkUiAMqPQBZWTIC6MoA",
        "karura-substrate-tokens-lp-kar-ksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAggCUQAXxkEhjRG048+5KgkUjR6ALKyZAXRlA",
        "karura-substrate-tokens-lp-kar-kusd":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAggCUQAXxkEhjRG048+5KgkUjRAVXRJZMgLoygA",
        "karura-substrate-tokens-lp-kusd-rmrk":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiAGKt8ASwDmXAIIBnPTDC8S5KggAMMgLoygA",
        "karura-substrate-tokens-lp-kusd-qtz":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiAGKt8ASwDmXAIIBnPTDC8S5KggBMMgLoygA",
        "karura-substrate-tokens-lp-kusd-air":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiAGKt8ASwDmXAIIBnPTDC8S5KggCMAJhkBdGUA",
        "karura-substrate-tokens-lp-kusd-csm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiAGKt8ASwDmXAIIBnPTDC8S5KggCsMgLoygA",
        "karura-substrate-tokens-lp-kusd-pha":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiNpx59yVBIpEAFABIBBWTIC6MoA",
        "karura-substrate-tokens-lp-kusd-bnc":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiNpx59yVBIpEAhAHIBhWTIC6MoA",
        "karura-substrate-tokens-lp-kusd-lksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiNpx59yVBIpEAZUegCysmQF0ZQA",
        "karura-substrate-tokens-lp-kusd-kint":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiNpx59yVBIpGiAkgDlmsmQF0ZQA",
        "karura-substrate-tokens-lp-kusd-kbtc":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiNpx59yVBIpGiAQswDCsmQF0ZQA",
        "karura-substrate-tokens-lp-kusd-ksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGkAquiQgAvjIJDGiNpx59yVBIpGj0AWVkyAujKA",
        "karura-substrate-tokens-lp-ksm-rmrk":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGl0AWRABfaQSGNEAMVb4AlgHMuAQQDOumGF4lyVBAAZpAXWlA",
        "karura-substrate-tokens-lp-ksm-aris":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGl0AWRABfaQSGNEAMVb4AlgHMuAQQDOumGF4lyVBAEZpAXWlA",
        "karura-substrate-tokens-lp-ksm-lksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAGl0AWRABfaQSGNEbTjz7kqCBSIAy4qbIC60oA",
        "karura-substrate-tokens-lp-tai-tksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1FgEEAkiAC+UgkMaJ0YbACMyMUQGdNMMAAVWrMm048+5KggAMUgLpSgA",
        "karura-substrate-tokens-pha":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAAoASAgiAL6tA",
        "karura-substrate-tokens-lksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiADIDSAygLIgC+7QA",
        "karura-substrate-tokens-bnc":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAEIByAwiAL6tA",
        "karura-substrate-tokens-vsksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAGoDKA0gwLIgC+HQA",
        "karura-substrate-tokens-kbtc":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIBCSAwiAL5tA",
        "karura-substrate-tokens-aseed":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANICqAygCIgC+7QA",
        "karura-substrate-tokens-kint":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANICSAckiAL5tA",
        "karura-substrate-tokens-ksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIDKAsiAL6tA",
        "karura-substrate-tokens-tai":
          "karura-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAsgIICSIAvs0A",
        "karura-substrate-tokens-kico":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54A2AXyA",
        "karura-substrate-tokens-rmrk":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AGAXyA",
        "karura-substrate-tokens-hei":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AmABgF8g",
        "karura-substrate-tokens-qtz":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AmAXyA",
        "karura-substrate-tokens-teer":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AOAXyA",
        "karura-substrate-tokens-hko":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AWAXyA",
        "karura-substrate-tokens-usdt":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54B2AXyA",
        "karura-substrate-tokens-kma":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGABgF8g",
        "karura-substrate-tokens-pchu":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAdgF8g",
        "karura-substrate-tokens-sdn":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGADgF8g",
        "karura-substrate-tokens-gens":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAFgF8g",
        "karura-substrate-tokens-air":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAJgF8g",
        "karura-substrate-tokens-tur":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGANgF8g",
        "karura-substrate-tokens-lt":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGATgF8g",
        "karura-substrate-tokens-eqd":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAVgF8g",
        "karura-substrate-tokens-aris":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
        "karura-substrate-tokens-crab":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAZgF8g",
        "karura-substrate-tokens-bsx":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGFgXyA",
        "karura-substrate-tokens-movr":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BmAXyA",
        "karura-substrate-tokens-neer":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BOAXyA",
        "karura-substrate-tokens-csm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BWAXyA",
        "karura-substrate-tokens-dai":
          "karura-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oBYAjFgNiIDMWBWLohhZYA7EV4ATAIxomATjkwZAZgkS+RKbxgiscoiKkgAvkA",
        "karura-substrate-tokens-usdcet":
          "karura-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oEYAzAZiKawFYAOAdiLYmTACwwh3AEacpbXrxgwMAExWiibNvzTL+IAL5A",
        "karura-substrate-tokens-waseed":
          "karura-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1pmwDYAOAZiIBMBGGbmwBGQmAIDsMXkRjiALKN5YAZrwCcgrHICsQ7RxwBfIA",
        "karura-substrate-tokens-tksm":
          "karura-substrate-tokens-N4IgLgngDgpiBcIDKYCGAjANjAggZzxjAAUB7UzAFVIGsYA7EAGhADdVMBXOeABgF8gA",
        "karura-substrate-tokens-3usd":
          "karura-substrate-tokens-N4IgLgngDgpiBcIDKYCGAjANjAggZzxjAAUB7UzAFVIGsYA7EAGhADdVMBXOeARgF8gA",
        "kintsugi-substrate-tokens-dot":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiACIDySIAvi0A",
        "kintsugi-substrate-tokens-ibtc":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAJIBCSAwiAL5tA",
        "kintsugi-substrate-tokens-intr":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAJIBySASiAL5tA",
        "kintsugi-substrate-tokens-kbtc":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIBCSAwiAL5tA",
        "kintsugi-substrate-tokens-kint":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANICSAckiAL5tA",
        "kintsugi-substrate-tokens-ksm":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiANIDKAsiAL6tA",
        "kintsugi-substrate-tokens-qksm":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAyMB2ATAKgewNZpABoQA3AQwBsBXOeAJgF8g",
        "kintsugi-substrate-tokens-qkbtc":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAyMB2ATAKgewNZpABoQA3AQwBsBXOeARgF8g",
        "kintsugi-substrate-tokens-qusdt":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAyMB2ATAKgewNZpABoQA3AQwBsBXOeAZgF8g",
        "kintsugi-substrate-tokens-lp-kbtc-usdt":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAyUAqB7A1jAdiANCAG4CGANgK5zwDaoksCIG2ehpl1901IA0gCFUAYRABfMfm6NEAMXQAnGAEsA5jgCCAZy0wwBYuSoIAzGIC6YoA",
        "kintsugi-substrate-tokens-lp-kbtc-ksm":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAyUAqB7A1jAdiANCAG4CGANgK5zwDaoksCIG2ehpl1901IA0gCFUAYRABfMfm6NELXAWLkqCabz4BlALLixAXTFA",
        "kintsugi-substrate-tokens-lp-ksm-kint":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIAyUAqB7A1jAdiANCAG4CGANgK5zwDaoksCIG2ehpl1901IA0gGUAsiAC+o-N0aIWuAsXJUEU3nwCSAOVRjRAXVFA",
        "kintsugi-substrate-tokens-lksm":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AmAXyA",
        "kintsugi-substrate-tokens-aseed":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
        "kintsugi-substrate-tokens-usdt":
          "kintsugi-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BmAXyA",
        "mangata-substrate-tokens-mgx": "mangata-substrate-tokens-EQBmQ",
        "pendulum-substrate-tokens-dot":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeABgF8g",
        "pendulum-substrate-tokens-pink":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeAdgF8g",
        "pendulum-substrate-tokens-hdx":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeADgF8g",
        "pendulum-substrate-tokens-brz":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeAFgF8g",
        "pendulum-substrate-tokens-usdc":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeAJgF8g",
        "pendulum-substrate-tokens-glmr":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeANgF8g",
        "pendulum-substrate-tokens-vdot":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeARgAYBfIA",
        "pendulum-substrate-tokens-usdc.axl":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeARgCYBfIA",
        "pendulum-substrate-tokens-usdt":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeARgF8g",
        "pendulum-substrate-tokens-bnc":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeARjIF8g",
        "pendulum-substrate-tokens-astr":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIAaBhAsiANCAbgQwBsBXOeATgF8g",
        "pendulum-substrate-tokens-tzs.s":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28ACoAtJLxkBnDeVyImMAB7wADAYDMXIQE4uUgEyZbmKzAAcUgKwB2e3Y9cvMSEpKTNjADMuLjMhSyljOzFMM1c7K0xXdMwARikxANdjGCiANhKpTBAAXxqgA",
        "pendulum-substrate-tokens-brl.s":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28AEIAlADK8ZAZ03lciJjAAe8AAyGYmTEIBsADjFcxJmAGYA7FK5CATF+8BWF2sATgBGaxhbFxM3F38AMxMXbycxaylvTFChW3ihTBcpIX9MAJgTKNdMEABfOqA",
        "pendulum-substrate-tokens-eurc.s":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28AKIBVAEoBhXjIDO28rkRMYAD3gAGYwCYAjNcswYADgBsAZhcB2GFxg2AnABmvgCsXEJmftaOUmZmUkJ+MJhcsR4ewVIBQq6YUlxcrhEe1kIwwWbBjmlCIAC+9UA",
        "pendulum-substrate-tokens-usdc.s":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28AKpIAIgGFeMgM5byuRExgAPeAAYjAZikBOawEY7FgBymYAMxjWnTqZlOYna1NXKTshDy4uNwsANhi3AHYxKU8uGJSxUwSEgCYuU0S3GLyxNzsAViFykABfOqA",
        "pendulum-substrate-tokens-audd.s":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28OgFUAIit4yAzpvK5ETGAA94ABkNCArADMpMAJx2A7HZgAmLiYsXXADgBsJq6uAIxWXFZuVkHBdlYAzBYwHlwWPlJpqVZCca5imN4mmMEWXPl+wWIgAL41QA",
        "pendulum-substrate-tokens-ngnc.s":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwIgCCaUAFpgHKkC2ALPkSeQlABjAPYATCiABGASwB28VgHFWAYV4yAzpvK5ETGAA94ABkMAmLgEZMAM0xjbAZisAOV09sB2AJw+v5gCsXIG2QgBsXM5SgVImQj6BXiZcEbZSXD5WXlw5MFzmcSZJrtbhJuFSIAC+tUA",
        "pendulum-substrate-tokens-xlm":
          "pendulum-substrate-tokens-N4IgLgngDgpiBcIDKYYBs0EMBOIA0IAbpmgK5zyiSwLKoY4BymYAloXAL6dA",
        "picasso-substrate-tokens-dot": "picasso-substrate-tokens-EQIwlg5mB2AuBcA2YQ",
        "picasso-substrate-tokens-eq": "picasso-substrate-tokens-EQIwlg5mB2AuBcAmADARlcIA",
        "picasso-substrate-tokens-sdn": "picasso-substrate-tokens-EQIwlg5mB2AuBcAmADMg7MIA",
        "picasso-substrate-tokens-astr": "picasso-substrate-tokens-EQIwlg5mB2AuBcAmADMgbMIA",
        "picasso-substrate-tokens-tnkr": "picasso-substrate-tokens-EQIwlg5mB2AuBcAmAjI4Q",
        "picasso-substrate-tokens-osmo": "picasso-substrate-tokens-EQIwlg5mB2AuBcAOYQ",
        "picasso-substrate-tokens-huahua": "picasso-substrate-tokens-EQIwlg5mB2AuBcAWATABmEA",
        "picasso-substrate-tokens-ksm": "picasso-substrate-tokens-EQIwlg5mB2AuBcAWYQ",
        "picasso-substrate-tokens-atom": "picasso-substrate-tokens-EQIwlg5mB2AuBcB2YQ",
        "picasso-substrate-tokens-umee": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGA7MIA",
        "picasso-substrate-tokens-movr": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGADAFmEA",
        "picasso-substrate-tokens-bnc": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGADAJmEA",
        "picasso-substrate-tokens-vksm": "picasso-substrate-tokens-EQIwlg5mB2AuBcBmATMIA",
        "picasso-substrate-tokens-kar": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGADI4Q",
        "picasso-substrate-tokens-statom": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGADMIA",
        "picasso-substrate-tokens-bld": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGAHMIA",
        "picasso-substrate-tokens-bcre": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGALMIA",
        "picasso-substrate-tokens-scrt": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGArMIA",
        "picasso-substrate-tokens-eqd": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGATAdmEA",
        "picasso-substrate-tokens-aseed": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGATATmEA",
        "picasso-substrate-tokens-ntrn": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGATMIA",
        "picasso-substrate-tokens-usdt": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGAzABmEA",
        "picasso-substrate-tokens-wbtc": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGAzAJmEA",
        "picasso-substrate-tokens-usdc": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGAzI4Q",
        "picasso-substrate-tokens-weth": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGAzM4Q",
        "picasso-substrate-tokens-cre": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGAzMIA",
        "picasso-substrate-tokens-stars": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGRwg",
        "picasso-substrate-tokens-pica": "picasso-substrate-tokens-EQIwlg5mB2AuBcBGYQ",
        "picasso-substrate-tokens-bnc-ksm": "picasso-substrate-tokens-EQIwlg5mB2AuBcBmAjMIA",
        "picasso-substrate-tokens-vdot": "picasso-substrate-tokens-EQIwlg5mB2AuBcBmALMIA",
        "picasso-substrate-tokens-bnc-dot": "picasso-substrate-tokens-EQIwlg5mB2AuBcBmRwg",
        "picasso-substrate-tokens-strd": "picasso-substrate-tokens-EQIwlg5mB2AuBcBOYQ",
        "zeitgeist-substrate-tokens-hdx":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54A2AXyA",
        "zeitgeist-substrate-tokens-dot":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AGAXyA",
        "zeitgeist-substrate-tokens-bnc":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AOAXyA",
        "zeitgeist-substrate-tokens-intr":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54B2AXyA",
        "zeitgeist-substrate-tokens-vglmr":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGABgF8g",
        "zeitgeist-substrate-tokens-usdc":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
        "zeitgeist-substrate-tokens-vastr":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGFgXyA",
        "zeitgeist-substrate-tokens-glmr":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BmAXyA",
        "zeitgeist-substrate-tokens-vdot":
          "zeitgeist-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BOAXyA",
      }),
    )

    await db.transaction("readwrite", "transactions", async (t) => {
      await t.transactions.each(async (tx) => {
        if (!tx.tokenId?.includes("substrate-tokens")) return

        const newTokenId = migratedTokenIds.get(tx.tokenId)
        if (!newTokenId) return

        tx.tokenId = newTokenId

        await t.transactions.put(tx)
      })
    })
  }),
}
