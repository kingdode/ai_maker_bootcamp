import { NextRequest, NextResponse } from 'next/server';
import { CrowdsourcedReport } from '@/lib/types';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/supabase/auth-check';
import { CrowdsourcedDealsSchema, validateInput, ValidationError, validateApiKey, timingSafeCompare } from '@/lib/validation';
import { getCorsHeaders, getPreflightHeaders } from '@/lib/cors';
import fs from 'fs';
import path from 'path';

// File-based storage for crowdsourced data
const DATA_DIR = path.join(process.cwd(), '.data');
const CROWDSOURCED_FILE = path.join(DATA_DIR, 'crowdsourced.json');

// API key for Chrome extension sync
// IMPORTANT: Must match SYNC_API_KEY from offers route
const SYNC_API_KEY = process.env.SYNC_API_KEY;

// Validate API key at runtime
function checkApiKeyAtRuntime() {
  if (!SYNC_API_KEY || !validateApiKey(SYNC_API_KEY)) {
    console.error('[SECURITY] SYNC_API_KEY is not set or is insecure!');
    return false;
  }
  return true;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getPreflightHeaders(origin);
  return NextResponse.json({}, { headers });
}

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

// GET - Public (anyone can view crowdsourced data)
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  try {
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
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[API] Error in GET /api/crowdsourced:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crowdsourced data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Protected with simple API key (for Chrome extension sync)
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Runtime API key validation
  if (!checkApiKeyAtRuntime()) {
    return NextResponse.json(
      { error: 'Server configuration error. Please contact administrator.' },
      { status: 503, headers: corsHeaders }
    );
  }
  
  try {
    // Check for sync API key OR admin authentication
    const apiKey = request.headers.get('x-sync-api-key');
    let isAuthorized = false;
    
    // Use timing-safe comparison to prevent timing attacks
    if (apiKey && SYNC_API_KEY && timingSafeCompare(apiKey, SYNC_API_KEY)) {
      isAuthorized = true;
    } else {
      const auth = await checkAdminAuth();
      isAuthorized = auth.authenticated;
    }
    
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid X-Sync-API-Key header or admin authentication required.' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const body = await request.json();
    
    if (!body.crowdsourcedDeals || typeof body.crowdsourcedDeals !== 'object') {
      return NextResponse.json(
        { error: 'Invalid crowdsourced data format. Expected { crowdsourcedDeals: {...} }' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate crowdsourced deals
    try {
      const validatedDeals = validateInput(CrowdsourcedDealsSchema, body.crowdsourcedDeals);
      
      // Merge with existing data
      const existing = getCrowdsourcedCache();
      
      for (const [domain, report] of Object.entries(validatedDeals)) {
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
        message: `Synced ${Object.keys(validatedDeals).length} domains`,
        totalDomains: Object.keys(existing).length
      }, { headers: corsHeaders });
      
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400, headers: corsHeaders }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[API] Error in POST /api/crowdsourced:', error);
    return NextResponse.json(
      { error: 'Failed to sync crowdsourced data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Protected (admin only)
export async function DELETE(request: NextRequest) {
  // Check admin authentication
  const auth = await checkAdminAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }
  
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
