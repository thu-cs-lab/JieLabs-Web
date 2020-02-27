# 前后端通信的 API Endpoint

## 登录状态

### 登录

POST /api/session

### 登出

DELETE /api/session

### 获取登录用户信息

GET /api/session

## 用户管理

### 列出所有用户

GET /api/user/list?offset=0&limit=5

仅 admin 可用

### 获取用户数量

GET /api/user/count

仅 admin 可用

### 更新用户信息

POST /api/user/manage/{user_name}

可用字段：real_name class student_id role password

仅 admin 可用

### 创建用户

PUT /api/user/manage/{user_name}

可用字段：real_name class student_id role password

仅 admin 可用

### 获取用户信息

GET /api/user/manage/{user_name}

仅 admin 可用

### 删除用户

DELETE /api/user/manage/{user_name}

仅 admin 可用

## 板子管理

### 列出所有板子

GET /api/board/list

仅 admin 可用

### 设置固件信息

POST /api/board/version

字段：version，版本信息；url，下载地址；hash，文件的 sha1sum

仅 admin 可用

### 获取固件信息

GET /api/board/version

内容有三行：版本信息；下载地址；文件哈希

## 文件管理

### 上传文件

GET /api/file/upload

获得一个文件 ID 和链接，对这个链接 PUT 文件内容即可上传。

## 任务管理

### 提交构建任务

POST /api/task/build

字段：source，通过 /api/file/upload 获取的附件 ID

获得 job_id，可以用这个 ID 获取构建信息

### 获取构建信息

GET /api/task/get/{job_id}

仅构建的创建用户和admin可访问

### 提交构建结果

POST /api/task/finish

字段：task_id，表示 task 的ID

### 获取任务信息

GET /api/task/list?offset=0&limit=5

仅 admin 可用

### 获取任务信息

GET /api/task?offset=0&limit=5

获取用户自己提交的 task