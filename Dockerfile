FROM node:24.8.0
RUN npm install -g corepack@latest && corepack enable

WORKDIR /talisman
COPY . ./

RUN pnpm clean
RUN pnpm install --frozen-lockfile
