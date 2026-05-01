# MoCA Research System

MoCA Online Assessment System (Next.js App Router + Prisma + SQLite).

This document is written for people who have no development experience. You only need to follow the steps below to run the project locally on your computer.

## What You Will Get

- A local website that can be accessed in your browser
- Participant entry page: `/session/join`
- Researcher management page: `/research`

## 0. Important Note: Why You Must Create `.env` Yourself

The current GitHub push strategy is “do not change anything except `.env`.”

This means that after users run `git clone`, they will not receive the `.env` file because `.gitignore` ignores `.env*`.

Therefore: **Before running the project for the first time, you must manually create a `.env` file**.

---

## 1. Prepare Your Computer (Windows)

1. Install Node.js 20 LTS.
2. Open PowerShell and run:

```powershell
node -v
npm -v
````

If you see version numbers, the installation is successful.

Recommendation: Use Node 20.x. This project depends on `better-sqlite3`, and Node 20 is usually the most stable version on Windows.

---

## 2. Download the Project

Open PowerShell in the location where you want to store the project, then run:

```powershell
git clone https://github.com/xiqing1345/moca-research-system.git
cd moca-research-system
```

You may also download the ZIP file and extract it, but all following commands must be executed in the project root directory, which is the folder containing `package.json`.

---

## 3. Install Dependencies

```powershell
npm ci
```

Explanation:

* This command installs dependencies according to the locked versions.
* The project includes a `postinstall` script, which will automatically run `prisma generate`.

If this step fails, check the “Common Issues” section at the end of this document.

---

## 4. Create `.env` — The Most Important Step

Create a new file named `.env` in the project root directory.

Copy the following content into it completely and modify it as needed:

```env
# SQLite database file (local)
DATABASE_URL="file:./dev.db"

# Prisma engine mode
PRISMA_CLIENT_ENGINE_TYPE="library"

# OpenAI (optional, but needed for TTS/advice APIs)
OPENAI_API_KEY=""
OPENAI_TTS_MODEL="gpt-4o-mini-tts"
OPENAI_TTS_VOICE="alloy"
OPENAI_ADVICE_MODEL="gpt-4o-mini"

# Research auth signing secret (change in real deployment)
RESEARCH_AUTH_SECRET="dev-research-secret-change-me"

# Optional: customize expected place/city in orientation auto-score
MOCA_ORIENTATION_PLACE=""
MOCA_ORIENTATION_CITY=""

# Optional: naming prompt pool override
NEXT_PUBLIC_MOCA_NAMING_VERSION=""

# Optional: artifact folder (default is ./storage)
ARTIFACTS_DIR=""
```

Notes:

* The main workflow can still run without an OpenAI key, but voice-related and advice-related APIs will not be available.
* After modifying `.env`, you need to restart the development server.

---

## 5. Initialize the Database

If this is your first time running the project, run:

```powershell
npx prisma migrate deploy
```

Purpose: This command creates the database table structure.

Explanation:

* If the repository already contains `dev.db`, it may include existing data.
* If there is no `dev.db`, the command above will create a new database using the migration files.

---

## 6. Start the Project

Development mode is recommended:

```powershell
npm run dev
```

After you see a message such as `Ready` or `localhost:3000`, open the following pages in your browser:

* `http://localhost:3000/session/join` — Participant entry page
* `http://localhost:3000/research` — Researcher page

---

## 7. Researcher Login Information

The current code includes a built-in researcher account for development use:

* Username: `xiqing`
* Password: `185254`

It is defined in `RESEARCH_ACCOUNTS` inside:

```text
src/lib/researchAuth.ts
```

If you want to change the username or password, modify that file and then restart the server.

---

## 8. Local Production Mode Test Optional

If you want to simulate an online production environment, run:

```powershell
npm run build
npm run start
```

Then visit:

```text
http://localhost:3000
```

---

## 9. Where the Data Files Are Stored

By default:

* Database file: `./dev.db`
* Uploaded images/audio files: `./storage/`

If you want to continue working on the same session on another computer, you need to copy the same database file and storage folder to that computer as well.

