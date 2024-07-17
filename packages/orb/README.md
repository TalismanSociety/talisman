# @talismn/orb

Display Talisman orbs in any dapp !

## Setup in a dapp (or extension) to use this library

Install :

```bash
# for npm
npm install @talismn/orb

# for pnpm
pnpm install @talismn/orb

# for yarn
yarn add @talismn/orb
```

## Usage

```tsx
import { TalismanOrb } from "@talismn/orb"

const Avatar: FC<{ address: string }> = ({ address }) => {
  return <TalismanOrb seed={address} />
}
```
