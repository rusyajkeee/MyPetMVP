FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=/api
ARG EXPO_PUBLIC_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
