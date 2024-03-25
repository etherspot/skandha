FROM --platform=${BUILDPLATFORM:-amd64} node:18-alpine as build_src
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 git && rm -rf /var/cache/apk/*

COPY . .

RUN yarn install --non-interactive --frozen-lockfile && \
  yarn bootstrap && \
  yarn build && \
  yarn install --non-interactive --frozen-lockfile --production

FROM node:18-alpine as build_deps
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 git && rm -rf /var/cache/apk/*

COPY --from=build_src /usr/app .

RUN yarn install --non-interactive --frozen-lockfile --production --force
RUN npx lerna@6.4.1 bootstrap --ignore-scripts -- --production --no-optional

RUN cd node_modules/bcrypto && yarn install

FROM node:18-alpine
WORKDIR /usr/app
COPY --from=build_deps /usr/app .

ENV NODE_OPTIONS=--experimental-specifier-resolution=node

ENTRYPOINT ["node", "./packages/cli/bin/skandha"]
