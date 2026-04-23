# Board Game App

A web-based social deduction board game platform built with Next.js, React, and Firebase. This application is designed to help groups play popular social deduction games by providing digital tools for hosts and players.

## 🎲 Supported Games
Currently planned or partially supported games include:
- **Blood on the Clocktower**: Includes digital tools for the Host (Host Dashboard, Night Action Panel, Clocktower Board) and players (Role Cards, Player Waiting).
- **Avalon** (WIP)
- **Werewolf** (WIP)

## 🚀 Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** CSS Modules / Global CSS
- **Backend/Database:** [Firebase](https://firebase.google.com/) (Realtime Database / Firestore)
- **Hosting:** [Vercel](https://vercel.com)

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Firebase project set up

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env.local` with your Firebase config.
4. Run the development server:
   ```bash
   npm run dev
   ```

### Deployment
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Since the repository is already on GitHub, you can simply log into Vercel, click "Add New Project", select your `board-game-app` repository, and add your Firebase environment variables. Vercel will automatically build and deploy it.

For more details, check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment).

## 🛠️ Project Structure
- `/src/components/core`: Core UI components (Modals, Loading Spinners, Room Entry, Game Selection).
- `/src/components/games`: Game-specific logic and UI (Clocktower, Avalon, Werewolf).
- `/src/hooks`: Custom React hooks for authentication, room management, and game actions.
- `/src/services`: Database and Firebase adapters.
- `/src/types`: TypeScript definitions for games, players, and rooms.
