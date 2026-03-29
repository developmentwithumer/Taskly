<div align="center">

<img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Flask-Dark.svg" width="48" height="48" alt="Flask" />
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TailwindCSS-Dark.svg" width="48" height="48" alt="Tailwind CSS" />
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TypeScript.svg" width="48" height="48" alt="TypeScript" />

<br/>
<br/>

# Taskly

**Manage Work at the Speed of Zen Flow**

A highly optimized, brutally minimal, real-time Kanban board with built-in deep-work tools.

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-taskly.muhammadumer.xyz-00d2d3?style=for-the-badge&logo=google-chrome&logoColor=white)](https://taskly.muhammadumer.xyz)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🌐 Live Demo

**[taskly.muhammadumer.xyz](https://taskly.muhammadumer.xyz)** — Free to use, no credit card required.

> Create an account with your email or sign in instantly via **GitHub OAuth**.

---

## 🚀 Overview

Taskly is a premium, dark-mode-first task management application designed for people who want to stay in the zone. It strips away the enterprise bloat found in tools like Jira or Asana and replaces it with a beautiful, lightning-fast UI that updates in real time across all your devices.

No subscriptions. No AI upsells. Just your board, your tasks, and your flow.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| ⚡ **Real-time Sync** | Move a card on your phone and it instantly moves on your desktop via WebSockets — zero polling, zero lag. |
| 🧘 **Zen Focus Mode** | A full-screen 25-minute Pomodoro timer that locks you in on one task at a time. Auto-completes the task when the timer fires. |
| 🧠 **Smart Workflow** | Tasks scheduled for today automatically transition to **In Progress**. Missed deadlines surface as **Overdue**, no manual updates needed. |
| 🔎 **Instant Global Search** | Filter your entire board by title, status, or date as you type, no page reloads, no delays. |
| 📱 **Mobile-First Design** | Fully responsive with fluid drawer interactions built for touch from day one. |
| 🔐 **Dual Auth** | Sign up with email/password or authenticate instantly with your GitHub account via OAuth. |

---

## 🏗️ Architecture & Tech Stack

Taskly intentionally avoids heavy frontend frameworks (React, Vue, Next.js) in favor of a **lean, modularized Vanilla TypeScript** approach. This results in near-instant load times, minimal memory consumption, and a codebase that is simple to reason about.

### Backend

| Technology | Role |
|---|---|
| **Python 3 & Flask** | Lightweight API server and WebSocket host |
| **SQLAlchemy** | ORM for clean, Pythonic database interaction |
| **Flask-SocketIO** | Bidirectional real-time communication |
| **uv** | Hyper-fast Python package management and virtual environment resolution |

### Frontend

| Technology | Role |
|---|---|
| **Vanilla TypeScript** | Modularized, type-safe client logic, no Virtual DOM overhead |
| **Bun** | Ultra-fast bundler and script runner |
| **Tailwind CSS v4** | Utility-first styling with a minimal compiled footprint |
| **GSAP** | Scroll animations and particle canvas on the landing page |
| **SortableJS** | Smooth, accessible drag-and-drop for the Kanban board |

---

## 📂 Project Structure

```text
taskly/
├── app/                      # Backend Logic (Python/Flask)
│   ├── __init__.py           # Application factory
│   ├── extensions.py         # DB, SocketIO, and OAuth initialisations
│   ├── models.py             # Database schema (User, Task)
│   ├── routes.py             # Main API and frontend route handlers
│   ├── routes_auth.py        # Authentication (GitHub OAuth & Email)
│   └── sockets.py            # WebSocket event listeners
├── src/                      # Frontend Source (TypeScript + CSS)
│   ├── css/
│   │   └── src.css           # Tailwind v4 entrypoint
│   └── js/
│       ├── api.ts            # Network abstraction (Fetch wrappers)
│       ├── focus.ts          # Zen Mode Pomodoro timer logic
│       ├── main.ts           # Core initialization and DOM binding
│       ├── toast.ts          # Custom notification system
│       ├── types.ts          # Shared TypeScript interfaces
│       └── ui.ts             # Direct DOM manipulation handlers
├── static/                   # Compiled Outputs (gitignored in dev)
│   ├── css/                  # Tailwind-compiled CSS
│   └── js/                   # Bun-bundled JavaScript
├── templates/                # Jinja2 HTML Views
│   ├── macros/
│   │   └── ui.html           # Reusable Jinja2 UI macros
│   ├── index.html            # Animated marketing landing page
│   ├── dashboard.html        # Main Kanban app view
│   ├── login.html            # Auth view
│   └── register.html         # Auth view
├── main.py                   # Server entrypoint
├── pyproject.toml            # Python project config
└── package.json              # Bun scripts and frontend dependencies
```

### Why this structure?

- **Separation of Concerns:-** Python logic lives strictly in `app/`. TypeScript and Tailwind live strictly in `src/`. They never mix.
- **Build Isolation:-** `src/` is raw source material. `static/` holds only compiled artifacts, exactly where Flask expects them.
- **Maintainability:-** Splitting the client into semantic modules (`focus.ts`, `api.ts`, `ui.ts`) means a developer can isolate any feature in seconds rather than scanning a 2,000-line monolith.

---

## 🛠️ Local Development

### Prerequisites

- [Python 3.12+](https://www.python.org/) with [`uv`](https://github.com/astral-sh/uv) installed
- [Bun](https://bun.sh/) installed

### 1. Clone the repo

```bash
git clone https://github.com/developmentwithumer/Taskly.git
cd Taskly
```

### 2. Install dependencies

```bash
# Python backend
uv venv
uv sync

# Frontend (TypeScript + Tailwind)
bun install
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret
DATABASE_URL=sqlite:///taskly.db   # or your preferred DB URL
DEBUG=true # for development
RUN_DB_CREATE_ALL=true # create db and tables upon application startup.
OAUTH_ALLOW_INSECURE=true # this will allow to sign in over http useful for local development
```

### 4. Run the development servers

You'll need three terminal sessions running simultaneously:

```bash
# Terminal 1 — Flask backend
uv run main.py

# Terminal 2 — TypeScript bundler (watch mode)
bun run watch:js

# Terminal 3 — Tailwind CSS compiler (watch mode)
bun run watch:css
```

Then open **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🎨 Design Philosophy

**Show, Don't Tell:-** Information hierarchy is paramount. Color is used strictly for meaning: `Cyan = Focus`, `Green = Done`, `Red = Overdue`. Nothing is decorative without purpose.

**Speed Above All:-** Interactions are optimistic. When a user drags a task, the UI responds instantly. The network request resolves gracefully in the background. Failure states roll back silently.

**Focus on the Work:-** No excessive popups. No AI upsells. No complex permission systems. Just you, your board, and your flow.

> *"Your most productive day begins with a single step."*

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](https://github.com/developmentwithumer/Taskly/issues).

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built with focus, for people who focus. &nbsp;·&nbsp; [taskly.muhammadumer.xyz](https://taskly.muhammadumer.xyz)

</div>
