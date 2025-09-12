FROM --platform=${BUILDPLATFORM:-amd64} oven/bun:1-alpine as build_src
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 git py3-setuptools && rm -rf /var/cache/apk/*

COPY . .

RUN bun install --frozen-lockfile && \
  bun run build

FROM oven/bun:1-alpine as build_deps
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 git py3-setuptools && rm -rf /var/cache/apk/*

COPY --from=build_src /usr/app .
RUN bun install --frozen-lockfile --production --force
RUN cd node_modules/bcrypto && bun install
 
FROM oven/bun:1-alpine
WORKDIR /usr/app
COPY --from=build_deps /usr/app .

ENV NODE_OPTIONS=--experimental-specifier-resolution=node

ENTRYPOINT ["bun", "./packages/cli/bin/skandha"]
