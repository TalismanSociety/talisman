FROM node:18 AS build-stage

WORKDIR /app
COPY . ./

RUN pnpm install
RUN pnpm build:extension:prod

FROM scratch AS export-stage
COPY --from=build-stage /app/apps/extension/dist /
