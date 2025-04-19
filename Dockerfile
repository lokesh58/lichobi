FROM node:22.14-alpine AS base

FROM base AS base_with_proper_corepack
RUN npm install -g corepack@0.31.0

FROM base_with_proper_corepack AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prod

FROM base_with_proper_corepack AS build
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
