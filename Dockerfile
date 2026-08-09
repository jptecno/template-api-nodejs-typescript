# node:24-bookworm-slim verified from Docker Hub on 2026-08-09.
FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS build

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
RUN npm run build

# node:24-bookworm-slim verified from Docker Hub on 2026-08-09.
FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS production

ENV NODE_ENV=production

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
