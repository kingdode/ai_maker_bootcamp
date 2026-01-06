// =============================================================================
// AI-First File Upload System Types
// =============================================================================

// AI Ingestion Status for uploaded files
export type AIStatus = "pending" | "processing" | "review" | "confirmed" | "failed";

// AI-determined file categories
export type FileCategory =
  | "imaging"
  | "visit_notes"
  | "physical_therapy"
  | "medication"
  | "lab_results"
  | "billing"
  | "other";

// Timeline event types
export type EventType =
  | "pain_symptom"
  | "doctor_visit"
  | "imaging"
  | "medication"
  | "physical_therapy"
  | "procedure"
  | "other";

// Timeline event status
export type EventStatus = "draft" | "confirmed" | "archived";

// File upload with AI processing results
export interface FileUploadWithAI {
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string | null;
  fileSize: number | null;
  
  // AI Status
  aiStatus: AIStatus;
  aiCategory: FileCategory | null;
  aiConfidence: number | null;
  
  // Extracted metadata
  extractedText: string | null;
  extractedDate: string | null;
  extractedProvider: string | null;
  extractedBodyRegion: string | null;
  
  // Suggested event
  suggestedEventId: string | null;
  suggestedEvent: TimelineEventSummary | null;
  
  // Timestamps
  uploadedAt: string;
  processedAt: string | null;
  userConfirmedAt: string | null;
  userRejectedAt: string | null;
}

// Timeline event summary (for UI display)
export interface TimelineEventSummary {
  id: string;
  eventType: EventType;
  title: string;
  description: string | null;
  eventDate: string | null;
  provider: string | null;
  bodyRegion: string | null;
  severity: number | null;
  status: EventStatus;
  aiGenerated: boolean;
  aiConfidence: number | null;
}

// API response for file upload
export interface UploadResponse {
  files: FileUploadWithAI[];
  message: string;
}

// API response for review queue
export interface ReviewQueueResponse {
  files: FileUploadWithAI[];
  totalPending: number;
  totalReview: number;
}

// Confirmation action payload
export interface ConfirmFilePayload {
  fileId: string;
  action: "confirm" | "reject" | "edit";
  // Optional edits to AI suggestions
  editedCategory?: FileCategory;
  editedEventId?: string | null;
  createNewEvent?: boolean;
  newEventData?: Partial<TimelineEventSummary>;
}

