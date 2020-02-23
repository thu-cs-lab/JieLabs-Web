# 后端与板子通信协议

通过 WebSocket 通信，由板子发起，endpoint 为 /api/ws_board 。

客户端需要处理 WebSocket 自带的 PING 信息，并返回 PONG。如果一段时间没有返回 PONG，服务端会断开连接。

连接上第一步必须由客户端发起 Authenticate 请求，否则不能进行后续的请求。

## 请求格式

### 认证

客户端 -> 服务端

行为：向服务端发送一个预设的密码，以验证板子的身份。同时需要传递板子上软件和硬件的版本。

格式：

```json
{"Authenticate":{"password":"password","software_version":"1.0","hardware_version":"0.1"}}
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
{"ReportIOChange":{"data":"0011010"}}
```

### Bitstream 编程

服务端 -> 客户端

行为：通过 WebSocket Binary 消息。发送 Bitstream 并要求客户端编程 Bitstream。格式为 .tar.gz，bitstream 为内部的 bitstream.rbf 。

格式：

```json
xxx.tar.gz: Tar in Gzip
stdout
stderr
bitstream.rbf
```

### 设置 IO 方向

服务端 -> 客户端

行为：设置 FPGA 上引脚的输入输出方向，每个位为 0 代表输入到实验 FPGA， 1 代表从实验 FPGA 输出。

格式：

```json
{"SetIODirection":{"mask":"00111","data":"00000"}}
```

### 设置 IO 输出

服务端 -> 客户端

行为：设置实验 FPGA 上引脚的输入值，0 代表低电平，1 代表高电平。

格式：

```json
{"SetIOOutput":{"mask":"11100","data":"01000"}}
```

### 订阅 IO 状态更新

服务端 -> 客户端

行为：订阅实验 FPGA 输出引脚上状态的更新。

格式：

```json
{"SubscribeIOChange":""}
```

### 停止订阅 IO 状态更新

服务端 -> 客户端

行为：停止订阅实验 FPGA 输出引脚上状态的更新。

格式：

```json
{"UnsubscribeIOChange":""}
```

### 设置并使能用户时钟

服务端 -> 客户端

行为：设置时钟频率并使能。

格式：

```json
{"EnableUserClock":{"frequency":3000000}}
```

### 关闭用户时钟

服务端 -> 客户端

行为：关闭时钟。

格式：

```json
{"DisableUserClock":""}
```

# 后端与前端通信协议

通过 WebSocket 通信，由前端发起，endpoint 为 /api/ws_user 。

## 请求格式

### 请求分配板子

前端 -> 后端

格式：

```json
{"RequestForBoard":""}
```

### 板子分配结果

后端 -> 前端

格式：

```json
{"BoardAllocateResult":true}
```

### 发给板子的消息

前端 -> 后端

行为：必须先分配到板子。具体格式见上面对应的消息。

格式：

```json
{"ToBoard":{"SetIODirection":{"mask":"11111","data":"10101"}}}
```

### 从板子接收消息

后端 -> 前端

行为：必须先分配到板子。具体格式见上面对应的消息。

格式：

```json
{"ReportIOChange":{"data":"0101010101"}}
```

### 板子断开

后端 -> 前端

行为：必须先分配到板子。后端通知前端，目前分配的板子断开了连接。

格式：

```json
{"BoardDisconnected":""}
```

### Bitstream 编程

前端 -> 后端

行为：必须先分配到板子。对分配的板子烧入某已完成构建的 bitstream。

格式：

```json
{"ProgramBitstream":1234}
```

### Bitstream 编程结果

后端 -> 前端

行为：在向 FPGA 编程 Bitstream后，汇报编程结果。

格式：

```json
{"ProgramBitstreamFinish":true}
```

