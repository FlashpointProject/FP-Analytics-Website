# Build stage: full image with the toolchain
FROM node:24.22.2-trixie@sha256:5c6e2e57d7dd6652ce6f087ba0328312059d7c77f93baa8751865dbf103f1acb AS build
WORKDIR /usr/src/app

# Both package.json and package-lock.json are needed for a reproducible install
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Keep only production dependencies for the runtime stage
RUN npm prune --omit=dev

# Runtime stage: slim image with built output and production dependencies only
FROM node:24.22.2-trixie-slim@sha256:0820eaa85e07d0490446dd01d14707e17e6108a36988cf374899cd057eb3812d
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package.json /usr/src/app/package-lock.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/next.config.js ./next.config.js

# Runtime configuration (environment variables, nothing is baked in):
#   ANALYTICS_HOST, ANALYTICS_TOKEN, GAME_DB_API_HOST (optional)
EXPOSE 3000

CMD [ "npm", "run", "start" ]
