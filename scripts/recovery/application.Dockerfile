FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_FIRST_PARTY_ANALYTICS=disabled
ENV DATABASE_URL=postgresql://synthetic-build:synthetic-build@127.0.0.1:9/synthetic_build
ENV BETTER_AUTH_URL=https://recovery.test OWNER_EMAIL=owner@recovery.test PASSKEY_RP_ID=recovery.test
ENV BETTER_AUTH_SECRET=synthetic-build-signing-key-only-0123456789abcdef
RUN bun run build

FROM oven/bun:1.3.14 AS application
WORKDIR /app
COPY --from=build /app /app
RUN chmod -R a+rX /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOME=/tmp HOSTNAME=0.0.0.0 PORT=3000
USER 10001:10001
EXPOSE 3000
CMD ["bun", "run", "start"]
