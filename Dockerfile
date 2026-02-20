FROM oven/bun:1 AS base

# ------- deps -------
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ------- build -------
FROM base AS build
WORKDIR /app
ARG APP_HOSTNAME=seal3d.app
ENV APP_HOSTNAME=${APP_HOSTNAME}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ------- runner -------
FROM gcr.io/distroless/cc-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Bun binary for the runtime
COPY --from=base /usr/local/bin/bun /usr/local/bin/bun

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/bun", "server.js"]
