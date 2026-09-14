FROM oven/bun:1.3.14 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY nest-cli.json tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1.3.14

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 8081
CMD ["bun", "dist/main.js"]
