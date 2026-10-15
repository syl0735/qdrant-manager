# Qdrant Manager

一个基于 React、Vite 和 HeroUI 的 Qdrant 集群管理界面。它在浏览器中直接调用 Qdrant REST API，适用于受控网络中的运维与调试场景。

> [!WARNING]
> 此工具可以创建和删除 collection、删除快照、迁移或删除 shard，并允许执行自定义 REST 请求。请只连接到受信任的 Qdrant 实例；生产环境必须使用 HTTPS、最小权限 API Key 和私有网络访问。不要将 Qdrant 的管理端口直接暴露到公网。

## 为什么需要它

自托管 Qdrant 集群扩容后，已有 shard 不会自动迁移到新加入的空闲节点，需要由运维人员手动均衡。本项目将这条运维路径变成直观、可确认的操作：查看各节点的 shard 与 points 分布，将 shard 卡片拖到目标节点，选择迁移或复制方式，并在界面中跟踪传输进度与 ETA。

这一行为与 Qdrant Cloud 的自动再均衡能力不同；具体的自托管分片迁移机制请参阅 [Qdrant Distributed Deployment 文档](https://qdrant.tech/documentation/distributed_deployment/)。

## 功能

- 集群节点总览与 Raft 状态
- Collection 创建、删除和详情查看
- 按节点展示 shard 分布，支持迁移和复制 shard
- 实时追踪迁移进度与 ETA
- Collection 快照创建、下载和删除
- REST Console（内置常用请求片段，`⌘ + Enter` 执行）
- 节点快速切换、深浅色模式

## 截图

### 集群概览

![脱敏后的集群概览](docs/screenshots/cluster-overview.png)

### 可视化 Shard 调度

![脱敏后的 Shard 分布与调度界面](docs/screenshots/shard-distribution.png)

## 使用前提

- Node.js 20+（本地开发）或 Docker
- 一个可访问的 Qdrant REST API
- 若通过浏览器跨域连接 Qdrant，需要在 Qdrant 侧启用 CORS

Qdrant 自托管实例默认并不安全。请在生产环境配置 API Key、TLS 与网络访问限制；API Key 不能通过未加密 HTTP 传输。详细配置请参阅 [Qdrant 安全文档](https://qdrant.tech/documentation/security/)。

本应用不会将 API Key 写入浏览器持久化存储；它只保留在当前页面的运行时内存中。连接地址会保存在浏览器本地存储；在共享设备上请勿填写生产地址，或在使用后清理浏览器数据。

## 快速开始

### 本地开发

```bash
npm ci
npm run dev
```

打开 Vite 输出的本地地址，输入 Qdrant URL（例如 `http://localhost:6333`）和可选 API Key 后连接。

### Docker

```bash
docker compose up --build
```

然后打开 `http://localhost:8080`。该 Compose 文件只运行本管理界面，不会启动或配置 Qdrant。

## 构建

```bash
npm run build
```

产物位于 `dist/`。

## 开发与贡献

请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。提交 issue、日志或截图时，请先移除 API Key、内网地址、collection 数据与快照信息。

## 安全问题

请参阅 [SECURITY.md](SECURITY.md)，不要在公开 issue 中报告安全漏洞。

## License

Licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 syl0735.
