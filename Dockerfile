FROM node:18
RUN npm install -g corepack@latest && corepack enable

WORKDIR /talisman
COPY . ./

RUN pnpm clean
RUN pnpm install
# NOTE: Only needed while we wait for https://github.com/polkadot-api/polkadot-api/pull/851 to be released
RUN pnpm papi:dockerbuildcompat
