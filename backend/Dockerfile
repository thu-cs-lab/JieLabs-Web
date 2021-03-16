FROM rust:1.50.0-slim AS builder
RUN sed -i -e 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' -e 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
RUN apt update
RUN apt install -y libssl-dev pkg-config libpq-dev

RUN USER=root cargo new --bin backend
WORKDIR /backend
COPY ./Cargo.lock .
COPY ./Cargo.toml .
COPY ./.cargo .cargo
RUN cargo build --release
RUN rm -rf src

COPY . .
RUN cargo build --release

FROM rust:1.50.0-slim
RUN sed -i -e 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' -e 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
RUN apt update
RUN apt install -y libssl-dev pkg-config libpq-dev
COPY --from=builder /backend/target/release/backend /bin/backend
CMD /bin/backend
