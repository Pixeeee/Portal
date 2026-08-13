FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --workspace @portal/contracts && npm run build --workspace @portal/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/package.json /app/apps/server/package.json
COPY --from=build /app/apps/server/dist /app/apps/server/dist
COPY --from=build /app/apps/server/src/db/migrations /app/apps/server/src/db/migrations
COPY --from=build /app/packages/contracts/package.json /app/packages/contracts/package.json
COPY --from=build /app/packages/contracts/dist /app/packages/contracts/dist
EXPOSE 8080
CMD ["node", "apps/server/dist/index.js"]
