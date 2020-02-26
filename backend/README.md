# Backend for JieLabs

## Installation

Install rustup, cargo, postgresql and redis. Then, install `cargo-deb`:

```shell
cargo install cargo-deb
```

Then, use `cargo-deb` to install backend:

```shell
cargo deb --install
```

Then, put a `.env` file under `/srv/jielabsweb-backend/`, and start the systemd service `jielabs-backend.service`.