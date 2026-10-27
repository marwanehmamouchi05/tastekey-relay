FROM node:24-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/web/package.json ./apps/web/package.json
RUN npm install --global pnpm@10.20.0 && pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN pnpm build && mkdir -p /app/data && chown -R node:node /app/data /app/apps/web/.next
ENV NODE_ENV=production
ENV TASTEKEY_DB_PATH=/app/data/tastekey.db
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
