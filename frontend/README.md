# JieLabs Web

## How to build

Prerequisites includes:

- yarn
- rust & cargo
- wasm-pack

To build the backend, simply issues an `cargo build` in the backend directory.

To build the frontend:

```bash

cd frontend/lib
wasm-pack build
cd pkg
yarn link

cd ../..
yarn link jiewebs_lib

yarn build
# Or yarn watch
```

You may need to rerun `wasm-pack build` when the wasm code is updated.
