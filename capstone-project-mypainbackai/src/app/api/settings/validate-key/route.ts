import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 400 }
      );
    }

    // Test the API key with a simple request
    const openai = new OpenAI({ apiKey });

    // Make a minimal API call to validate the key
    await openai.models.list();

    return NextResponse.json(
      { valid: true, message: "API key is valid" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API key validation error:", error);
    
    if (error?.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key - authentication failed" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}

