// Recorded by .tmp/k2-substrate-a/capture.mjs from wss://polkadot-asset-hub-rpc.polkadot.io at block 21155423
export const polkadotAssetHub = {
  "source": {
    "rpc": "wss://polkadot-asset-hub-rpc.polkadot.io",
    "blockHash": "0x4862e0474ddd0f7d329b18862d717988e697cbdf333f1b5d2623400fcd98f236",
    "blockNumber": 21155423,
    "specVersion": 2005000,
    "metadataFixture": "assethub-metadata-v15.scale.gz",
  },
  "holders": [
    {
      "label": "ethHolder",
      "onChainId":
        '{"parents":2,"interior":{"type":"X1","value":{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}}}}',
      "address": "12ZuLmUFSbn3GmmyDMkwz9tYVU3mPmxEKJqaBrWAzah8XHPJ",
      "entry": {
        "key":
          "0x30e64a56026f4b5e3c2d196283a9a17db99d880ec681799c0cf30e8886371da9ebadc79f8d931a3b5b3e69a257ca50fa02010907040002e81240ac508cd74f0a05cbe83104455448000292ecaee3a76223d6b95adb969f19af7836c1770000000000000000",
        "value": "0xa49df0b7c019000000000000000000000001",
        "expected": {
          "balance": "28315510414756",
          "status": {
            "type": "Liquid",
          },
          "reason": {
            "type": "Sufficient",
          },
        },
      },
    },
    {
      "label": "wethHolder",
      "onChainId":
        '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}]}}',
      "address": "16ZrR53r7eucMoemefV2G79SQaLaSE43sojcGShPW4YxhbQ8",
      "entry": {
        "key":
          "0x30e64a56026f4b5e3c2d196283a9a17db99d880ec681799c0cf30e8886371da91bb4b49f9a32f31e068e193911c066e102020907040300c02aaa39b223fe8d0a0e5c4f27ead9083c756cc201f0dff2ffa601d2fea536590c3e7111f63b5dac64b33afd6c642722d2a212421942ff13761f9b4edddbcd439576d51a",
        "value": "0x0000c16ff286230000000000000000000000",
        "expected": {
          "balance": "10000000000000000",
          "status": {
            "type": "Liquid",
          },
          "reason": {
            "type": "Consumer",
          },
        },
      },
    },
    {
      "label": "vdotHolder",
      "onChainId":
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"0x0900000000000000000000000000000000000000000000000000000000000000"}}]}}',
      "address": "12xTvdsxPMao8DXfrfRo62fyrZ8XFGAT7xoWBFMC3Jap3Jyg",
      "entry": {
        "key":
          "0x30e64a56026f4b5e3c2d196283a9a17db99d880ec681799c0cf30e8886371da9e1dc8b21729d781027e9d3da9ced5050010200b91f060209000000000000000000000000000000000000000000000000000000000000000b9ffa2129be2162165e29379af4cb7356895e148116ffe3390a47214d49496c7bb3578060c006ca4044b978b70db501",
        "value": "0x0003164e0200000000000000000000000000",
        "expected": {
          "balance": "9900000000",
          "status": {
            "type": "Liquid",
          },
          "reason": {
            "type": "Consumer",
          },
        },
      },
    },
    {
      "label": "wethEmptyAccount",
      "onChainId":
        '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}]}}',
      "address": "12Vsqv75gtT6TEAV7mqgw7hqgj5spDzDbDkoKnk6CjBHseLF",
      "entry": {
        "key":
          "0x30e64a56026f4b5e3c2d196283a9a17db99d880ec681799c0cf30e8886371da91bb4b49f9a32f31e068e193911c066e102020907040300c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
        "value": null,
        "expected": null,
      },
    },
  ],
  "handEncoded": {
    "frozen": {
      "note": "wethHolder bytes with the AccountStatus byte set to Frozen",
      "value": "0x0000c16ff286230000000000000000000100",
      "expected": {
        "balance": "10000000000000000",
        "status": {
          "type": "Frozen",
        },
        "reason": {
          "type": "Consumer",
        },
      },
    },
    "blocked": {
      "note": "wethHolder bytes with the AccountStatus byte set to Blocked",
      "value": "0x0000c16ff286230000000000000000000200",
      "expected": {
        "balance": "10000000000000000",
        "status": {
          "type": "Blocked",
        },
        "reason": {
          "type": "Consumer",
        },
      },
    },
  },
}
