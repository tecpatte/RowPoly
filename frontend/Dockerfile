FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# PUBLIC_* vars are baked into the client bundle at build time. They must point
# at the backend as seen from the user's browser.
ARG PUBLIC_API_URL=http://localhost:3001/api
ARG PUBLIC_WS_URL=http://localhost:3001
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_WS_URL=$PUBLIC_WS_URL

RUN npm run build

EXPOSE 4321
ENV HOST=0.0.0.0
ENV PORT=4321
CMD ["node", "./dist/server/entry.mjs"]
