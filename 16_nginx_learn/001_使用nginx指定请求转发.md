# 1. nginx 是什么，可以用来做什么？

Nginx是一款高性能的HTTP和反向代理服务器，也是一个IMAP/POP3/SMTP代理服务器。Nginx被广泛应用于Web服务的负载均衡、反向代理、缓存和加速静态和动态内容等方面。

相比其他Web服务器，如Apache，Nginx的设计更加轻量级和高效。它采用了事件驱动和异步非阻塞的处理方式，在高并发场景下表现更加出色。Nginx还支持扩展模块，用户可以自定义添加功能。

# 2. Nginx的基本使用windows （Linux todo）

##  1.  在windows上使用nginx

1. 使用命令行启动 ，

+ nginx安装目录下使用 `nginx.exe`

2. nginx, 以 指定目录下的`nginx.conf`文件启动使用,使用参数 `-c`

   ```shell
   // nginx的安装目录下
   nginx.exe -c E:/code/nginx/nginx.conf
   ```

   

## 2. nginx.conf的书写规则，以及基本模块介绍

Nginx 的配置文件遵循以下规则：

1. 使用 `#` 开头的行表示注释，不会被解析。
2. 使用 `;` 结尾的行表示一个指令的结束，每个指令应该单独一行。
3. 使用 `{}` 包裹的行表示一个块，用于包含多个指令或块，其中左括号必须在指令或空格后面，右括号必须单独成行。
4. 配置文件中的指令是有优先级的，先声明的指令优先级高，同一个块内的指令会按照书写顺序执行。
5. Nginx 配置文件可以被分割成多个文件，通过 `include` 指令引入。

一个基本的`nginx.conf`的配置如下：

```nginx


# 用于 本地 client端(127.0.0.1:8080) 将请求转发到 nginx监听的端口上(127.0.0.1:3456)，再由nginx来进行转发,
# /api/admin的请求 转发到 server_01(127.0.0.1:3000)的3000端口服务上， 将 /admin 的请求 转发到 server_02(127.0.0.1:6666)的6666端口上




# 设置worker进程数，通常为CPU核数
worker_processes auto;

error_log E:/Code/nginx/logs warn;// 设置错误日志存放位置

# 设置pid文件存放路径
# pid /run/nginx.pid;

# 设置events配置，这里采用epoll事件驱动，同时设置最大连接数
events {
  worker_connections 1024;
  # use epoll; windows 不支持使用 epoll 模块
}

# 配置http服务

http {
  # 设置mime类型
  # include /etc/nginx/mime.types;
  # 定义日志格式
  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
  '$status $body_bytes_sent "$http_referer" '
  '"$http_user_agent" "$http_x_forwarded_for"';

  # 定义访问日志存放路径
  access_log E:/Code/nginx/access.log main;

  # 定义错误日志存放路径
  error_log E:/Code/nginx/logs;

  # 定义upstream节点，用于实现负载均衡
  # upstream myapp {
  #   # 定义两个节点，分别对应3000和6666的端口的服务
  #   server localhost:3000;
  #   server localhost:6666;
  # }

  # upstream 定义两个服务节点 3000 和 6666
  upstream backend_3000 {
    server localhost:3000;
  }

  upstream backend_6666 {
    server localhost:6666;
  }

  server {
    listen 4567;
    # server_name localhost;

    # location 只能放在 server 块里面
    # 配置/api/admin 路径转发到3000端口服务上
    location /api/admin {
      proxy_pass http://backend_3000;
    }
    # 配置/admin 路径转发到6666端口服务上
    location /admin {
      proxy_pass http://backend_6666;
    }
  }
}
```



+ 注意点：

  1. `location`模块只能放在`server`模块里面

  2. `http`,`server`,` location` 模块的作用

     1. 在 Nginx 配置中，http 块代表一个 HTTP 服务的配置，而 server 和 location 则用于配置具体的虚拟主机和请求路径的处理规则。

        具体来说，**http 块内可以配置一些与 HTTP 服务有关的参数，如端口、错误日志路径、mime 类型等等**。而 **server 则用于配置一个虚拟主机的参数**，包括监听的端口、域名、SSL 证书等等。**location 则用于匹配请求路径**，并为匹配到的路径配置对应的处理规则，如转发到后端应用服务器、处理静态文件等等。

- `worker_processes auto;` 设置工作进程数，`auto` 表示根据 CPU 核数自动设置进程数，通常与 CPU 核数相同。

- `error_log /var/log/nginx/error.log warn;` 定义错误日志存放位置和级别，存放在 `/var/log/nginx/error.log` 文件中，级别为 `warn`，即只记录警告和错误级别的日志。

- `pid /run/nginx.pid;` 定义 pid 文件存放位置。

- `events { ... }` 设置事件模型，这里使用 `epoll` 事件驱动，同时设置最大连接数为 `1024`。

- `http { ... }` 定义 http 服务的配置，包括mime类型、日志格式、访问日志存放位置、upstream 节点、路径转发、错误页面等。

- `include /etc/nginx/mime.types;` 包含 nginx 预定义的 mime 类型。['include'表示'纳入mime.types文件'的配置路径](https://blog.csdn.net/wzj_110/article/details/112850811)

- `log_format main '...'` 定义日志格式，包括远程地址、用户、访问时间、请求信息、响应状态、发送字节数、来源信息、User-Agent 信息和转发信息。

- `access_log /var/log/nginx/access.log main;` 定义**访问日志**存放位置和格式，存放在 `/var/log/nginx/access.log` 文件中，格式为 `main`。

- `upstream myapp { ... }`  ：

  -  `upstream`指令用于定义一个后端服务器组。在该指令块中，可以定义多个服务器和一些参数，Nginx将根据定义的负载均衡算法将请求转发到不同的后端服务器上。

    在这段配置中，`upstream myapp { ... }` 定义了一个名为 `myapp` 的后端服务器组，其中包含一组服务器和一些负载均衡相关的配置。这个服务器组的名字 `myapp` 会在 `proxy_pass` 指令中被引用，用于将请求转发给这个服务器组中的服务器。
  - `upstream`中的`server  address [parameters]` 最后一个参数是可选择的,可以配置权重参数(`weight`),最大失败次数(`max_fails`)等
  ```nginx.conf
    upstream backend {
      server 192.168.1.101 weight=3;  # 60%的请求分配到此服务器
      server 192.168.1.102 weight=2;  # 40%的请求分配到此服务器
    }
  ```

## 3. 一些location 常见配置的解析

```bash
location / {
    proxy_pass          my_upstream;
    proxy_set_header    Host $proxy_host;
    proxy_set_header    X-Real-IP $remote_addr;
    proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
  }
```

这段代码是nginx中的反向代理配置，具体注释如下：

```
Copy code
location / {
```

表示匹配所有请求路径的location配置，即该配置会应用于所有请求。

```
Copy code
proxy_pass          my_upstream;
```

表示将请求转发至名为my_upstream的upstream服务器群组。

```
bashCopy code
proxy_set_header    Host $proxy_host;
```

设置请求头中的Host字段为代理服务器的地址。

```
bashCopy code
proxy_set_header    X-Real-IP $remote_addr;
```

设置请求头中的X-Real-IP字段为客户端的真实IP地址。

```
bashCopy code
proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
```

设置请求头中的X-Forwarded-For字段为客户端的IP地址和代理服务器的地址。

这段配置的作用是将请求转发至upstream服务器群组，并在请求头中添加一些关键信息，方便upstream服务器进行处理和分析。