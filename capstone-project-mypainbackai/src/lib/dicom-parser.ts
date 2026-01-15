import * as fs from "fs";

// =============================================================================
// DICOM Metadata Parser
// Extracts metadata from DICOM and DICOMDIR files
// =============================================================================

// Common DICOM tags and their meanings
const DICOM_TAGS: Record<string, string> = {
  // Patient Info
  "00100010": "PatientName",
  "00100020": "PatientID",
  "00100030": "PatientBirthDate",
  "00100040": "PatientSex",

  // Study Info
  "00080020": "StudyDate",
  "00080030": "StudyTime",
  "00080050": "AccessionNumber",
  "00080090": "ReferringPhysicianName",
  "00081030": "StudyDescription",
  "00200010": "StudyID",

  // Series Info
  "00080021": "SeriesDate",
  "00080031": "SeriesTime",
  "0008103E": "SeriesDescription",
  "00200011": "SeriesNumber",
  "00080060": "Modality",

  // Equipment
  "00080070": "Manufacturer",
  "00080080": "InstitutionName",
  "00081010": "StationName",

  // Image Info
  "00180015": "BodyPartExamined",
  "00180050": "SliceThickness",
  "00200013": "InstanceNumber",

  // Additional useful tags
  "00080016": "SOPClassUID",
  "00080018": "SOPInstanceUID",
  "0020000D": "StudyInstanceUID",
  "0020000E": "SeriesInstanceUID",
};

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  seriesDescription?: string;
  referringPhysician?: string;
  institution?: string;
  modality?: string;
  bodyPartExamined?: string;
  manufacturer?: string;
  rawTags: Record<string, string>;
}

export interface DicomDirEntry {
  type: "PATIENT" | "STUDY" | "SERIES" | "IMAGE";
  metadata: Record<string, string>;
}

export interface DicomPackageMetadata {
  extractedAt: string;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesDescriptions: string[];
  referringPhysician?: string;
  institution?: string;
  modalities: string[];
  bodyParts: string[];
  imageCount: number;
  seriesCount: number;
  summary: string;
}

/**
 * Parse a DICOM file buffer and extract metadata
 */
