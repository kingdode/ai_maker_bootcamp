import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  prisma,
  getLatestImagingReport,
  saveImagingReport,
  getAllDicomMetadata,
} from "@/lib/db";

// =============================================================================
// Imaging Study API
// Analyzes imaging progression over time, correlates with related documents,
// and creates a comprehensive diagnostic timeline
// =============================================================================

interface ImagingTimelineEntry {
  date: string | null;
  type: "imaging" | "related_document";
  title: string;
  bodyRegion: string | null;
  provider: string | null;
  summary: string;
  source: string;
  sourceId: string;
}

interface ImagingListItem {
  date: string;
  study: string;
  provider: string | null;
  finding: string;
}

// =============================================================================
// GET /api/ai/imaging-study
// Returns the current imaging study/progression report
// =============================================================================
export async function GET() {
  try {
    const report = await getLatestImagingReport();
    
    if (!report) {
      return NextResponse.json({ 
        generated: false, 
        message: "No imaging study has been generated yet" 
      });
    }

    return NextResponse.json({
      generated: true,
      report: {
        generatedAt: report.generatedAt.toISOString(),
        quickSummary: report.quickSummary,
        primaryDiagnosis: report.primaryDiagnosis,
        keyPoints: report.keyPoints ? JSON.parse(report.keyPoints) : [],
        lastImagingDate: report.lastImagingDate,
        imagingList: report.imagingList ? JSON.parse(report.imagingList) : [],
        patientTimeline: report.patientTimeline ? JSON.parse(report.patientTimeline) : [],
        bodyRegionProgression: report.bodyRegionProgression ? JSON.parse(report.bodyRegionProgression) : {},
      },
    });
  } catch (error) {
    console.error("Error fetching imaging study:", error);
    return NextResponse.json(
      { error: "Failed to fetch imaging study" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/ai/imaging-study
// Generate a comprehensive imaging progression study
// =============================================================================
export async function POST() {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured" },
        { status: 500 }
      );
    }

    // Load all analyzed files from database
    const analyzedFiles = await prisma.uploadedFile.findMany({
      where: {
        analyzedAt: { not: null },
      },
      include: {
        group: {
          include: {
            groupAnalysis: true,
            dicomMetadata: true,
          },
        },
        dicomMetadata: true,
      },
      orderBy: { extractedDate: "asc" },
    });

    // Load all DICOM metadata
    const dicomMetadataList = await getAllDicomMetadata();
    const dicomMetadataMap = dicomMetadataList.reduce((acc, meta) => {
      const key = meta.groupId || meta.fileId || meta.id;
      acc[key] = meta;
      return acc;
    }, {} as Record<string, typeof dicomMetadataList[number]>);

    // Build timeline from all sources
    const timeline: ImagingTimelineEntry[] = [];
    const addedDates = new Set<string>();

    // Add entries from DICOM metadata (most accurate source)
    for (const meta of dicomMetadataList) {
      if (meta.imageCount && meta.imageCount > 0) {
        const dateKey = `${meta.studyDate}-${meta.referringPhysician || "unknown"}`;
        if (addedDates.has(dateKey)) continue;
        addedDates.add(dateKey);

        // Build title from DICOM data
        let title = meta.studyDescription || "Medical Imaging Study";
        const modalities = meta.modalities ? JSON.parse(meta.modalities) : [];
        if (modalities.length > 0) {
          const modalityNames: Record<string, string> = {
            CT: "CT Scan",
            MR: "MRI",
            XR: "X-Ray",
            RF: "Fluoroscopy",
            US: "Ultrasound",
            NM: "Nuclear Medicine",
            PT: "PET Scan",
          };
          const modList = modalities.map((m: string) => modalityNames[m] || m).join(" / ");
          if (!title.toLowerCase().includes(modList.toLowerCase())) {
            title = `${modList}: ${title}`;
          }
        }

        const bodyParts = meta.bodyParts ? JSON.parse(meta.bodyParts) : [];
        timeline.push({
          date: meta.studyDate || null,
          type: "imaging",
          title,
          bodyRegion: bodyParts.length > 0 ? bodyParts[0] : null,
          provider: meta.referringPhysician || meta.institution || null,
          summary: meta.summary || "",
          source: "dicom_metadata",
          sourceId: meta.groupId || meta.fileId || meta.id,
        });
      }
    }

    // Add imaging from analyzed files
    for (const file of analyzedFiles) {
      if (file.aiCategory === "imaging" || 
          file.originalFilename?.toLowerCase().includes("dicom") ||
          file.originalFilename?.toLowerCase().includes(".dcm")) {
        
        // Check if already added via DICOM metadata
        const dateKey = `${file.extractedDate}-${file.extractedProvider || "unknown"}`;
        if (addedDates.has(dateKey)) continue;
        addedDates.add(dateKey);

        timeline.push({
          date: file.extractedDate,
          type: "imaging",
          title: file.suggestedTitle || file.originalFilename,
          bodyRegion: file.extractedBodyRegion,
          provider: file.extractedProvider,
          summary: file.summary || "",
          source: "file_analysis",
          sourceId: file.id,
        });
      }
    }

    // Add related documents (visit notes within 30 days of imaging)
    for (const file of analyzedFiles) {
      if (file.aiCategory !== "imaging" && file.extractedDate) {
        const isRelated = timeline.some((t) => {
          if (!t.date || t.type !== "imaging") return false;
          const imagingDate = new Date(t.date);
          const docDate = new Date(file.extractedDate!);
          const daysDiff = Math.abs((imagingDate.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= 30;
        });

        if (isRelated) {
          timeline.push({
            date: file.extractedDate,
            type: "related_document",
            title: file.suggestedTitle || file.originalFilename,
            bodyRegion: file.extractedBodyRegion,
            provider: file.extractedProvider,
            summary: file.summary || "",
            source: "file_analysis",
            sourceId: file.id,
          });
        }
      }
    }

    // Sort timeline by date
    timeline.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Group by body region
    const byBodyRegion: Record<string, ImagingTimelineEntry[]> = {};
    for (const entry of timeline) {
      const region = entry.bodyRegion || "general";
      if (!byBodyRegion[region]) byBodyRegion[region] = [];
      byBodyRegion[region].push(entry);
    }

    // Generate AI analysis
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const timelineText = timeline
      .map((entry, i) => {
        return `${i + 1}. [${entry.date || "Unknown Date"}] ${entry.type === "imaging" ? "🔬 IMAGING:" : "📋 DOCUMENT:"} ${entry.title}
   Body Region: ${entry.bodyRegion || "Not specified"}
   Provider: ${entry.provider || "Not specified"}
   Summary: ${entry.summary}`;
      })
      .join("\n\n");

    const prompt = `You are creating a QUICK REFERENCE imaging summary for a patient to share with new healthcare providers. Keep it BRIEF and SCANNABLE.

PATIENT'S IMAGING HISTORY:
${timelineText || "No imaging records found."}

Generate a simple, easy-to-read summary in this JSON format:

{
  "quickSummary": "One sentence overview of the patient's imaging history (e.g., 'Patient has had 3 spinal imaging studies over 2 years showing...')",
  
  "imagingList": [
    {
      "date": "YYYY-MM-DD",
      "study": "Type of imaging (e.g., MRI Lumbar Spine, X-Ray Cervical, CT Head)",
      "provider": "Facility or doctor name",
      "finding": "One-line key finding or 'Normal' or 'Pending review'"
    }
  ],
  
  "primaryDiagnosis": "Main diagnosis or condition based on imaging (e.g., 'Degenerative disc disease L4-L5')",
  
  "keyPoints": ["2-3 bullet points a new provider should know immediately"],
  
  "lastImagingDate": "Most recent imaging date"
}

IMPORTANT:
- Keep findings to ONE LINE each
- Use plain language a provider can scan in 30 seconds
- Focus on what matters: what was done, when, what it showed
- This is for quick reference during a new patient visit
- If no imaging data is available, provide appropriate placeholder values`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content || "{}");

    // Find the most recent imaging date
    const imagingDates = timeline
      .filter((t) => t.type === "imaging" && t.date)
      .map((t) => t.date)
      .sort()
      .reverse();

    // Save the report to database
    const savedReport = await saveImagingReport({
      quickSummary: aiAnalysis.quickSummary || `Patient has ${timeline.filter((t) => t.type === "imaging").length} imaging studies on file.`,
      primaryDiagnosis: aiAnalysis.primaryDiagnosis || "Diagnosis pending review",
      keyPoints: aiAnalysis.keyPoints || [],
      lastImagingDate: aiAnalysis.lastImagingDate || imagingDates[0] || null,
      imagingList: aiAnalysis.imagingList || timeline
        .filter((t) => t.type === "imaging")
        .map((t) => ({
          date: t.date || "Unknown",
          study: t.title,
          provider: t.provider,
          finding: t.summary?.substring(0, 100) || "See full report",
        })),
      patientTimeline: timeline,
      bodyRegionProgression: byBodyRegion,
    });

    return NextResponse.json({
      message: "Imaging study generated successfully",
      report: {
        generatedAt: savedReport.generatedAt.toISOString(),
        quickSummary: savedReport.quickSummary,
        primaryDiagnosis: savedReport.primaryDiagnosis,
        keyPoints: savedReport.keyPoints ? JSON.parse(savedReport.keyPoints) : [],
        lastImagingDate: savedReport.lastImagingDate,
        imagingList: savedReport.imagingList ? JSON.parse(savedReport.imagingList) : [],
        patientTimeline: savedReport.patientTimeline ? JSON.parse(savedReport.patientTimeline) : [],
        bodyRegionProgression: savedReport.bodyRegionProgression ? JSON.parse(savedReport.bodyRegionProgression) : {},
      },
    });
  } catch (error: unknown) {
    console.error("Error generating imaging study:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate imaging study";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
