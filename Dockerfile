FROM node:14 AS build-stage

WORKDIR /app
COPY . ./

RUN yarn
RUN yarn build:extension:prod

FROM scratch AS export-stage
COPY --from=build-stage /app/apps/extension/dist /