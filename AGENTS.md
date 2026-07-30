# MCP Database Server — AI 助手指南

## 项目概述

这是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 的数据库服务器，通过 MCP 工具和资源接口让 AI 客户端（如 Claude）与多种数据库交互。

- **npm 包名**: `@executeautomation/database-server`（或发布为 `@pixel2012/mcp-database-server`）
- **GitHub**: https://github.com/pixel2012/mcp-database-server
- **入口文件**: `src/index.ts` → 编译为 `dist/src/index.js`
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.9.0
- **许可**: MIT

## 构建与运行

| 命令 | 用途 |
|------|------|
| `npm run build` | 编译 TypeScript |
| `npm run dev` | 编译并立即运行 |
| `npm run watch` | 监听模式编译 |
| `npm run clean` | 删除 `dist/` |
| `npm run example` | 运行示例脚本 |

## 部署方式

### 本地直接运行

```bash
node dist/src/index.js <sqlite-path>
node dist/src/index.js --mysql --host <host> --database <db> --user <user> --password <pass>
```

### 集成到 mcp-gateway / Claude Desktop

**方式一：本地路径（适合开发调试）**
```json
{
  "mcpServers": {
    "mysql-db": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-database-server/dist/src/index.js",
        "--mysql", "--host", "10.60.5.47",
        "--database", "dify_db", "--port", "3306",
        "--user", "root", "--password", "xjgc@1234"
      ]
    }
  }
}
```

**方式二：发布到 npm（推荐，启动快有缓存）**
```bash
# 修改 package.json 中的 name 字段后发布
npm publish
```
```json
{
  "command": "npx",
  "args": ["-y", "@yourname/mcp-database-server", "--mysql", ...]
}
```

**方式三：GitHub 直拉（推代码即用，无需发布）**
```json
{
  "command": "npx",
  "args": ["-y", "github:pixel2012/mcp-database-server", "--mysql", ...]
}
```
> `npx` 会自动 clone → `npm install`（触发 `prepare` 脚本自动 `npm run build`）→ 运行。首次启动较慢，后续有缓存。

### Docker 部署

```bash
docker build -t mcp-database-server .
docker run --rm -i mcp-database-server /path/to/database.db
```

## 项目结构

```
src/
├── index.ts                  # 入口：CLI 参数解析、MCP 服务器初始化
├── db/
│   ├── adapter.ts            # DbAdapter 接口 + 工厂函数
│   ├── index.ts              # 数据库工具函数（init, dbAll, dbRun 等）
│   ├── sqlite-adapter.ts     # SQLite 实现
│   ├── sqlserver-adapter.ts  # SQL Server 实现
│   ├── postgresql-adapter.ts # PostgreSQL 实现
│   └── mysql-adapter.ts      # MySQL 实现（含 AWS IAM 认证）
├── handlers/
│   ├── toolHandlers.ts       # MCP 工具列表分发
│   └── resourceHandlers.ts   # MCP 资源列表与读取
├── tools/
│   ├── queryTools.ts         # read_query, write_query, export_query
│   ├── schemaTools.ts        # create_table, alter_table, drop_table, list_tables, describe_table
│   └── insightTools.ts       # append_insight, list_insights
└── utils/
    └── formatUtils.ts        # CSV/JSON 格式化、错误/成功响应
```

## 架构约定

### 适配器模式
- `DbAdapter` 接口（`src/db/adapter.ts`）定义了所有数据库实现的统一契约
- 每种数据库有独立的适配器实现，通过 `createDbAdapter()` 工厂函数创建
- 新增数据库类型：实现 `DbAdapter` 接口，在工厂函数中添加 case

### MCP 通信
- **所有日志输出必须使用 `console.error()`**，因为 `console.log()` 用于 MCP 的 stdio 通信
- 项目使用 `logger` 对象（内部封装 `console.error`）来记录日志
- 工具定义在 `toolHandlers.ts` 中，工具实现分散在 `src/tools/` 下

### 可用 MCP 工具

| 工具 | 功能 | 关键验证 |
|------|------|----------|
| `read_query` | 执行 SELECT 查询 | 必须小写以 `select` 开头 |
| `write_query` | 执行 INSERT/UPDATE/DELETE | 禁止 SELECT |
| `create_table` | 创建表 | 必须以 `create table` 开头 |
| `alter_table` | 修改表结构 | 必须以 `alter table` 开头 |
| `drop_table` | 删除表（需确认） | 需要 `confirm: true` |
| `list_tables` | 列出所有表 | 无参数 |
| `describe_table` | 查看表结构 | 需 `table_name` |
| `export_query` | 导出为 CSV/JSON | 仅允许 SELECT |
| `append_insight` | 添加业务洞察 | 存入 `mcp_insights` 表 |
| `list_insights` | 列出所有洞察 | 自动建表 |

### 响应格式
- 成功：`{ content: [{ type: "text", text: JSON.stringify(data) }], isError: false }`
- 错误：`{ content: [{ type: "text", text: JSON.stringify({ error: msg }) }], isError: true }`
- 使用 `formatSuccessResponse()` / `formatErrorResponse()` 工具函数

## 数据库支持

### SQLite
- 默认模式，只需传入文件路径：`node dist/src/index.js /path/to/db.sqlite`
- 支持 `:memory:` 内存数据库

### SQL Server
- 参数：`--sqlserver --server <host> --database <db> [--user --password --port]`
- 不提供用户名密码时使用 Windows 认证

### PostgreSQL
- 参数：`--postgresql --host <host> --database <db> [--user --password --port --ssl --connection-timeout]`
- 默认端口 5432，默认超时 30s
- 参数占位符自动从 `?` 转换为 `$1, $2...`

### MySQL
- 参数：`--mysql --host <host> --database <db> [--user --password --port --ssl]`
- 支持 AWS IAM 认证：`--aws-iam-auth --aws-region <region>`
- 使用 `@aws-sdk/rds-signer` 生成认证令牌

## 类型与配置
- **TypeScript**: ES2020 target, NodeNext module/resolution, strict mode
- **全局类型声明** 在 `global.d.ts` 中（增强 `sqlite3` 类型）
- **Docker**: `node:20-alpine`，多阶段构建

## 文档
- 项目文档使用 Docusaurus 构建，源码在 `docs/` 目录
- 构建文档：`cd docs && npm install && npm run build`
- 详细文档参见 `docs/docs/` 下的 Markdown 文件

## 常见陷阱
1. 使用 `console.log()` 代替 `console.error()` 进行日志输出会破坏 MCP 通信
2. SQL 查询验证使用 `trim().toLowerCase().startsWith()`，注意大小写和前后空格
3. `drop_table` 需要 `confirm: true` 参数——这是安全机制
4. 日志输出到 stderr，不会影响与 MCP 客户端的通信