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
      "label": "usdtHolderA",
      "assetId": "1984",
      "address": "1BzYwzWoPk8cpfTDeUokJ7HRxRaMVBHJEMy2E5bzum1GdmX",
      "entry": {
        "key":
          "0x682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da9a319d0e87221ca1ee751c1529f201522c007000000064a5b7db2b0c8271fe85bce78da1e08622ff9ded7476d40178685d0a0a9d28cd396472dba36eb735f48ca54a0c7d7",
        "value": "0x0a3a00000000000000000000000000000001",
        "expected": {
          "balance": "14858",
          "status": {
            "type": "Liquid",
          },
          "reason": {
            "type": "Sufficient",
          },
        },
      },
      "assetStatus": "Live",
    },
    {
      "label": "usdtHolderB",
      "assetId": "1984",
      "address": "138wuG6nwtxChPcAvZiGwJSboUcwpnJzj5wYWPkSTPq2K5Ee",
      "entry": {
        "key":
          "0x682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da9a319d0e87221ca1ee751c1529f201522c0070000000a713df31d7409031ebdc8b7746fa25e87ff845357b2f4b4da72237b39b7ccd0d30af14f46bbe9a8c1ac14d81b9156",
        "value": "0x6c7a00000000000000000000000000000001",
        "expected": {
          "balance": "31340",
          "status": {
            "type": "Liquid",
          },
          "reason": {
            "type": "Sufficient",
          },
        },
      },
      "assetStatus": "Live",
    },
    {
      "label": "frozenAccount",
      "assetId": "50000103",
      "address": "16MBNLesSmdC9sHk9mcoVZFuc35ZB1Cu56UN5t57SdB2WuZq",
      "entry": {
        "key":
          "0x682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da931f25d593d60a1c53ecca075c4b0b1d6e7f0fa021c691170c4ede8cc196908f44207d734ec90fa12f990839b760ebbecec9326b50c61e2fd5da2f3b9e1930c037439794b",
        "value": "0x0000a0dec5adc93536000000000000000100",
        "expected": {
          "balance": "1000000000000000000000",
          "status": {
            "type": "Frozen",
          },
          "reason": {
            "type": "Consumer",
          },
        },
      },
      "assetStatus": "Live",
    },
    {
      "label": "usdtEmptyAccount",
      "assetId": "1984",
      "address": "12Vsqv75gtT6TEAV7mqgw7hqgj5spDzDbDkoKnk6CjBHseLF",
      "entry": {
        "key":
          "0x682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da9a319d0e87221ca1ee751c1529f201522c0070000f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
        "value": null,
        "expected": null,
      },
      "assetStatus": "Live",
    },
    {
      "label": "frozenAssetHolder",
      "assetId": "1313",
      "address": "14okT24c4gotG9RgafLjLCfqHBt81TGWFJHFq2dzPFXi6N7A",
      "entry": {
        "key":
          "0x682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da9b7b4350283ad1256f14ecf068f941dbd2105000028a6b598d048f874e1c27db5a89a1d97a85c3ffd2a6ee23ef3262ea491d924404aba5b534c3ab961c76598079222cd67",
        "value": "0x00e1f5050000000000000000000000000000",
        "expected": {
          "balance": "100000000",
          "status": {
            "type": "Liquid",
          },
          "reason": {
            "type": "Consumer",
          },
        },
      },
      "assetStatus": "Frozen",
    },
  ],
  "handEncoded": {
    "blocked": {
      "note": "frozenAccount bytes with the AccountStatus byte set to Blocked",
      "value": "0x0000a0dec5adc93536000000000000000200",
      "expected": {
        "balance": "1000000000000000000000",
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
