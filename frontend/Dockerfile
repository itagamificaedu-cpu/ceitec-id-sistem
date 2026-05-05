FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_API_URL=/node-api
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-react.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
