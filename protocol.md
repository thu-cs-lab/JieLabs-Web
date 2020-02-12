# 后端与板子通信协议

通过 WebSocket 通信，由板子发起，endpoint 为 /api/ws_board 。

客户端需要处理 WebSocket 自带的 PING 信息，并返回 PONG。如果一段时间没有返回 PONG，服务端会断开连接。

连接上第一步必须由客户端发起 Authenticate 请求，否则不能进行后续的请求。

## 请求格式

### 认证

客户端 -> 服务端

行为：向服务端发送一个预设的密码，以验证板子的身份。

格式：

```json
{"Authenticate":"password"}
```

认证后，如果服务端没有断开连接，则表明认证成功。

### Bitstream 编程结果

客户端 -> 服务端

行为：在向 FPGA 编程 Bitstream后，汇报编程结果。

格式：

```json
{"ProgramBitstreamFinish":true}
```



### 汇报 IO 状态更新

客户端 -> 服务端

行为：当服务端订阅了 IO 状态的更新时，如果 IO 状态相比上一次汇报有变更，则需要发送。

格式：

```json
{"ReportIOChange":{"mask":14,"data":4}}
```

### Bitstream 编程

服务端 -> 客户端

行为：发送 Bitstream 并要求客户端编程 Bitstream。

格式：

```json
{"ProgramBitstream":[170,153,85,102]}
```

### 设置 IO 方向

服务端 -> 客户端

行为：设置 FPGA 上引脚的输入输出方向，每个位位 0 代表输入到实验 FPGA， 1 代表从实验 FPGA 输出。

格式：

```json
{"SetIODirection":{"mask":11,"data":8}}
```

### 设置 IO 输出

服务端 -> 客户端

行为：设置实验 FPGA 上引脚的输入值，0 代表低电平，1 代表高电平。

格式：

```json
{"SetIOOutput":{"mask":8,"data":0}}
```

### 订阅 IO 状态更新

服务端 -> 客户端

行为：订阅实验 FPGA 输出引脚上状态的更新。

格式：

```json
"SubscribeIOChange"
```

### 订阅 IO 状态更新

服务端 -> 客户端

行为：停止订阅实验 FPGA 输出引脚上状态的更新。

格式：

```json
"UnsubscribeIOChange"
```

