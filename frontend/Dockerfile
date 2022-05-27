FROM rust:1.61.0-slim AS wasm

WORKDIR /wasm
COPY ./src/lib .

RUN sed -i -e 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' -e 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
RUN apt update
RUN apt install -y curl

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
RUN wasm-pack build

FROM node:18 AS builder

WORKDIR /app

# RUN yarn global add @sentry/cli
RUN curl -L https://github.com/getsentry/sentry-cli/releases/download/1.63.1/sentry-cli-Linux-x86_64 -o /usr/local/bin/sentry-cli
RUN chmod +x /usr/local/bin/sentry-cli

ADD package.json .
ADD yarn.lock .
RUN yarn install --frozen-lockfile
COPY --from=wasm /wasm/pkg /app/src/lib/pkg

ADD . .

RUN ln -s config.example.js src/config.js
ARG backend
ARG sentry
ARG base

ARG commit_sha
RUN PUBLIC_URL=$base CI_COMMIT_SHA=$commit_sha REACT_APP_BACKEND=$backend REACT_APP_SENTRY=$sentry yarn build

ARG sentry_config
RUN echo $sentry_config | base64 -d > .sentryclirc
RUN sentry-cli releases new $commit_sha
RUN sentry-cli releases files $commit_sha upload-sourcemaps /app/build --url-prefix ~$base --validate
RUN sentry-cli releases finalize $commit_sha

FROM nginx:1.18-alpine
ENV TZ=Asia/Shanghai
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY mime.types /etc/nginx/mime.types
COPY --from=builder /app/build /usr/share/nginx/html/jie
