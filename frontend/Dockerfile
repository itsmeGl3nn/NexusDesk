FROM node:20.19-alpine AS build-stage

WORKDIR /app

# install dependencies first (cached layer)
COPY package.json package-lock.json ./

RUN npm ci

# copy source
COPY . .

RUN npm run build


# serve stage
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=build-stage /app/dist ./
COPY --from=build-stage /app/public ./public

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]