export function parseDicomFile(buffer: Buffer): DicomMetadata {
  const metadata: DicomMetadata = { rawTags: {} };

  try {
    // Check for DICOM magic number "DICM" at offset 128
    const preamble = buffer.slice(128, 132).toString("ascii");
    if (preamble !== "DICM") {
      // Try parsing anyway - some DICOM files don't have preamble
      return parseRawDicom(buffer, metadata);
    }

    // Start parsing after preamble
    let offset = 132;
    const maxOffset = Math.min(buffer.length, 50000); // Limit parsing to first 50KB for metadata

    while (offset < maxOffset - 8) {
      try {
        // Read tag (group, element)
        const group = buffer.readUInt16LE(offset);
        const element = buffer.readUInt16LE(offset + 2);
        offset += 4;

        const tagKey = group.toString(16).padStart(4, "0").toUpperCase() +
                      element.toString(16).padStart(4, "0").toUpperCase();

        // Read VR (Value Representation) for explicit VR
        const vr = buffer.slice(offset, offset + 2).toString("ascii");
        offset += 2;

        let valueLength: number;

        // Check if VR is explicit (2-char ASCII)
        if (/^[A-Z]{2}$/.test(vr)) {
          // Explicit VR
          if (["OB", "OW", "OF", "SQ", "UN", "UC", "UR", "UT"].includes(vr)) {
            offset += 2; // Skip 2 reserved bytes
            valueLength = buffer.readUInt32LE(offset);
            offset += 4;
          } else {
            valueLength = buffer.readUInt16LE(offset);
            offset += 2;
          }
        } else {
          // Implicit VR - go back and read as 4-byte length
          offset -= 2;
          valueLength = buffer.readUInt32LE(offset);
          offset += 4;
        }

        // Handle undefined length
        if (valueLength === 0xFFFFFFFF) {
          // Skip sequences with undefined length
          break;
        }

        // Read value
        if (valueLength > 0 && valueLength < 10000 && offset + valueLength <= buffer.length) {
          const valueBuffer = buffer.slice(offset, offset + valueLength);
          let value = valueBuffer.toString("utf8").replace(/\0/g, "").trim();

          // Store raw tag
          if (DICOM_TAGS[tagKey]) {
            metadata.rawTags[DICOM_TAGS[tagKey]] = value;

            // Map to structured fields
            switch (tagKey) {
              case "00100010":
                metadata.patientName = cleanDicomString(value);
                break;
              case "00100020":
                metadata.patientId = value;
                break;
              case "00100030":
                metadata.patientBirthDate = formatDicomDate(value);
                break;
              case "00100040":
                metadata.patientSex = value;
                break;
              case "00080020":
                metadata.studyDate = formatDicomDate(value);
                break;
              case "00080030":
                metadata.studyTime = formatDicomTime(value);
                break;
              case "00080090":
                metadata.referringPhysician = cleanDicomString(value);
                break;
              case "00081030":
                metadata.studyDescription = value;
                break;
              case "0008103E":
                metadata.seriesDescription = value;
                break;
              case "00080080":
                metadata.institution = value;
                break;
              case "00080060":
                metadata.modality = value;
                break;
              case "00180015":
                metadata.bodyPartExamined = value;
                break;
              case "00080070":
                metadata.manufacturer = value;
                break;
            }
          }

          offset += valueLength;
        } else {
          offset += valueLength;
        }
      } catch {
        break;
      }
    }
  } catch (error) {
    console.error("Error parsing DICOM file:", error);
  }

  return metadata;
}

/**
 * Try to parse DICOM without standard preamble
 */
