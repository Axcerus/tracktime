# Axcerus Track (TrackTime)

A lightweight, modern time-tracking application and team activity dashboard designed for fast-moving teams and focused individuals.

Built with **Next.js 16 (React 19)**, **Tailwind CSS v4**, and **Drizzle ORM**, Axcerus Track features a dual-database architecture: running on **Cloudflare D1 at the edge** via `@opennextjs/cloudflare` in production, and automatically falling back to **local SQLite** (`better-sqlite3`) for local development and self-hosted environments.

---

## 🎯 Use Cases

- **Distributed & Remote Teams**: Gain real-time visibility into who is clocked in, what they are working on, and when they started—without intrusive surveillance tools.
- **Async Collaboration**: Check teammate status and time logged today before reaching out or assigning tasks.
- **Freelancers & Contractors**: Track daily client projects, visualize hours against daily targets, and manage timecard records.
- **Personal Productivity**: Keep a lightweight timer running in a pinned browser tab with live title updates and a monthly streak activity calendar.
- **Self-Hosted / Edge Teams**: Deploy a zero-maintenance, serverless time tracker on Cloudflare's global network with free-tier D1 database storage or run it on your own server.

---

## ✨ Features

- **⏱️ Live Timer & Presence**:
  - One-click Start / Stop work sessions.
  - Optional task descriptions (*"What are you working on?"*).
  - Live clock ticker (`HH:MM:SS`) and active session tracking.
  - Automatic browser tab title synchronization (`01:24:10 · Feature Design - Axcerus Track`).
  - Auto-closes any lingering active sessions when starting a new session.

- **👥 Team Activity Dashboard ("Working Now")**:
  - Live team overview showing active members with pulse status badges.
  - Real-time elapsed counters for all active teammates.
  - Collapsible list of offline teammates showing time already logged earlier today.
  - Automatic background polling every 15 seconds and instant re-sync on browser window focus.

- **🎯 Daily Goal Progress**:
  - Visual progress bar tracking against a daily target (3 hours default).
  - Displays completed duration, remaining time, and completion percentage.

- **📊 Team & Individual Reports**:
  - Filterable by **Day**, **Week**, and **Month** with forward/backward date navigation.
  - Interactive **Team Bar Chart** comparing logged hours across all team members.
  - Member breakdown showing total hours logged, completed session count, and live working status.
  - Timezone-aware aggregation using the client's local timezone offset.

- **👤 Member Profiles & Timecard Management**:
  - Detailed lifetime metrics: Total All-Time, Month, Week, Today, and completed sessions.
  - **Weekly Bar Chart**: Day-by-day distribution of hours for any selected week.
  - **Monthly Streak Calendar**: GitHub-style activity heatmap tracking daily hours and active streaks.
  - **Manual Session Entry**: Retroactively add missed sessions with start and end times.
  - **Session Editing & Deletion**: Update session descriptions, adjust timestamps, or remove accidental entries.
  - **Self-Service Settings**: Update display name and change password securely.

- **🔐 Lightweight, Edge-Ready Authentication**:
  - PBKDF2 password hashing (100,000 iterations + salt) via the Web Crypto API.
  - Secure HMAC-SHA256 session cookies (`tracktimer_session`).
  - Admin CLI provisioning to ensure private, invite-only team access without open registration vulnerabilities.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, SPA-style routing) |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) + [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) |
