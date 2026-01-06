import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

// GET /api/studies/[studyId]/files
// Returns all files attached to a specific study
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const { studyId } = await params;

    // Query the database for all files linked to this study
    const files = await prisma.studyFile.findMany({
      where: {
        studyId: studyId,
      },
      // Show newest files first
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return NextResponse.json(files, { status: 200 });
  } catch (error) {
    console.error("Error fetching study files:", error);
    return NextResponse.json(
      { error: "Failed to fetch study files" },
      { status: 500 }
    );
  }
}

// POST /api/studies/[studyId]/files
// Uploads a single file and attaches it to a study
export async function POST(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const { studyId } = await params;

    // First, verify the study exists in the database
    const study = await prisma.study.findUnique({
      where: { id: studyId },
    });

    if (!study) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Parse the form data from the request
    // This is the native App Router way to handle file uploads
    const formData = await request.formData();

    // Get the uploaded file (expecting field name "file")
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Get the fileType field (e.g., "dicom", "png", "pdf")
    const fileType = formData.get("fileType") as string | null;
    if (!fileType) {
      return NextResponse.json(
        { error: "fileType is required" },
        { status: 400 }
      );
    }

    // Create the directory structure: /uploads/{studyId}/
    const studyUploadDir = path.join(process.cwd(), "uploads", studyId);
    if (!fs.existsSync(studyUploadDir)) {
      // Create the directory if it doesn't exist
      fs.mkdirSync(studyUploadDir, { recursive: true });
    }

    // Build the full file path: /uploads/{studyId}/{originalFilename}
    const originalFilename = file.name;
    const filePath = path.join(studyUploadDir, originalFilename);

    // Convert the File object to a Buffer and save it to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    // Create a database record linking this file to the study
    const dbRecord = await prisma.studyFile.create({
      data: {
        studyId: studyId,
        fileType: fileType,
        originalFilename: originalFilename,
        storagePath: filePath,
      },
    });

    // Return the created record
    return NextResponse.json(dbRecord, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
