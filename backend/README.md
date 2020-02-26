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

## Setup telegraf

Add following lines to `/etc/telegraf.conf`:

```
[[inputs.http]]
  urls = ["http://localhost:8080/api/metric/"]
  headers = {"Authorization" = "Bearer $METRIC_AUTH"}
  data_format = "influx"
```