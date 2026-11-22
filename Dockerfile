
# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.21.1

FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential python3 pkg-config && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development

COPY . .

RUN npm run build

RUN npm --prefix server prune --omit=dev

FROM node:${NODE_VERSION}-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

CMD ["npm", "start"]
