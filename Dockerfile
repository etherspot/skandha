FROM node:18-alpine
WORKDIR /usr/app
RUN apk update && apk add --no-cache g++ make python3 && rm -rf /var/cache/apk/*

COPY . .

RUN yarn install --non-interactive --frozen-lockfile && yarn bootstrap && yarn build

ENV NODE_OPTIONS=--experimental-specifier-resolution=node

ENTRYPOINT ["node", "./packages/cli/bin/skandha"]
