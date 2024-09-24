FROM --platform=${BUILDPLATFORM:-amd64} node:18-bookworm-slim as build_src
WORKDIR /usr/app
RUN apt update && apt-get install -y g++ make python3 git && rm -rf /var/cache/apt/*

COPY . .

RUN yarn install --non-interactive --frozen-lockfile && \
  yarn bootstrap && \
  yarn build && \
  yarn install --non-interactive --frozen-lockfile --production

FROM node:18-bookworm-slim as build_deps
WORKDIR /usr/app
RUN apt update && apt-get install -y g++ make python3 git && rm -rf /var/cache/apt/*

COPY --from=build_src /usr/app .

RUN yarn install --non-interactive --frozen-lockfile --production --force --network-timeout 1000000

RUN cd node_modules/bcrypto && yarn install

FROM node:18-bookworm-slim
WORKDIR /usr/app
COPY --from=build_deps /usr/app .

ENV NODE_OPTIONS=--experimental-specifier-resolution=node

ENTRYPOINT ["node", "./packages/cli/bin/byzanlink-bundler"]
