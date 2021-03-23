FROM rust:1.50.0-slim AS wasm

WORKDIR /wasm
COPY ./lib .

RUN sed -i -e 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' -e 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
RUN apt update
RUN apt install -y curl

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
RUN wasm-pack build

FROM node:12 AS builder

WORKDIR /app

ADD package.json .
ADD yarn.lock .
RUN yarn install --frozen-lockfile
COPY --from=wasm /wasm/pkg /app/lib/pkg

ADD . .
WORKDIR /app/lib/pkg
RUN yarn link
WORKDIR /app

RUN ln -s config.example.js src/config.js
ARG backend
ARG sentry
ARG base

ARG commit_sha
RUN yarn link jielabs_lib
RUN PUBLIC_URL=$base CI_COMMIT_SHA=$commit_sha REACT_APP_BACKEND=$backend REACT_APP_SENTRY=$sentry yarn build

FROM nginx:1.18-alpine
ENV TZ=Asia/Shanghai
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html/jie
