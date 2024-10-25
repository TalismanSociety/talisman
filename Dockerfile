FROM node:18
RUN corepack enable

WORKDIR /talisman
COPY . ./

RUN pnpm clean
RUN pnpm install
ENV USE_ONE_DIST_DIR=true
