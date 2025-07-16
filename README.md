# Finance App

A comprehensive financial portfolio management application built with Next.js, featuring AI-powered chat assistance and real-time portfolio analysis.

## Architecture

This is a **microservice architecture** with the Next.js frontend communicating with external services:

- **Next.js App**: Main frontend application (this repository)
- **FastAPI Service**: Portfolio analysis microservice (separate repository) 
- **MCP Server**: Local analysis server for development/fallback

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run development server**:
   ```bash
   npm run dev --turbopack
   ```

4. **Visit the application**:
   Open [http://localhost:3000](http://localhost:3000)

## Features

- 🤖 **AI Chat Assistant**: OpenAI/Anthropic-powered financial analysis
- 📊 **Portfolio Analysis**: Real-time risk metrics and performance tracking  
- 📈 **Interactive Charts**: Portfolio visualization with dedicated chart panel
- 👤 **User Management**: Authentication with JWT tokens
- 🔒 **Guest Mode**: Demo functionality without registration
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Development

See detailed development information in:
- [`CLAUDE.md`](./CLAUDE.md) - Project configuration and architecture
- [`PYTHON_DEVELOPMENT.md`](./PYTHON_DEVELOPMENT.md) - Python services (MCP server)
- [`MICROSERVICE_SEPARATION.md`](./MICROSERVICE_SEPARATION.md) - Architecture decisions

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
