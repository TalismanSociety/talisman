# @talismn/sapi

Scale API: a helper over [polkadot-api](https://papi.how) for Polkadot SDK chains. Create one with `getScaleApi(connector, metadata, token)`, then use it to:

- read constants, storage and runtime API values
- decode calls and extrinsics
- build `SignerPayloadJSON` payloads, including custom signed extensions
- estimate fees and dry-run calls
- submit signed extrinsics

It also exports interop types for polkadot-js style payloads.
