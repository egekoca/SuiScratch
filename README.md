# SuiScratch

A decentralized scratch card game built on Sui blockchain. Players can purchase tickets, scratch to reveal symbols, and win SUI tokens based on matching combinations.

## Project Structure

```
SuiScratch/
├── frontend/          # React + TypeScript frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   ├── constants/     # Game constants and configurations
│   │   ├── utils/         # Utility functions
│   │   ├── styles/        # CSS styles
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx      # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── move/              # Sui Move smart contracts
    ├── sources/      # Move source files
    └── Move.toml     # Move package configuration
```

## Features

- 🎮 Three game modes: Sui Blue (3x3), Royal Gold (4x4), Cyber Punk (5x5)
- 💎 Multiple symbol types with different payout values
- 🎯 Scratch-to-reveal gameplay
- 💰 Dynamic win calculations based on symbol matches
- 🎨 Modern, responsive UI with animations
- 🔒 Blockchain integration ready (Move contracts included)

## Frontend Setup

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Move Contracts

The Move contracts are located in the `move/` directory. They handle:

- Ticket purchases
- Treasury management
- Win claims
- Event emissions

### Building Move Contracts

```bash
cd move
sui move build
```

### Testing Move Contracts

```bash
sui move test
```

## Game Modes

### Sui Blue (Standard)
- Grid: 3x3
- Price: 5 SUI
- Payouts: 3-9 matches with multipliers from 1.2x to 100x

### Royal Gold
- Grid: 4x4
- Price: 10 SUI
- Payouts: 3-8 matches with multipliers from 0.5x to 50x

### Cyber Punk (Platinum)
- Grid: 5x5
- Price: 25 SUI
- Payouts: 3-8 matches with multipliers from 0.2x to 100x

## Symbols

- 💎 **MEGA** (Diamond): Base value 100
- 💧 **SUPER** (Drop): Base value 50
- 🚀 **BIG** (Rocket): Base value 25
- 🪙 **WIN** (Coin): Base value 10
- 👻 **MISS** (Ghost): No value
- 🍋 **MISS** (Lemon): No value
- 🦀 **MISS** (Crab): No value

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

### Blockchain
- Sui Move

## License

MIT

