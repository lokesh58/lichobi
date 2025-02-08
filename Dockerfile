FROM node:20.11-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prod

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY ./package.json ./package.json
ENTRYPOINT ["node", "build/index.js"]