function parseRawDicom(buffer: Buffer, metadata: DicomMetadata): DicomMetadata {
  // Look for common DICOM patterns in raw data
  const content = buffer.toString("utf8", 0, Math.min(buffer.length, 10000));
  
  // Extract dates in YYYYMMDD format
  const dateMatch = content.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (dateMatch) {
    metadata.studyDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  return metadata;
}

/**
 * Parse DICOMDIR file to get package-level metadata
 */
export function parseDicomDir(buffer: Buffer): DicomPackageMetadata {
  const result: DicomPackageMetadata = {
    extractedAt: new Date().toISOString(),
    seriesDescriptions: [],
    modalities: [],
    bodyParts: [],
    imageCount: 0,
    seriesCount: 0,
    summary: "",
  };

  try {
    const content = buffer.toString("utf8");
    
    // Extract patient name (LASTNAME^FIRSTNAME^MIDDLE format)
    const patientNameMatch = content.match(/([A-Z]+\^[A-Z]+(?:\^[A-Z\s]+)?)/);
    if (patientNameMatch) {
      result.patientName = cleanDicomString(patientNameMatch[0]);
    }

    // Look for dates in YYYYMMDD format - prefer dates after STUDY keyword
    const studySection = content.substring(content.indexOf("STUDY"));
    const dateRegex = /(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/g;
    let dateMatch = dateRegex.exec(studySection);
    if (dateMatch) {
      result.studyDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }

    // Look for study description (usually follows study date/time)
    const studyDescPatterns = [
      /X-RAY[^\n\r\x00]+/i,
      /MRI[^\n\r\x00]+/i,
      /CT[^\n\r\x00]+SCAN[^\n\r\x00]*/i,
      /FLUORO[^\n\r\x00]+/i,
      /ULTRASOUND[^\n\r\x00]+/i,
    ];
    for (const pattern of studyDescPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.studyDescription = match[0].replace(/[^\x20-\x7E]/g, "").trim();
        break;
      }
    }

    // Look for physician names (LASTNAME^FIRSTNAME^MIDDLE format, typically after patient)
    const physicianMatches = content.match(/([A-Z]+\^[A-Z]+(?:\^[A-Z]*)?)/g);
    if (physicianMatches && physicianMatches.length > 1) {
      // First match is usually patient, second and later are physicians
      result.referringPhysician = cleanDicomString(physicianMatches[1]);
    }

    // Look for modality codes
    const modalityPatterns = [
      { code: "XR", label: "X-Ray" },
      { code: "CR", label: "Computed Radiography" },
      { code: "DX", label: "Digital X-Ray" },
      { code: "CT", label: "CT Scan" },
      { code: "MR", label: "MRI" },
      { code: "US", label: "Ultrasound" },
      { code: "RF", label: "Fluoroscopy" },
      { code: "NM", label: "Nuclear Medicine" },
      { code: "PT", label: "PET Scan" },
    ];
    for (const mod of modalityPatterns) {
      // Check for modality in a more specific context
      if (content.includes(`${mod.code} `) || content.includes(`${mod.code}\x00`) || 
          content.toUpperCase().includes(mod.label.toUpperCase())) {
        if (!result.modalities.includes(mod.code)) {
          result.modalities.push(mod.code);
        }
      }
    }
    
    // Special check for FLUORO
    if (content.toUpperCase().includes("FLUORO")) {
      if (!result.modalities.includes("RF")) {
        result.modalities.push("RF");
      }
    }

    // Look for body part keywords
    const bodyPartPatterns = [
      "SPINE", "LUMBAR", "THORACIC", "CERVICAL", "SACRAL", "L-SPINE", "C-SPINE", "T-SPINE",
      "HEAD", "BRAIN", "SKULL",
      "CHEST", "THORAX", "LUNG",
      "ABDOMEN", "PELVIS", "ABDOMINAL",
      "SHOULDER", "ARM", "ELBOW", "WRIST", "HAND", "FINGER",
      "HIP", "LEG", "KNEE", "ANKLE", "FOOT", "TOE",
      "NECK"
    ];
    for (const part of bodyPartPatterns) {
      if (content.toUpperCase().includes(part)) {
        const normalizedPart = part.replace(/^[LCT]-/, "").toLowerCase();
        if (!result.bodyParts.includes(normalizedPart)) {
          result.bodyParts.push(normalizedPart);
        }
      }
    }

    // Count STUDY entries
    const studyMatches = content.match(/\bSTUDY\b/g);
    result.seriesCount = studyMatches ? studyMatches.length : 0;

    // Count IMAGE entries
    const imageMatches = content.match(/\bIMAGE\b/g);
    result.imageCount = imageMatches ? imageMatches.length : 0;

    // Look for institution names
    const institutionPatterns = [
      /(?:HOSPITAL|MEDICAL CENTER|CLINIC|RADIOLOGY|IMAGING CENTER)[^,\n\x00]{0,50}/gi,
      /UC\s?SD\s*HEALTH|UCSD|UCLA\s*HEALTH|UCSF\s*HEALTH/gi,
      /KAISER|SCRIPPS|SHARP/gi,
    ];
    for (const pattern of institutionPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.institution = match[0].replace(/[^\x20-\x7E]/g, "").trim();
        break;
      }
    }

    // Build summary
    result.summary = buildDicomSummary(result);

  } catch (error) {
    console.error("Error parsing DICOMDIR:", error);
    result.summary = "Unable to parse DICOMDIR file";
  }

  return result;
}

/**
 * Parse a single DICOM file from a path
 */
export function parseDicomFromPath(filePath: string): DicomMetadata {
  const buffer = fs.readFileSync(filePath);
  return parseDicomFile(buffer);
}

/**
 * Parse DICOMDIR from a path
 */
export function parseDicomDirFromPath(filePath: string): DicomPackageMetadata {
  const buffer = fs.readFileSync(filePath);
  return parseDicomDir(buffer);
}

