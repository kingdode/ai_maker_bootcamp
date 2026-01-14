import { NextRequest, NextResponse } from 'next/server';
import { CrowdsourcedReport } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// File-based storage for crowdsourced data
const DATA_DIR = path.join(process.cwd(), '.data');
const CROWDSOURCED_FILE = path.join(DATA_DIR, 'crowdsourced.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load crowdsourced data from file
function loadCrowdsourcedData(): Record<string, CrowdsourcedReport> {
  ensureDataDir();
  try {
    if (fs.existsSync(CROWDSOURCED_FILE)) {
      const data = fs.readFileSync(CROWDSOURCED_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading crowdsourced data:', error);
  }
  return {};
}

// Save crowdsourced data to file
function saveCrowdsourcedData(data: Record<string, CrowdsourcedReport>) {
  ensureDataDir();
  fs.writeFileSync(CROWDSOURCED_FILE, JSON.stringify(data, null, 2));
}

// In-memory cache
let crowdsourcedCache: Record<string, CrowdsourcedReport> | null = null;

function getCrowdsourcedCache(): Record<string, CrowdsourcedReport> {
  if (crowdsourcedCache === null) {
    crowdsourcedCache = loadCrowdsourcedData();
  }
  return crowdsourcedCache;
}

// GET - Retrieve all crowdsourced data
export async function GET() {
  const data = getCrowdsourcedCache();
  
  // Convert to array and sort by report count
  const reports = Object.values(data).sort((a, b) => 
    (b.totalReports || 0) - (a.totalReports || 0)
  );
  
  return NextResponse.json({
    success: true,
    reports,
    totalDomains: reports.length,
    totalReports: reports.reduce((sum, r) => sum + (r.totalReports || 0), 0)
  });
}

// POST - Sync crowdsourced data from extension
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.crowdsourcedDeals || typeof body.crowdsourcedDeals !== 'object') {
      return NextResponse.json(
        { error: 'Invalid crowdsourced data format' },
        { status: 400 }
      );
    }
    
    // Merge with existing data
    const existing = getCrowdsourcedCache();
    const incoming = body.crowdsourcedDeals as Record<string, CrowdsourcedReport>;
    
    for (const [domain, report] of Object.entries(incoming)) {
      if (existing[domain]) {
        // Merge reports, keeping most recent
        const existingReports = existing[domain].reports || [];
        const newReports = report.reports || [];
        
        // Combine and dedupe by reportedAt timestamp
        const allReports = [...newReports, ...existingReports];
        const seen = new Set<string>();
        const dedupedReports = allReports.filter(r => {
          const key = `${r.reportedAt}-${r.type}-${r.rate || r.fixedAmount}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 50); // Keep max 50 reports per domain
        
        existing[domain] = {
          ...existing[domain],
          ...report,
          reports: dedupedReports,
          totalReports: Math.max(existing[domain].totalReports || 0, report.totalReports || dedupedReports.length)
        };
      } else {
        existing[domain] = report;
      }
    }
    
    crowdsourcedCache = existing;
    saveCrowdsourcedData(existing);
    
    return NextResponse.json({
      success: true,
      message: `Synced ${Object.keys(incoming).length} domains`,
      totalDomains: Object.keys(existing).length
    });
  } catch (error) {
    console.error('Error syncing crowdsourced data:', error);
    return NextResponse.json(
      { error: 'Failed to sync crowdsourced data' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a crowdsourced report by domain
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      );
    }
    
    const existing = getCrowdsourcedCache();
    
    if (!existing[domain]) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    delete existing[domain];
    crowdsourcedCache = existing;
    saveCrowdsourcedData(existing);
    
    return NextResponse.json({
      success: true,
      message: `Deleted report for ${domain}`,
      totalDomains: Object.keys(existing).length
    });
  } catch (error) {
    console.error('Error deleting crowdsourced data:', error);
    return NextResponse.json(
      { error: 'Failed to delete crowdsourced data' },
      { status: 500 }
    );
  }
}
