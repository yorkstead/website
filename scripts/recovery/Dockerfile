FROM oven/bun:1.3.14
RUN apt-get update && apt-get install -y --no-install-recommends age postgresql-client iproute2 util-linux && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY migrations/0020_systems-directory.sql ./migrations/
COPY scripts/migration-plan.ts ./scripts/
COPY scripts/recovery/ ./scripts/recovery/
COPY lib/system-directory-service.ts lib/system-directory.ts lib/date-time.ts ./lib/
COPY scripts/recovery/entrypoint.sh /usr/local/bin/ys-recovery-entrypoint
RUN chmod 0555 /usr/local/bin/ys-recovery-entrypoint && chmod -R a+rX /app
USER 10001:10001
ENV HOME=/tmp BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-runtime-cache
ENTRYPOINT ["/usr/local/bin/ys-recovery-entrypoint"]