/**
 * Clean DICOM person name format (Last^First^Middle)
 */
function cleanDicomString(value: string): string {
  return value
    .replace(/\^/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Format DICOM date (YYYYMMDD) to ISO format
 */
function formatDicomDate(value: string): string {
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

/**
 * Format DICOM time (HHMMSS.FFFFFF) to readable format
 */
function formatDicomTime(value: string): string {
  if (value.length >= 6) {
    return `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}`;
  }
  return value;
}

/**
 * Build a human-readable summary from DICOM package metadata
 */
function buildDicomSummary(meta: DicomPackageMetadata): string {
  const parts: string[] = [];

  if (meta.modalities.length > 0) {
    const modalityNames: Record<string, string> = {
      CT: "CT Scan",
      MR: "MRI",
      MRI: "MRI",
      XR: "X-Ray",
      CR: "Computed Radiography",
      DX: "Digital X-Ray",
      US: "Ultrasound",
      NM: "Nuclear Medicine",
      PT: "PET Scan",
      RF: "Fluoroscopy",
    };
    const modList = meta.modalities.map(m => modalityNames[m] || m).join(", ");
    parts.push(`${modList} imaging study`);
  } else {
    parts.push("Medical imaging study");
  }

  if (meta.bodyParts.length > 0) {
    parts.push(`of the ${meta.bodyParts.join(", ")}`);
  }

  if (meta.studyDate) {
    parts.push(`performed on ${meta.studyDate}`);
  }

  if (meta.referringPhysician) {
    parts.push(`referred by ${meta.referringPhysician}`);
  }

  if (meta.institution) {
    parts.push(`at ${meta.institution}`);
  }

  if (meta.imageCount > 0) {
    parts.push(`(${meta.imageCount} images)`);
  }

  return parts.join(" ") + ".";
}

/**
 * Extract metadata from all DICOM files in a directory
 */
export function extractDicomPackageMetadata(files: Array<{ name: string; buffer: Buffer }>): DicomPackageMetadata {
  const result: DicomPackageMetadata = {
    extractedAt: new Date().toISOString(),
    seriesDescriptions: [],
    modalities: [],
    bodyParts: [],
    imageCount: 0,
    seriesCount: 0,
    summary: "",
  };

  // First, look for DICOMDIR
  const dicomDir = files.find(f => f.name.toUpperCase() === "DICOMDIR");
  if (dicomDir) {
    const dirMeta = parseDicomDir(dicomDir.buffer);
    Object.assign(result, dirMeta);
    return result;
  }

  // Otherwise, parse individual DICOM files
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".dcm") || file.name.toLowerCase().includes("dicom")) {
      const meta = parseDicomFile(file.buffer);
      
      // Aggregate metadata
      if (meta.patientName && !result.patientName) {
        result.patientName = meta.patientName;
      }
      if (meta.studyDate && !result.studyDate) {
        result.studyDate = meta.studyDate;
      }
      if (meta.studyDescription && !result.studyDescription) {
        result.studyDescription = meta.studyDescription;
      }
      if (meta.referringPhysician && !result.referringPhysician) {
        result.referringPhysician = meta.referringPhysician;
      }
      if (meta.institution && !result.institution) {
        result.institution = meta.institution;
      }
      if (meta.modality && !result.modalities.includes(meta.modality)) {
        result.modalities.push(meta.modality);
      }
      if (meta.bodyPartExamined && !result.bodyParts.includes(meta.bodyPartExamined.toLowerCase())) {
        result.bodyParts.push(meta.bodyPartExamined.toLowerCase());
      }
      if (meta.seriesDescription && !result.seriesDescriptions.includes(meta.seriesDescription)) {
        result.seriesDescriptions.push(meta.seriesDescription);
      }

      result.imageCount++;
    }
  }

  result.summary = buildDicomSummary(result);
  return result;
}

