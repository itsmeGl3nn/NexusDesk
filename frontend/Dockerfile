FROM node:20.19-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


# serve stage
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build-stage /app/dist .
COPY --from=build-stage /app/public ./public
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

