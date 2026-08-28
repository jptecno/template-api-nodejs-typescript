# node:24-bookworm-slim verified from Docker Hub on 2026-08-09.
FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS build

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
RUN npm run build

# node:24-bookworm-slim verified from Docker Hub on 2026-08-09.
FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS production

ENV NODE_ENV=production

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
