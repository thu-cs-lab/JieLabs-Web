FROM rust:1.50.0-slim
RUN apt update
RUN apt install -y libssl-dev pkg-config libpq-dev
RUN mkdir /backend/
COPY . /backend/
WORKDIR /backend
RUN cargo build --release

FROM rust:1.50.0-slim
RUN apt update
RUN apt install -y libssl-dev pkg-config libpq-dev
COPY --from=0 /backend/target/release/backend /bin/backend
CMD /bin/backend
