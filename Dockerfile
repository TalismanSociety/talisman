FROM node:18 AS build
ARG command
ENV USE_ONE_DIST_DIR=true
RUN corepack enable

WORKDIR /talisman
COPY . ./

RUN pnpm install
RUN pnpm $command

FROM scratch AS export
COPY --from=build /talisman/apps/extension/dist/*.zip /
