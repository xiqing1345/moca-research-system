
# MoCA Research System

Next.js App Router + SQLite (Prisma) 的 MoCA 内部科研测试系统。

## 在另一台电脑上如何跑起来（Windows）

前提：你拷贝/解压得到的是整个项目文件夹（包含 `package.json`、`prisma/`、以及可选的 `dev.db`）。

### 1) 安装运行环境

- 安装 Node.js（建议 Node 20 LTS；`better-sqlite3` 在某些 Node 版本上需要本地编译工具，Node 20 最省事）

### 2) 安装依赖

在项目根目录执行：

```bash
npm ci
```

（项目有 `postinstall`，会自动跑 `prisma generate`）

### 3) 初始化数据库（重要）

本项目默认使用 `.env` 里的 SQLite：`DATABASE_URL="file:./dev.db"`。

如果你没有带上 `dev.db`（或想从空库开始），需要执行迁移建表：

```bash
npx prisma migrate deploy
```

### 4) 启动

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm run start
```

打开：`http://localhost:3000/session/join`

## ChatGPT 语音与图像评分配置

本项目已支持：

- ChatGPT 英文语音朗读（任务页面右下角 Read Screen 按钮）
- 画图题（Task 2 椅子、Task 3 时钟）在原有规则打分基础上，叠加 ChatGPT 图像识别评分

请在 `.env` 中填写：

```bash
OPENAI_API_KEY="你的OpenAI API Key"
```

可选参数（一般不用改）：

```bash
OPENAI_VISION_MODEL="gpt-4.1-mini"
OPENAI_TTS_MODEL="gpt-4o-mini-tts"
OPENAI_TTS_VOICE="alloy"
```

注意：修改 `.env` 后请重启开发服务器。

## 常见问题

### “参与者代码不符/请重新输入”

当前实现中，参与者 code **不存在也会自动创建**（见 `/api/participants`）。
如果出现类似提示，通常是：

- 后端没跑起来 / 端口不通（前端请求失败）；
- 数据库没建表（忘了跑 `npx prisma migrate deploy`）；
- `better-sqlite3` 安装失败（需要换 Node 版本或安装 VS Build Tools）。

### 想在两台电脑上“续做同一个 session”

SQLite 是本地文件：两台电脑默认各自一份 `dev.db`。
要真正续做同一条数据，需要共享同一个数据库文件（复制同一个 `dev.db`，或把 `DATABASE_URL` 指到共享路径/统一部署到一台服务器上）。
