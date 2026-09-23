FROM node:26-alpine AS base

WORKDIR /app
COPY ./package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
  if [ -f package-lock.json ]; then \
    npm ci --no-audit --no-fund; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN if [ -f package-lock.json ]; then \
    npm run build; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node

EXPOSE 3000

CMD ["node", "server.js"]
