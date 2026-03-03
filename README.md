# Security Suite

A suite of advanced web security tools powered by Google's Gemini AI for analyzing and protecting against modern web threats.

## Features

### 🔍 QR Code Risk Analyzer
Upload any QR code image to extract its destination URL and analyze it for security risks before scanning with your phone. The tool detects:
- Phishing attempts
- Typosquatting domains
- Suspicious URL patterns
- Domain age analysis
- Risk scoring (0-100)

### 🔗 SecureLink Redirect Proxy
Safely analyze suspicious links by tracing redirect chains and examining final destinations. Features include:
- Complete redirect chain tracing (up to 10 hops)
- HTML content analysis for hidden threats
- Detection of fake login forms, obfuscated scripts, and hidden iframes
- Phishing detection
- Risk assessment with detailed explanations

## Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Motion (Framer Motion)
- **Backend**: Express.js, Node.js
- **AI/ML**: Google Gemini AI (`gemini-2.5-flash`)
- **QR Decoding**: jsQR
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge
- **Build Tools**: Vite 6, tsx
- **Routing**: React Router DOM v7

## Prerequisites

- Node.js (v18 or higher recommended)
- Gemini API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd CheeseHacks
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Running Locally

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with Express backend and Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Type check with TypeScript
- `npm run clean` - Remove build artifacts

## Project Structure

```
├── src/
│   ├── pages/
│   │   ├── Home.tsx          # Landing page
│   │   ├── QRAnalyzer.tsx    # QR code analysis tool
│   │   └── SecureLink.tsx    # Link redirect analyzer
│   ├── components/           # Reusable UI components
│   └── lib/                  # Utility functions
├── server.ts                 # Express server
└── index.html                # Entry HTML file
```

## Security Note

This tool is designed for educational and security analysis purposes. Always exercise caution when analyzing potentially malicious content.
