FROM node:14-alpine AS build-deps

WORKDIR /usr/src/app

RUN apk add g++ make py3-pip

COPY package.json yarn.lock ./
RUN yarn
COPY . ./
RUN yarn build

FROM nginx:1.21-alpine

COPY --from=build-deps /usr/src/app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]