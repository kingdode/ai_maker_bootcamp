# Dealstackr Dashboard

A frontend dashboard for displaying consolidated credit card offers from the Dealstackr Chrome extension.

## Overview

This dashboard displays Chase and American Express offers that have been scanned and stored locally by the Dealstackr Chrome extension. It does not scrape issuer websites or fetch data from external APIs—it only displays data provided by the extension.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **Tailwind CSS**
- **TypeScript**

## Project Structure

```
dealstackr-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── SummaryBar.tsx
│   │   ├── OffersTable.tsx
│   │   └── EmptyState.tsx
│   ├── integration/
│   │   └── extensionIntegration.ts
│   ├── mockData/
│   │   └── mockOffers.ts
│   └── types/
│       └── offer.ts
├── public/
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Local Setup

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

## Extension Integration

### How It Works

The dashboard retrieves data from the Dealstackr Chrome extension using the Chrome Extension API. The extension stores data in `chrome.storage.local`, which the dashboard can access directly when running in a Chrome extension context.

### Integration Steps

1. **Ensure Extension is Installed**: The Dealstackr Chrome extension must be installed and active in your browser.

2. **Data Format**: The extension stores offers in the following structure:
   ```typescript
   {
     dealCohorts: {
       "2026-01-07": [
         {
           merchant_name: string,
           offer_value: string,
           offer_type: "percent" | "flat",
           issuer: "chase" | "amex",
           card_type: string, // e.g., "Chase Sapphire Reserve"
           channel: "online" | "in_store" | "unknown",
           scanned_at: string, // ISO date string
           cohort_date: string // YYYY-MM-DD format
         }
       ]
     },
     allDeals: [...], // Legacy format for backward compatibility
     currentCohort: "2026-01-07"
   }
   ```

3. **Accessing Extension Data**: The dashboard uses `extensionIntegration.ts` to:
   - Check if Chrome extension APIs are available (`chrome.storage.local`)
   - Read from `chrome.storage.local` (prefers `dealCohorts`, falls back to `allDeals`)
   - Merge all cohorts into a single array
   - Transform extension format to dashboard format
   - Fall back to mock data if extension is not available

### Running the Dashboard

**Option 1: As a Chrome Extension Page (Recommended)**
1. Build the dashboard: `npm run build`
2. Add the `out` directory to your Chrome extension's manifest
3. Access via `chrome-extension://[extension-id]/index.html`

**Option 2: Standalone with Extension Access**
1. Run `npm run dev`
2. The dashboard will attempt to access `chrome.storage.local` if available
3. If Chrome APIs are not available, it will use mock data

### Real-time Updates

The dashboard listens for `chrome.storage.onChanged` events and automatically refreshes when the extension saves new offers.

### Development Mode

When running locally without the extension, the dashboard uses mock data from `mockData/mockOffers.ts`. This allows for full development and testing without requiring the extension to be installed.

### Production Integration

In production, the dashboard will:
1. Check for Chrome extension availability
2. Attempt to read from `chrome.storage.local`
3. Merge all cohorts into a single list
4. Display offers from all cohorts together
5. Show appropriate empty states if no data is available
6. Listen for storage changes for real-time updates

## Features

- **Consolidated View**: All offers from Chase and Amex in one table
- **Sorting**: Sort by merchant, offer value, issuer, card name, or last scanned date
- **Filtering**: Filter by issuer, card name, or channel
- **Summary Statistics**: Total offers, issuer breakdown, and most recent scan date
- **Responsive Design**: Clean, spreadsheet-like UI optimized for scanning

## Data Flow

1. **Extension** scans offers → stores in `chrome.storage.local`
2. **Dashboard** loads → checks for extension data
3. **Integration Layer** retrieves data from storage or uses mock data
4. **Components** receive data → render table with sorting/filtering
5. **User** interacts → filters/sorts in-memory state

## Notes

- No backend required—all data is client-side
- No user authentication—personal dashboard only
- No data sharing between users
- Data persists locally via Chrome extension storage

