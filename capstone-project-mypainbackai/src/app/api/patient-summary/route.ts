import { NextResponse } from "next/server";
import {
  getPatientSummary,
  updatePatientSummary,
} from "@/lib/db";

// =============================================================================
// Patient Summary API
// Stores the patient's own words about their medical history
// =============================================================================

// GET - Retrieve the patient's summary
export async function GET() {
  try {
    const summary = await getPatientSummary();
    
    return NextResponse.json({
      summary: summary.summary || "",
      painHistory: summary.painHistory || "",
      currentSymptoms: summary.currentSymptoms || "",
      treatments: summary.treatments || "",
      goals: summary.goals || "",
      updatedAt: summary.updatedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error reading patient summary:", error);
    return NextResponse.json({ error: "Failed to read summary" }, { status: 500 });
  }
}

// POST - Save/update the patient's summary
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const updatedSummary = await updatePatientSummary({
      summary: body.summary || "",
      painHistory: body.painHistory || "",
      currentSymptoms: body.currentSymptoms || "",
      treatments: body.treatments || "",
      goals: body.goals || "",
    });
    
    return NextResponse.json({
      message: "Summary saved successfully",
      summary: {
        summary: updatedSummary.summary || "",
        painHistory: updatedSummary.painHistory || "",
        currentSymptoms: updatedSummary.currentSymptoms || "",
        treatments: updatedSummary.treatments || "",
        goals: updatedSummary.goals || "",
        updatedAt: updatedSummary.updatedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error saving patient summary:", error);
    return NextResponse.json({ error: "Failed to save summary" }, { status: 500 });
  }
}
