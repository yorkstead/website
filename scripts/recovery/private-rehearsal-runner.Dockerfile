FROM oven/bun:1.3.14
WORKDIR /runner
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile && bunx playwright install --with-deps chromium && chmod -R a+rX /ms-playwright
COPY scripts/recovery/private-rehearsal.playwright.config.ts scripts/recovery/private-rehearsal.playwright.config.ts
COPY tests/e2e-ys-sys-001-private-recovery tests/e2e-ys-sys-001-private-recovery
ENV CI=true NODE_ENV=test
USER 10001:10001
ENTRYPOINT ["bun"]