---

## 10. Common Issues

### Q1: `npm ci` fails with an error related to `better-sqlite3`

This is usually caused by the Node version or the local build environment.

Recommended steps:

1. Make sure Node is version 20.x.
2. Delete `node_modules` and `package-lock.json`, then reinstall dependencies. Only do this if you are sure you need a clean reinstall.
3. Install or repair Visual Studio Build Tools, especially the Windows C++ toolchain.

### Q2: The page opens, but database errors occur when submitting

First run:

```powershell
npx prisma migrate deploy
```

Then confirm that `DATABASE_URL` in `.env` is:

```env
DATABASE_URL="file:./dev.db"
```

### Q3: Error: `OPENAI_API_KEY is not configured`

You have not set a valid `OPENAI_API_KEY` in `.env`.

Add the key and restart the project.

### Q4: Researcher page login fails

Check the following:

1. Make sure the address is `http://localhost:3000/research`.
2. Make sure the username and password match the current `RESEARCH_ACCOUNTS` in the code.
3. If you changed `RESEARCH_AUTH_SECRET`, make sure you restarted the server.

### Q5: Changes to `.env` do not take effect

You must restart the server.

Stop the current `npm run dev` process, then start it again.

---

## 11. Deployment Reminder Important

The current project uses a local SQLite database file and a local `storage` folder.

This structure is suitable for local computers or a single-server setup, but it is not suitable for direct deployment to Vercel Serverless without modification.

For stable cloud deployment in the future, you usually need to:

1. Replace the database with a hosted PostgreSQL database.
2. Replace local file storage with object storage, such as S3, R2, or Blob storage.

---

## 12. Shortest Checklist for Users Who Already Understand Everything

```powershell
git clone https://github.com/xiqing1345/moca-research-system.git
cd moca-research-system
npm ci
# Manually create .env, see Section 4 of this document
npx prisma migrate deploy
npm run dev
```

Open:

```text
http://localhost:3000/session/join
```

```
```

# MoCA Research System

MoCA 线上评估系统（Next.js App Router + Prisma + SQLite）。

这份文档按「下载者完全不懂开发」来写。你只需要照步骤做，就可以把项目在本机跑起来。

## 你会得到什么

- 一个可在浏览器访问的本地站点
- 受试者入口页面：`/session/join`
- 研究者管理页面：`/research`

## 0. 先说明：为什么你必须自己建 `.env`

你现在的 GitHub 推送方案是「除了 `.env` 之外都不改」。

这意味着下载者 `git clone` 后不会拿到 `.env` 文件（因为 `.gitignore` 忽略了 `.env*`）。

所以：**首次运行前，必须手动创建 `.env`**。

---

## 1. 电脑准备（Windows）

1. 安装 Node.js 20 LTS
2. 打开 PowerShell，执行：

```powershell
node -v
npm -v
```

看到版本号即表示安装成功。

建议：Node 使用 20.x。这个项目依赖 `better-sqlite3`，Node 20 在 Windows 上通常最稳定。

---

## 2. 下载项目

在你想放项目的位置打开 PowerShell，执行：

```powershell
git clone https://github.com/xiqing1345/moca-research-system.git
cd moca-research-system
```

如果你是下载 ZIP 解压，也可以，但后续命令都要在项目根目录执行（就是有 `package.json` 的目录）。

---

## 3. 安装依赖

```powershell
npm ci
```

说明：

- 这个命令会按锁定版本安装依赖
- 项目里有 `postinstall`，会自动执行 `prisma generate`

如果这一步失败，先看本文末尾「常见问题」。

---

## 4. 创建 `.env`（最关键）

在项目根目录新建文件：`.env`

把下面内容完整复制进去（按需修改）：

