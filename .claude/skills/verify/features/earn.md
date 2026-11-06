# Earn and TAO dashboard

A user sees their staking and DeFi positions across accounts, finds opportunities, and follows Bittensor subnets. Staking, claiming and trading start from these pages. This recipe only reads and stops before a signature.

## Sub-features

- `earn-positions` lists the positions, each with its account, rate and value.
- `earn-position` opens one position, with its balance and claimable rewards.
- `earn-discover` lists opportunities with their rate.
- `tao-subnets` lists the Bittensor subnets with price, balance and score.
- `tao-subnet` opens one subnet, with its chart, a Buy and Sell form, and transactions.
- `tao-stake` opens the staking dialog from a subnet row.

## How to get to it (user POV)

- Dashboard: `Earn` in the side nav. `#/earn` settles on `#/earn/positions`, with the tabs `Positions`, `Discover` and `Bittensor`.
- `Bittensor` opens `#/bittensor/subnets`, and a subnet row opens `#/bittensor/subnets/<netuid>`.

## Driving it with agent-browser

Preconditions:

- The wallet is unlocked. The positions steps need an account with a staking position, and `Stake` needs a TAO balance.

Steps:

- **Open the positions.** `ab tab new "$EXT/dashboard.html#/earn"`, `ab wait --text "All Accounts"`. The first render takes 15 seconds or more. The hash settles on `#/earn/positions`, and "DeFi Positions" lists the rows. Screenshot.
- **Open a position.** Click `TAO Staking` by its ref. The hash becomes `#/earn/positions/bittensor/<tokenId>/<address>`, and the page shows "Staked balance" and "Claimable Rewards". `Claim` shows when the account can sign and has rewards to claim. Do not click `Claim`: it leads to a signature.
- **Discover.** Go back, `ab find role button click --name "Discover"`. The hash becomes `#/earn/discover`, and each row reads a token, a network and "Up to <rate>%".
- **Subnets.** `ab tab new "$EXT/dashboard.html#/bittensor/subnets"`, `ab wait --text "Teutonic"`. The table has the columns `SUBNET`, `PRICE`, `BALANCE`, `SCORE`, `STAKED`, `VOLUME`, `MCAP`, `EM.` and `7D PRICE`, and `Root` comes first. Screenshot.
- **Stake dialog.** `ab find role row hover --name "View subnet Teutonic"`, then click the row's `Stake` by its ref from a new snapshot. `#StakingModalDialog` opens on "Staking", with `Account`, `Select Subnet`, `Select Validator`, `Estimated Fee` and `Review`. Press `Escape`, and press it again if the dialog stays: one press left it open on 2026-11-06.
- **One subnet.** Click the row `View subnet Teutonic` by its ref. The hash becomes `#/bittensor/subnets/3`. The page shows the price, the `Buy` and `Sell` tabs, and `My Transactions` and `All Transactions`. `Buy` stays disabled with no amount. Screenshot.

## Gotchas

- `Stake` and `Unstake` on a subnet row exist only while the row is hovered. A click on the row itself opens the subnet page.
- Real funds on mainnet: `Claim`, `Claim Rewards`, `Buy`, `Sell` and the `Review` of the `Stake` dialog all lead to a signature on a later confirm step. No step here clicks them.
- From source, not driven: staking or trading to a signature, Bittensor Testnet at `#/bittensor-testnet/subnets`, the popup Earn page, a group in the positions list that stays collapsed after you open a position, and `0.00%` for a validator without rewards.
