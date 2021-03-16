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
RUN yarn install
COPY --from=wasm /wasm/lib/pkg /app/lib/pkg

ADD . .
WORKDIR /app/lib/pkg
RUN yarn link
WORKDIR /app
RUN yarn build

FROM nginx:1.18-alpine
ENV TZ=Asia/Shanghai
COPY --from=builder /app/build /usr/share/nginx/html