```env
# SQLite database file (local)
DATABASE_URL="file:./dev.db"

# Prisma engine mode
PRISMA_CLIENT_ENGINE_TYPE="library"

# OpenAI (optional, but needed for TTS/advice APIs)
OPENAI_API_KEY=""
OPENAI_TTS_MODEL="gpt-4o-mini-tts"
OPENAI_TTS_VOICE="alloy"
OPENAI_ADVICE_MODEL="gpt-4o-mini"

# Research auth signing secret (change in real deployment)
RESEARCH_AUTH_SECRET="dev-research-secret-change-me"

# Optional: customize expected place/city in orientation auto-score
MOCA_ORIENTATION_PLACE=""
MOCA_ORIENTATION_CITY=""

# Optional: naming prompt pool override
NEXT_PUBLIC_MOCA_NAMING_VERSION=""

# Optional: artifact folder (default is ./storage)
ARTIFACTS_DIR=""
```

注意：

- 没有 OpenAI Key 也能运行主流程，但语音和建议相关接口会不可用
- 修改 `.env` 后，需要重启开发服务器

---

## 5. 初始化数据库

如果你是首次运行，执行：

```powershell
npx prisma migrate deploy
```

作用：创建数据库表结构。

说明：

- 如果仓库里有 `dev.db`，它可能带有已有数据
- 如果没有 `dev.db`，上述命令会帮你从迁移文件创建新库

---

## 6. 启动项目

开发模式（推荐）：

```powershell
npm run dev
```

看到类似 `Ready` 或 `localhost:3000` 提示后，在浏览器打开：

- `http://localhost:3000/session/join`（受试者入口）
- `http://localhost:3000/research`（研究者页面）

---

## 7. 研究者登录说明

当前代码里内置了研究者账号（开发用）：

- 用户名：`xiqing`
- 密码：`185254`

它定义在 `src/lib/researchAuth.ts` 的 `RESEARCH_ACCOUNTS` 中。

如果你要改账号密码，修改该文件后重启服务。

---

## 8. 本地生产模式测试（可选）

如果你想模拟线上运行：

```powershell
npm run build
npm run start
```

然后访问：`http://localhost:3000`

---

## 9. 数据文件在哪里

默认情况下：

- 数据库文件：`./dev.db`
- 上传的图片/音频：`./storage/`

如果你要在另一台电脑“续做同一个 session”，需要把同一份数据库和存储文件也同步过去。

---

## 10. 常见问题（按报错查）

### Q1: `npm ci` 失败，提示和 `better-sqlite3` 相关

常见原因是 Node 版本或本地编译环境问题。

建议顺序：

1. 确保 Node 是 20.x
2. 删除 `node_modules` 和 `package-lock.json` 后重装（只在你非常确定要重装时）
3. 安装/修复 Visual Studio Build Tools（Windows C++ 工具链）

### Q2: 页面能打开，但提交时报数据库错误

先执行：

```powershell
npx prisma migrate deploy
```

并确认 `.env` 中 `DATABASE_URL` 是：

```env
DATABASE_URL="file:./dev.db"
```

### Q3: 报 `OPENAI_API_KEY is not configured`

你没有在 `.env` 设置有效 `OPENAI_API_KEY`。补上后重启项目。

### Q4: 研究页面登录失败

检查：

1. 访问地址是否是 `http://localhost:3000/research`
2. 用户名密码是否使用了当前代码中的 `RESEARCH_ACCOUNTS`
3. 是否改过 `RESEARCH_AUTH_SECRET` 但未重启服务

### Q5: 改了 `.env` 但没有生效

必须重启：停止当前 `npm run dev`，再重新启动。

---

## 11. 部署提醒（重要）

当前项目使用本地 SQLite 文件和本地 `storage` 文件夹。

这套结构适合本机或单机服务器，不适合直接无改造部署到 Vercel Serverless。

如果将来要稳定云部署，通常需要：

1. 把数据库换成托管 PostgreSQL
2. 把本地文件存储换成对象存储（如 S3/R2/Blob）

---

## 12. 给下载者的最短操作清单

如果你已经懂上面全部内容，只看这个：

```powershell
git clone https://github.com/xiqing1345/moca-research-system.git
cd moca-research-system
npm ci
# 手动创建 .env（见本文第 4 节）
npx prisma migrate deploy
npm run dev
```

打开：`http://localhost:3000/session/join`
