FROM node:18
RUN npm install -g corepack@latest && corepack enable

WORKDIR /talisman
COPY . ./

RUN pnpm clean
RUN pnpm install
