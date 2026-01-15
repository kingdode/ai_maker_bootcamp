import { NextResponse } from "next/server";

/**
 * GET /api/settings/status
 * Check if the OpenAI API key is configured (without exposing the actual key)
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  const isConfigured = !!(apiKey && apiKey.startsWith("sk-") && apiKey.length > 20);
  
  // Return masked key info for display purposes
  let maskedKey = "";
  if (isConfigured && apiKey) {
    maskedKey = apiKey.slice(0, 7) + "••••••••" + apiKey.slice(-4);
  }

  return NextResponse.json({
    configured: isConfigured,
    maskedKey: isConfigured ? maskedKey : null,
    message: isConfigured 
      ? "OpenAI API key is configured" 
      : "OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file.",
  });
}

