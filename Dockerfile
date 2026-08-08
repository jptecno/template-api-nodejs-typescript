FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
RUN npm run build

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
