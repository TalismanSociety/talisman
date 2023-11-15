# BalanceModules

Things they must do:

1. Ahead-of-time preparation

- fetch metdata, extract required types
- find tokens on chain (SHARED operation - multiple modules must be able to access the same tokens as eachother)

MUST be re-run on runtime upgrade
MUST be re-run on changes to user's tokens config
MAY be re-run when convenient

2. Subscribe to balances

- input is tokenIds, and accountIds
- output is a standard `balanceJson` type, which is stored in a normalised balances db

3. Provide Balances api to underlying balances

- api should be a facade - user shouldn't have access to individual `balanceJson` objects
- `balanceJson` will confuse user, because some balances overlap, etc etc etc
- instead, user will query for balances via e.g. account, token, chain etc, and can then call fields like `total`, `free`, `locked`, etc on the query