| **Edge Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite on Cloudflare edge) |
| **Local / Fallback DB** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (file-based `tracktimer.db`) |
| **Edge Deployment** | [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) + [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) |
| **Cryptography** | Standard Web Crypto API (`crypto.subtle` for PBKDF2 & HMAC) |
| **Package Manager** | [pnpm](https://pnpm.io/) |

### Dual Database Engine

Axcerus Track features dynamic database adapter resolution in [`src/db/index.ts`](file:///home/prantik/Projects/tracktime/src/db/index.ts):
1. **Cloudflare Runtime**: When deployed to Cloudflare Workers / Pages, it retrieves the `DB` D1 binding via `@opennextjs/cloudflare` and initializes `drizzle-orm/d1`.
2. **Node.js / Local Runtime**: When running locally via `pnpm dev` or on a standard Node.js server, it automatically initializes a local SQLite database (`tracktimer.db`) with `better-sqlite3` and executes table setup queries if they do not yet exist.

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: v10 (`npm install -g pnpm`)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd tracktime
pnpm install
```

### 2. Provision an Initial User

Because public registration is disabled for privacy, provision your first team member account using the built-in provisioning script:

```bash
pnpm user:add
```

Follow the interactive prompts to enter the user's name, email, and password. This will automatically seed the user into your local SQLite database (`tracktimer.db`).

*Alternatively, pass CLI flags directly:*

```bash
pnpm user:add --name "Alice Smith" --email "alice@example.com" --password "securepassword123"
```

### 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with the credentials you just created.

---

## 👥 Team Member Provisioning CLI

The `user:add` script (`src/scripts/add-user.ts`) manages user creation across local and remote environments:

```bash
# Interactive mode (prompts for name, email, password)
pnpm user:add

# Non-interactive mode using flags
pnpm user:add --name "Bob Jones" --email "bob@example.com" --password "mypassword"

# Provision directly to Cloudflare D1 Remote Database (Production)
pnpm user:add --name "Bob Jones" --email "bob@example.com" --password "mypassword" --prod
```

When run, the script:
1. Hashes the password using PBKDF2 with a secure salt.
2. Generates an SQL `INSERT` statement for Cloudflare D1.
3. Inserts the record into local SQLite.
4. Attempts to execute against local Wrangler D1 (if available).
5. If `--prod` is passed, executes the command directly against the remote Cloudflare D1 database via `wrangler d1 execute`.

---

## ☁️ Deployment Guide

### Option 1: Deploy to Cloudflare (Pages / Workers via OpenNext) [Recommended]

Axcerus Track is configured for Cloudflare deployment using `@opennextjs/cloudflare` and Cloudflare D1.

#### 1. Authenticate with Wrangler

```bash
pnpm dlx wrangler login
```

#### 2. Create a Cloudflare D1 Database

```bash
pnpm dlx wrangler d1 create tracktime-db
```

Wrangler will output the configuration details, including a `database_id`.

#### 3. Update `wrangler.jsonc`

Open [`wrangler.jsonc`](file:///home/prantik/Projects/tracktime/wrangler.jsonc) and replace `"tracktime-db-id"` with your actual D1 `database_id`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tracktime",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "tracktime-db",
      "database_id": "<YOUR_ACTUAL_D1_DATABASE_ID>"
    }
  ]
}
```

#### 4. Run D1 Database Migrations

Apply the database schema to your remote D1 instance:

```bash
pnpm dlx wrangler d1 execute tracktime-db --remote --file=./drizzle/0000_concerned_ego.sql
```

#### 5. Set the Session Secret

Set a secure session signing secret in Cloudflare:

```bash
pnpm dlx wrangler secret put SESSION_SECRET
```

*(Enter a long, random string when prompted).*

#### 6. Provision Production Users

Create user accounts in your production D1 database:

```bash
pnpm user:add --prod
```

#### 7. Build & Deploy

Deploy directly via CLI:

```bash
# Build and deploy with OpenNext
pnpm deploy

# Or using dlx:
pnpm dlx @opennextjs/cloudflare build
pnpm dlx wrangler deploy
```

> [!TIP]
> **Continuous Deployment via Cloudflare Dashboard (Workers Builds)**:
> In the Cloudflare Dashboard under **Workers & Pages > Create > Worker > Connect to Git**:
> - **Build command**: `pnpm dlx @opennextjs/cloudflare build` (or `pnpm build:worker`)
> - **Root directory**: `/`
> - **Compatibility flags**: `nodejs_compat`
> - **D1 Database Binding**: Under Worker Settings > Bindings, ensure the `DB` variable is bound to your `tracktime-db`.
>
> *(Note: Ensure `open-next.config.ts` and `wrangler.jsonc` are committed and pushed to your repository branch).*

---

### Option 2: Self-Hosted / Node.js / Docker

You can run Axcerus Track on any Node.js host (VPS, Render, Railway, Fly.io, or Docker). In a Node.js environment, the app automatically runs on the built-in SQLite engine.

#### 1. Build and Start

```bash
# Install dependencies
pnpm install

# Build Next.js production bundle
pnpm build

# Provision users
pnpm user:add

# Run the production server
pnpm start
```

The database will be stored in `tracktimer.db` in your application root directory. Ensure that directory has persistent storage if running in containerized environments.

#### Environment Variables for Self-Hosting

Create a `.env.local` or set the following environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SESSION_SECRET` | Secret key used to sign HMAC session tokens | Fallback default secret (Change in production) |
| `PORT` | HTTP port to listen on | `3000` |

---

## 🗄️ Database Schema & Migrations

The database schema is defined in [`src/db/schema.ts`](file:///home/prantik/Projects/tracktime/src/db/schema.ts) using Drizzle ORM:

- **`users`**:
  - `id` (text, primary key)
  - `name` (text)
  - `email` (text, unique)
  - `password_hash` (text, salt:hash)
  - `created_at` (integer timestamp)

- **`time_entries`**:
  - `id` (text, primary key)
  - `user_id` (text, foreign key -> users.id on delete cascade)
  - `description` (text, nullable)
  - `start_time` (integer timestamp)
  - `end_time` (integer timestamp, null while actively running)
  - `created_at` (integer timestamp)

### Generating New Migrations

If you modify [`src/db/schema.ts`](file:///home/prantik/Projects/tracktime/src/db/schema.ts), generate a new migration with Drizzle Kit:

```bash
pnpm dlx drizzle-kit generate
```

Then apply the newly generated `.sql` file in `./drizzle` using Wrangler D1 (for Cloudflare) or let the local SQLite fallback auto-sync.

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `pnpm dev` | `next dev` | Start the local Next.js development server. |
| `pnpm build` | `next build` | Build the Next.js application for production. |
| `pnpm start` | `next start` | Start the Next.js production server. |
| `pnpm lint` | `eslint` | Run ESLint across the codebase. |
| `pnpm user:add` | `tsx src/scripts/add-user.ts` | Provision a new team member (local and/or remote D1). |

---

## 🛡️ License

This project is private and proprietary. All rights reserved.

