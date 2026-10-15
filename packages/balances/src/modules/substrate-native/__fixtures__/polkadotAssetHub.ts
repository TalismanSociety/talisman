// Recorded by .tmp/k2-substrate-a/capture.mjs from wss://polkadot-asset-hub-rpc.polkadot.io at block 21155423
export const polkadotAssetHub = {
  "source": {
    "rpc": "wss://polkadot-asset-hub-rpc.polkadot.io",
    "blockHash": "0x4862e0474ddd0f7d329b18862d717988e697cbdf333f1b5d2623400fcd98f236",
    "blockNumber": 21155423,
    "specVersion": 2005000,
    "metadataFixture": "assethub-metadata-v15.scale.gz",
  },
  "constants": {
    "nominationPoolsPalletId": "py/nopls",
    "existentialDeposit": "100000000",
  },
  "accounts": {
    "poolMember": {
      "address": "16i96g4xVZconpxi5WkG7TQfrAbvqJ7g6o4ie1dV5zwib8YW",
      "entries": {
        "account": {
          "key":
            "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da966cff6dc0535463693774961966f842cfc8d7d10cbe6eaa0872328475d7e75c41e2af32d3608540c5917d2b297594628",
          "value":
            "0x03000000010000000200000000000000a51162a703000000000000000000000000902f5009000000000000000000000000902f5009000000000000000000000000000000000000000000000000000080",
          "expected": {
            "nonce": 3,
            "consumers": 1,
            "providers": 2,
            "sufficients": 0,
            "data": {
              "free": "15693124005",
              "reserved": "40000000000",
              "frozen": "40000000000",
              "flags": "170141183460469231731687303715884105728",
            },
          },
        },
        "locks": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f218f26c73add634897550b4003b26bc666cff6dc0535463693774961966f842cfc8d7d10cbe6eaa0872328475d7e75c41e2af32d3608540c5917d2b297594628",
          "value": "0x047079636f6e766f7400902f5009000000000000000000000002",
          "expected": [
            {
              "id": "0x7079636f6e766f74",
              "amount": "40000000000",
              "reasons": {
                "type": "All",
              },
              "idText": "pyconvot",
            },
          ],
        },
        "freezes": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf166cff6dc0535463693774961966f842cfc8d7d10cbe6eaa0872328475d7e75c41e2af32d3608540c5917d2b297594628",
          "value": null,
          "expected": null,
        },
        "holds": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f811187ede3c61f3269344d168d3e633766cff6dc0535463693774961966f842cfc8d7d10cbe6eaa0872328475d7e75c41e2af32d3608540c5917d2b297594628",
          "value": "0x04530000902f50090000000000000000000000",
          "expected": [
            {
              "id": {
                "type": "DelegatedStaking",
                "value": {
                  "type": "StakingDelegation",
                },
              },
              "amount": "40000000000",
            },
          ],
        },
        "stakingLedger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc466cff6dc0535463693774961966f842cfc8d7d10cbe6eaa0872328475d7e75c41e2af32d3608540c5917d2b297594628",
          "value": null,
          "expected": null,
        },
        "poolMembers": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696273c5f69e270d5b7a07f9996fe9e4e04880738a9c2474a85d0fc8d7d10cbe6eaa0872328475d7e75c41e2af32d3608540c5917d2b297594628",
          "value":
            "0xa6000000000000000000000000000000000000001fc93cc101b2c803000000000000000004a407000000902f50090000000000000000000000",
          "expected": {
            "pool_id": 166,
            "points": "0",
            "last_recorded_reward_counter": "272663498062612767",
            "unbonding_eras": [[1956, "40000000000"]],
          },
        },
      },
      "runtimeApi": {
        "pointsToBalance": "0",
        "memberTotalBalance": "40000000000",
      },
    },
    "activeMember": {
      "address": "17VAyagLFSy1hJvGdefmVYWMP17ySzJb5oGhBVDe4gVNFLu",
      "entries": {
        "account": {
          "key":
            "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da934ad7b98f89ff11e63ce9cf310c7d35b04f24ecc470c0cf5460c9fe604db3321c62a9d40b50d74c18b912ee45141a03f",
          "value":
            "0x010000000100000002000000000000005f7d7dbe020000000000000000000000ed26848e5400000000000000000000000000000000000000000000000000000000000000000000000000000000000080",
          "expected": {
            "nonce": 1,
            "consumers": 1,
            "providers": 2,
            "sufficients": 0,
            "data": {
              "free": "11785829727",
              "reserved": "363168278253",
              "frozen": "0",
              "flags": "170141183460469231731687303715884105728",
            },
          },
        },
        "locks": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f218f26c73add634897550b4003b26bc634ad7b98f89ff11e63ce9cf310c7d35b04f24ecc470c0cf5460c9fe604db3321c62a9d40b50d74c18b912ee45141a03f",
          "value": null,
          "expected": null,
        },
        "freezes": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf134ad7b98f89ff11e63ce9cf310c7d35b04f24ecc470c0cf5460c9fe604db3321c62a9d40b50d74c18b912ee45141a03f",
          "value": null,
          "expected": null,
        },
        "holds": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f811187ede3c61f3269344d168d3e633734ad7b98f89ff11e63ce9cf310c7d35b04f24ecc470c0cf5460c9fe604db3321c62a9d40b50d74c18b912ee45141a03f",
          "value": "0x045300ed26848e540000000000000000000000",
          "expected": [
            {
              "id": {
                "type": "DelegatedStaking",
                "value": {
                  "type": "StakingDelegation",
                },
              },
              "amount": "363168278253",
            },
          ],
        },
        "stakingLedger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc434ad7b98f89ff11e63ce9cf310c7d35b04f24ecc470c0cf5460c9fe604db3321c62a9d40b50d74c18b912ee45141a03f",
          "value": null,
          "expected": null,
        },
        "poolMembers": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696273c5f69e270d5b7a07f9996fe9e4e048803c3cfb746620ade04f24ecc470c0cf5460c9fe604db3321c62a9d40b50d74c18b912ee45141a03f",
          "value": "0xc80000006ff4ba8e540000000000000000000000ac106e8519cad403000000000000000000",
          "expected": {
            "pool_id": 200,
            "points": "363171869807",
            "last_recorded_reward_counter": "276067688138018988",
            "unbonding_eras": [],
          },
        },
      },
      "runtimeApi": {
        "pointsToBalance": "363162821958",
        "memberTotalBalance": "363162821958",
      },
    },
    "directStaker": {
      "address": "13NQH1D2XTDgREBziURwcaQGKU5GCwHnSR4Yy3ioiANsc8Fq",
      "entries": {
        "account": {
          "key":
            "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da900007098e9333ac03decdd85800a888868caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca",
          "value":
            "0x00000000040000000100000000000000da0dc0140400000000000000000000000088526a7400000000000000000000000000000000000000000000000000000000000000000000000000000000000080",
          "expected": {
            "nonce": 0,
            "consumers": 4,
            "providers": 1,
            "sufficients": 0,
            "data": {
              "free": "17527999962",
              "reserved": "500000000000",
              "frozen": "0",
              "flags": "170141183460469231731687303715884105728",
            },
          },
        },
        "locks": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f218f26c73add634897550b4003b26bc600007098e9333ac03decdd85800a888868caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca",
          "value": null,
          "expected": null,
        },
        "freezes": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf100007098e9333ac03decdd85800a888868caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca",
          "value": null,
          "expected": null,
        },
        "holds": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f811187ede3c61f3269344d168d3e633700007098e9333ac03decdd85800a888868caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca",
          "value": "0x0459000088526a740000000000000000000000",
          "expected": [
            {
              "id": {
                "type": "Staking",
                "value": {
                  "type": "Staking",
                },
              },
              "amount": "500000000000",
            },
          ],
        },
        "stakingLedger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc400007098e9333ac03decdd85800a888868caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca",
          "value":
            "0x68caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca070088526a740004070088526a741905",
          "expected": {
            "stash": "13NQH1D2XTDgREBziURwcaQGKU5GCwHnSR4Yy3ioiANsc8Fq",
            "total": "500000000000",
            "active": "0",
            "unlocking": [
              {
                "value": "500000000000",
                "era": 326,
              },
            ],
          },
        },
        "poolMembers": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696273c5f69e270d5b7a07f9996fe9e4e048871f8632da2d2abdd68caf96152aaa206c709b238499142c8b818bb2951169736e08286976840b7ca",
          "value": null,
          "expected": null,
        },
      },
    },
    "freezeHolder": {
      "address": "13UVJyLnbVp8c4FQeiGZUHC1EFGHpaJEPmPHQzZikzWevJQB",
      "entries": {
        "account": {
          "key":
            "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9003b9f740f97dab70e3d2de23cdf5d976d6f646c70792f6e6f706c730151010000000000000000000000000000000000",
          "value":
            "0x0000000001000000010000000000000007c758460100000000000000000000000000000000000000000000000000000000e1f50500000000000000000000000000000000000000000000000000000080",
          "expected": {
            "nonce": 0,
            "consumers": 1,
            "providers": 1,
            "sufficients": 0,
            "data": {
              "free": "5475190535",
              "reserved": "0",
              "frozen": "100000000",
              "flags": "170141183460469231731687303715884105728",
            },
          },
        },
        "locks": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f218f26c73add634897550b4003b26bc6003b9f740f97dab70e3d2de23cdf5d976d6f646c70792f6e6f706c730151010000000000000000000000000000000000",
          "value": null,
          "expected": null,
        },
        "freezes": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf1003b9f740f97dab70e3d2de23cdf5d976d6f646c70792f6e6f706c730151010000000000000000000000000000000000",
          "value": "0x04500000e1f505000000000000000000000000",
          "expected": [
            {
              "id": {
                "type": "NominationPools",
                "value": {
                  "type": "PoolMinBalance",
                },
              },
              "amount": "100000000",
            },
          ],
        },
        "holds": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f811187ede3c61f3269344d168d3e6337003b9f740f97dab70e3d2de23cdf5d976d6f646c70792f6e6f706c730151010000000000000000000000000000000000",
          "value": "0x00",
          "expected": [],
        },
        "stakingLedger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc4003b9f740f97dab70e3d2de23cdf5d976d6f646c70792f6e6f706c730151010000000000000000000000000000000000",
          "value": null,
          "expected": null,
        },
        "poolMembers": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696273c5f69e270d5b7a07f9996fe9e4e04888f607957fe736ee96d6f646c70792f6e6f706c730151010000000000000000000000000000000000",
          "value": null,
          "expected": null,
        },
      },
    },
    "emptyAccount": {
      "address": "12Vsqv75gtT6TEAV7mqgw7hqgj5spDzDbDkoKnk6CjBHseLF",
      "entries": {
        "account": {
          "key":
            "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
          "value": null,
          "expected": null,
        },
        "locks": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f218f26c73add634897550b4003b26bc6f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
          "value": null,
          "expected": null,
        },
        "freezes": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf1f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
          "value": null,
          "expected": null,
        },
        "holds": {
          "key":
            "0xc2261276cc9d1f8598ea4b6a74b15c2f811187ede3c61f3269344d168d3e6337f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
          "value": null,
          "expected": null,
        },
        "stakingLedger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc4f312b18d0eede66c9793ca10648eaa8b4242424242424242424242424242424242424242424242424242424242424242",
          "value": null,
          "expected": null,
        },
        "poolMembers": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696273c5f69e270d5b7a07f9996fe9e4e0488188fe2b49ebe02794242424242424242424242424242424242424242424242424242424242424242",
          "value": null,
          "expected": null,
        },
      },
    },
  },
  "pools": {
    "166": {
      "poolId": 166,
      "stash": "13UVJyLnbVp8c4FQeiGNxPjVw1FXp4AsdBo9GEFdphqMESAt",
      "entries": {
        "bondedPools": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696271f7c4e57dc49e4d6d003b730a7894f329ccfcf0a9bf455f7a6000000",
          "value":
            "0x00000001c85f0e0100e7000000ef6a1d0d7b3001000000000000000000249aca910e224a87c14afb90980ef0db0a6b12c9d6b48c1acae111a1dda3661701249aca910e224a87c14afb90980ef0db0a6b12c9d6b48c1acae111a1dda3661701249aca910e224a87c14afb90980ef0db0a6b12c9d6b48c1acae111a1dda3661701249aca910e224a87c14afb90980ef0db0a6b12c9d6b48c1acae111a1dda3661700",
          "expected": {
            "commission": {
              "throttle_from": 17719240,
            },
            "member_counter": 231,
            "points": "334780035853039",
            "roles": {
              "depositor": "1pzhyYR9gLk3GmwRtQESLkJCUXazFsAESgcbTRLc9q9hNuy",
              "root": "1pzhyYR9gLk3GmwRtQESLkJCUXazFsAESgcbTRLc9q9hNuy",
              "nominator": "1pzhyYR9gLk3GmwRtQESLkJCUXazFsAESgcbTRLc9q9hNuy",
              "bouncer": "1pzhyYR9gLk3GmwRtQESLkJCUXazFsAESgcbTRLc9q9hNuy",
            },
            "state": {
              "type": "Open",
            },
          },
        },
        "ledger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc4d328133310182fee684c951ae584723d6d6f646c70792f6e6f706c7300a6000000000000000000000000000000000000",
          "value":
            "0x6d6f646c70792f6e6f706c7300a60000000000000000000000000000000000000f2a277f94af30010fef6a1d0d7b300104073bbc6187341124",
          "expected": {
            "stash": "13UVJyLnbVp8c4FQeiGNxPjVw1FXp4AsdBo9GEFdphqMESAt",
            "total": "335005645481770",
            "active": "334780035853039",
            "unlocking": [
              {
                "value": "225609628731",
                "era": 2308,
              },
            ],
          },
        },
        "metadata": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f169627b5f3822e35ca2f31ce3526eab1363fd29ccfcf0a9bf455f7a6000000",
          "value": "0x8cf09fa58750617261636861696e732e696e666f207c20302520636f6d6d697373696f6e",
          "expected": "0xf09fa58750617261636861696e732e696e666f207c20302520636f6d6d697373696f6e",
          "expectedText": "🥇Parachains.info | 0% commission",
        },
      },
    },
    "200": {
      "poolId": 200,
      "stash": "13UVJyLnbVp8c4FQeiGR3etgMRuN1HVn8R8AUB6RgVAKbe7v",
      "entries": {
        "bondedPools": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f1696271f7c4e57dc49e4d6d003b730a7894f320a31c34bd88c539ec8000000",
          "value":
            "0x01c0cf6a0064aaac56d12b21a9ffa6c3f9b8fdacc936d0e78f2711414a5f1cc28c2fe1090101c09ee6050100ca9a3bb004000001c6b91a010014000000a0e084aa901d0000000000000000000064aaac56d12b21a9ffa6c3f9b8fdacc936d0e78f2711414a5f1cc28c2fe109010164aaac56d12b21a9ffa6c3f9b8fdacc936d0e78f2711414a5f1cc28c2fe109010164aaac56d12b21a9ffa6c3f9b8fdacc936d0e78f2711414a5f1cc28c2fe109010164aaac56d12b21a9ffa6c3f9b8fdacc936d0e78f2711414a5f1cc28c2fe1090100",
          "expected": {
            "commission": {
              "current": [7000000, "13GzVMzxgxKYn2qFTQ9PztKJzqJCM67eofNirAjkUz8Tq3aP"],
              "max": 99000000,
              "change_rate": {
                "max_increase": 1000000000,
                "min_delay": 1200,
              },
              "throttle_from": 18528710,
            },
            "member_counter": 20,
            "points": "32507173331104",
            "roles": {
              "depositor": "13GzVMzxgxKYn2qFTQ9PztKJzqJCM67eofNirAjkUz8Tq3aP",
              "root": "13GzVMzxgxKYn2qFTQ9PztKJzqJCM67eofNirAjkUz8Tq3aP",
              "nominator": "13GzVMzxgxKYn2qFTQ9PztKJzqJCM67eofNirAjkUz8Tq3aP",
              "bouncer": "13GzVMzxgxKYn2qFTQ9PztKJzqJCM67eofNirAjkUz8Tq3aP",
            },
            "state": {
              "type": "Open",
            },
          },
        },
        "ledger": {
          "key":
            "0x5f3e4907f716ac89b6347d15ececedca422adb579f1dbf4f3886c5cfa3bb8cc428e1a5f036a55f7cfdf45e4ed90c97996d6f646c70792f6e6f706c7300c8000000000000000000000000000000000000",
          "value":
            "0x6d6f646c70792f6e6f706c7300c80000000000000000000000000000000000000b89533f7a901d0b89533f7a901d00",
          "expected": {
            "stash": "13UVJyLnbVp8c4FQeiGR3etgMRuN1HVn8R8AUB6RgVAKbe7v",
            "total": "32506363466633",
            "active": "32506363466633",
            "unlocking": [],
          },
        },
        "metadata": {
          "key":
            "0x7a6d38deaa01cb6e76ee69889f169627b5f3822e35ca2f31ce3526eab1363fd20a31c34bd88c539ec8000000",
          "value": "0x585350414e49534820485542204361706974616c203032",
          "expected": "0x5350414e49534820485542204361706974616c203032",
          "expectedText": "SPANISH HUB Capital 02",
        },
      },
    },
  },
}
