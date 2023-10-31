# talismanHttp

Temporary fix to viem's batch scheduler which doesn't sort items in batch responses, causing a random bugs in the tx signing form.
Once fixed on viem side, delete this folder and use `http()` instead of `talismanHttp()` in `getTransportFormEvmNetwork.ts`
