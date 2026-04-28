# 🎲 Board Game App

A real-time, web-based social deduction platform that brings your favourite party games to any device — no physical components required. Hosts get powerful dashboards to run the game, while players interact through a clean, mobile-first interface.

---

## ✨ Features

- **Real-time multiplayer** — room state synced instantly across all devices via Firebase
- **Host dashboard** — full game master controls: night actions, role reveals, voting management
- **Player interface** — mobile-optimised role card, day/night phase views, nomination & voting
- **Ghost vote mechanic** — dead players retain one ghost vote token usable once per game
- **Night timeline** — host suggestion engine with pre-filled messages and quick YES/NO actions
- **Morning checklist** — auto-generated dawn action list from the previous night's events
- **QR code room join** — players scan to join without typing room codes
- **Game history** — full log of events per game session

---

## 🕹️ Supported Games

| Game | Status |
|------|--------|
| 🧛 **Blood on the Clocktower** | ✅ Fully playable |
| 🏰 **Avalon** | 🚧 Work in progress |
| 🐺 **Werewolf** | 🚧 Work in progress |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) — App Router, React Server Components |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Backend | [Firebase 12](https://firebase.google.com/) — Firestore real-time database |
| Auth | Firebase Anonymous Auth |
| Hosting | [Vercel](https://vercel.com) |
| QR Code | [qrcode.react](https://www.npmjs.com/package/qrcode.react) |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages & layouts
├── components/
│   ├── core/               # Shared UI — modals, spinners, room entry, game selector
│   └── games/
│       ├── clocktower/     # Blood on the Clocktower — all host & player components
│       ├── avalon/         # Avalon (WIP)
│       └── werewolf/       # Werewolf (WIP)
├── hooks/
│   ├── games/              # Game-specific hooks (useVoting, useClocktowerRoles, …)
│   └── …                   # Shared hooks (useRoom, useNightActions, useGameHistory)
├── services/
│   └── database/           # Firebase adapter & gameStorage API
└── types/                  # TypeScript definitions — room, player, actions, games
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- A **Firebase** project with Firestore enabled

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/huytt-it/board-game-app.git
cd board-game-app

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# → Fill in your Firebase config values in .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file at the project root with the following keys:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## ☁️ Deployment

The recommended deployment target is **Vercel**:

1. Push the repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Add your Firebase environment variables in the Vercel dashboard
4. Deploy — Vercel handles the build and CDN automatically

Refer to the [Next.js deployment docs](https://nextjs.org/docs/deployment) for other hosting options.

---

## 👥 Team

| Role | Name | Contact |
|------|------|---------|
| **Owner / Developer** | Huy Tran | [huytranthanhit@gmail.com](mailto:huytranthanhit@gmail.com) |
| **Supporter** | Nguyen Khoa Thien Long | — |

---

## 📄 License

Private project — all rights reserved.
