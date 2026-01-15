"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

// =============================================================================
// AI-First Upload Page
// Files uploaded together or from same ZIP are grouped automatically
// =============================================================================

interface UploadedFile {
  id: string;
  originalFilename: string;
  aiStatus: string;
  aiCategory?: string;
  extractedFromZip?: boolean;
  zipSourceName?: string;
  batchId?: string;
  groupId?: string;
}

interface FileGroup {
  groupId: string;
  groupName: string;
  isZipGroup: boolean;
  files: UploadedFile[];
  uploadedAt: string;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [duplicatesSkipped, setDuplicatesSkipped] = useState<Array<{ filename: string; existingFile: string }>>([]);

  // Check for API key on mount (server-side check)
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch("/api/settings/status");
        const data = await response.json();
        setHasApiKey(data.configured);
      } catch {
        setHasApiKey(false);
      }
    };
    checkApiKey();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      
      // Track duplicates that were skipped
      if (data.skippedDuplicates && data.skippedDuplicates.length > 0) {
        setDuplicatesSkipped(data.skippedDuplicates);
        // Clear duplicates notification after 10 seconds
        setTimeout(() => setDuplicatesSkipped([]), 10000);
      }
      
      // Group files by their groupId
      if (data.files && data.files.length > 0) {
        const groupedFiles = groupFilesFromResponse(data.files, data.batchId);
        setFileGroups((prev) => [...groupedFiles, ...prev]);

        // Auto-trigger AI analysis (API key is handled server-side)
        await analyzeFiles(data.files);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Group files from API response
  const groupFilesFromResponse = (files: UploadedFile[], batchId: string): FileGroup[] => {
    const groupMap = new Map<string, UploadedFile[]>();
    
    for (const file of files) {
      const groupId = file.groupId || batchId;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(file);
    }

    const groups: FileGroup[] = [];
    groupMap.forEach((groupFiles, groupId) => {
      const isZipGroup = groupFiles.some(f => f.extractedFromZip);
      const zipName = groupFiles.find(f => f.zipSourceName)?.zipSourceName;
      
      groups.push({
        groupId,
        groupName: isZipGroup ? `📦 ${zipName}` : `Upload ${new Date().toLocaleTimeString()}`,
        isZipGroup,
        files: groupFiles,
        uploadedAt: new Date().toISOString(),
      });
    });

    return groups;
  };

  const analyzeFiles = async (files: UploadedFile[]) => {
    setAnalyzing(true);

    for (const file of files) {
      // Update status to processing
      updateFileStatus(file.id, "processing");

      try {
        const response = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id }),
        });

        if (response.ok) {
          const data = await response.json();
          updateFileStatus(file.id, "review", data.analysis?.category);
        } else {
          updateFileStatus(file.id, "failed");
        }
      } catch {
        updateFileStatus(file.id, "failed");
      }
    }

    setAnalyzing(false);
  };

  const updateFileStatus = (fileId: string, status: string, category?: string) => {
    setFileGroups((prev) =>
      prev.map((group) => ({
        ...group,
        files: group.files.map((f) =>
          f.id === fileId
            ? { ...f, aiStatus: status, ...(category && { aiCategory: category }) }
            : f
        ),
      }))
    );
  };

  const triggerAnalysis = async () => {
    if (!hasApiKey) {
      setError("OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file.");
      return;
    }

    const pendingFiles = fileGroups.flatMap((g) =>
      g.files.filter((f) => f.aiStatus === "pending" || f.aiStatus === "failed")
    );
    if (pendingFiles.length > 0) {
      await analyzeFiles(pendingFiles);
    }
  };

  const totalFiles = fileGroups.reduce((sum, g) => sum + g.files.length, 0);
  const hasPendingFiles = fileGroups.some((g) =>
    g.files.some((f) => f.aiStatus === "pending" || f.aiStatus === "failed")
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/" style={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1 style={styles.title}>Upload Files</h1>
        <p style={styles.subtitle}>
          Drop your medical files here. Files uploaded together or extracted from a ZIP
          will be automatically grouped.
        </p>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div style={styles.warning}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div>
            <strong>OpenAI API Key Required</strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
              Add <code style={{ background: "#1a1a24", padding: "2px 4px", borderRadius: "3px" }}>OPENAI_API_KEY</code> to your <code style={{ background: "#1a1a24", padding: "2px 4px", borderRadius: "3px" }}>.env.local</code> file to enable AI analysis.{" "}
              <Link href="/settings" style={{ color: "#eab308", textDecoration: "underline" }}>
                Learn more
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        style={{
          ...styles.dropZone,
          borderColor: isDragging ? "#8b5cf6" : "#3a3a4a",
          background: isDragging ? "rgba(139, 92, 246, 0.1)" : "#1a1a24",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={styles.dropIcon}>
          <UploadIcon />
        </div>
        <div style={styles.dropText}>
          {uploading ? (
            <span style={{ color: "#8b5cf6" }}>Uploading...</span>
          ) : analyzing ? (
            <span style={{ color: "#10b981" }}>🤖 AI is analyzing files...</span>
          ) : isDragging ? (
            <span style={{ color: "#8b5cf6" }}>Drop files here</span>
          ) : (
            <>
              <span style={{ color: "#f0f0f5" }}>Drag & drop files here</span>
              <span style={{ color: "#6b6b80" }}> or </span>
              <label style={styles.browseLink}>
                browse
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  disabled={uploading || analyzing}
                />
              </label>
            </>
          )}
        </div>
        <p style={styles.dropHint}>
          Supports PDF, images, DICOM, and ZIP files (auto-extracts & groups contents)
        </p>
      </div>

      {/* Error Message */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Duplicates Skipped Notice */}
      {duplicatesSkipped.length > 0 && (
        <div style={styles.duplicateNotice}>
          <div style={styles.duplicateHeader}>
            ⚠️ {duplicatesSkipped.length} duplicate file{duplicatesSkipped.length !== 1 ? "s" : ""} skipped
          </div>
          <div style={styles.duplicateList}>
            {duplicatesSkipped.slice(0, 5).map((d, i) => (
              <div key={i} style={styles.duplicateItem}>
                <span style={{ color: "#9494a8" }}>{d.filename}</span>
                <span style={{ color: "#6b6b80", fontSize: "11px" }}>→ already uploaded as "{d.existingFile}"</span>
              </div>
            ))}
            {duplicatesSkipped.length > 5 && (
              <div style={{ color: "#6b6b80", fontSize: "12px", marginTop: "4px" }}>
                ...and {duplicatesSkipped.length - 5} more
              </div>
            )}
          </div>
          <button 
            onClick={() => setDuplicatesSkipped([])} 
            style={styles.dismissButton}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grouped Files Display */}
      {fileGroups.length > 0 && (
        <div style={styles.queueSection}>
          <div style={styles.queueHeader}>
            <h2 style={styles.queueTitle}>Uploaded Files</h2>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={styles.queueCount}>
                {fileGroups.length} group{fileGroups.length !== 1 ? "s" : ""}, {totalFiles} files
              </span>
              {hasPendingFiles && (
                <button onClick={triggerAnalysis} style={styles.analyzeButton} disabled={analyzing}>
                  {analyzing ? "Analyzing..." : "🤖 Analyze"}
                </button>
              )}
            </div>
          </div>

          {/* File Groups */}
          <div style={styles.groupList}>
            {fileGroups.map((group) => (
              <div key={group.groupId} style={styles.groupCard}>
                <div style={styles.groupHeader}>
                  <div style={styles.groupTitle}>
                    {group.isZipGroup ? "📦" : "📂"} {group.groupName}
                  </div>
                  <span style={styles.groupFileCount}>
                    {group.files.length} file{group.files.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={styles.groupFiles}>
                  {group.files.map((file) => (
                    <div key={file.id} style={styles.fileItem}>
                      <div style={styles.fileIcon}>
                        <FileIcon />
                      </div>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileName}>{file.originalFilename}</div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {file.aiCategory && <CategoryBadge category={file.aiCategory} />}
                          <StatusBadge status={file.aiStatus} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Link href="/review" style={styles.reviewButton}>
            Go to Review Queue →
          </Link>
        </div>
      )}

      {/* Info Cards */}
      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            <GroupIcon />
          </div>
          <h3 style={styles.infoTitle}>Smart Grouping</h3>
          <p style={styles.infoDesc}>
            Files uploaded together or from the same ZIP are automatically grouped for easy review.
          </p>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            <AIIcon />
          </div>
          <h3 style={styles.infoTitle}>AI Classification</h3>
          <p style={styles.infoDesc}>
            AI categorizes files as imaging, visit notes, PT records, medications, and more.
          </p>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            <TimelineIcon />
          </div>
          <h3 style={styles.infoTitle}>Timeline Linking</h3>
          <p style={styles.infoDesc}>
            Grouped files can be added to the timeline as a single event.
          </p>
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308", label: "Pending" },
    processing: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", label: "🤖 Analyzing..." },
    review: { bg: "rgba(139, 92, 246, 0.15)", text: "#8b5cf6", label: "Ready" },
    confirmed: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", label: "Confirmed" },
    failed: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", label: "Failed" },
  };
  const style = colors[status] || colors.pending;

  return (
    <span style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: style.bg, color: style.text }}>
      {style.label}
    </span>
  );
}

// Category badge component
function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    imaging: { label: "🔬 Imaging", color: "#10b981" },
    visit_notes: { label: "📋 Notes", color: "#3b82f6" },
    physical_therapy: { label: "🏃 PT", color: "#8b5cf6" },
    medication: { label: "💊 Meds", color: "#f97066" },
    lab_results: { label: "🧪 Lab", color: "#eab308" },
    billing: { label: "💰 Bill", color: "#6b6b80" },
    other: { label: "📄 Other", color: "#9494a8" },
  };
  const { label, color } = labels[category] || labels.other;

  return (
    <span style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 500, background: `${color}20`, color }}>
      {label}
    </span>
  );
}

// Icons
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 32v8a4 4 0 004 4h24a4 4 0 004-4v-8M24 4v28M16 12l8-8 8 8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 1H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7l-6-6z" />
    <path d="M11 1v6h6" />
  </svg>
);

const GroupIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
    <path d="M7 11v2M17 11v2M11 7h2M11 17h2" />
  </svg>
);

const AIIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
  </svg>
);

const TimelineIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
  </svg>
);

// Styles
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d0d12",
    padding: "32px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
  },
  backLink: {
    color: "#8b5cf6",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    display: "inline-block",
    marginBottom: "16px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#f0f0f5",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#9494a8",
    lineHeight: 1.5,
  },
  warning: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "16px",
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid #eab308",
    borderRadius: "12px",
    marginBottom: "24px",
    color: "#eab308",
  },
  dropZone: {
    border: "2px dashed #3a3a4a",
    borderRadius: "16px",
    padding: "48px",
    textAlign: "center" as const,
    transition: "all 0.2s",
    cursor: "pointer",
    marginBottom: "24px",
  },
  dropIcon: {
    color: "#6b6b80",
    marginBottom: "16px",
  },
  dropText: {
    fontSize: "16px",
    marginBottom: "8px",
  },
  browseLink: {
    color: "#8b5cf6",
    cursor: "pointer",
    textDecoration: "underline",
  },
  dropHint: {
    fontSize: "14px",
    color: "#6b6b80",
    margin: 0,
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid #ef4444",
    color: "#ef4444",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
  },
  duplicateNotice: {
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid #eab308",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
  },
  duplicateHeader: {
    color: "#eab308",
    fontWeight: 600,
    fontSize: "14px",
    marginBottom: "12px",
  },
  duplicateList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  duplicateItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    fontSize: "13px",
  },
  dismissButton: {
    marginTop: "12px",
    padding: "6px 12px",
    background: "transparent",
    border: "1px solid #eab308",
    borderRadius: "4px",
    color: "#eab308",
    fontSize: "12px",
    cursor: "pointer",
  },
  queueSection: {
    background: "#13131a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a3a",
    marginBottom: "32px",
  },
  queueHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  queueTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#f0f0f5",
    margin: 0,
  },
  queueCount: {
    fontSize: "14px",
    color: "#9494a8",
  },
  analyzeButton: {
    padding: "6px 12px",
    borderRadius: "6px",
    background: "#10b981",
    color: "#fff",
    fontWeight: 500,
    fontSize: "13px",
    border: "none",
    cursor: "pointer",
  },
  groupList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    marginBottom: "16px",
  },
  groupCard: {
    background: "#1a1a24",
    borderRadius: "12px",
    border: "1px solid #2a2a3a",
    overflow: "hidden",
  },
  groupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#22222e",
    borderBottom: "1px solid #2a2a3a",
  },
  groupTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f0f0f5",
  },
  groupFileCount: {
    fontSize: "12px",
    color: "#9494a8",
  },
  groupFiles: {
    padding: "8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    background: "#13131a",
    borderRadius: "6px",
  },
  fileIcon: {
    color: "#6b6b80",
  },
  fileInfo: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: 0,
  },
  fileName: {
    fontSize: "13px",
    color: "#f0f0f5",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "300px",
  },
  reviewButton: {
    display: "block",
    textAlign: "center" as const,
    padding: "12px",
    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    borderRadius: "8px",
    textDecoration: "none",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
  },
  infoCard: {
    background: "#13131a",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #2a2a3a",
  },
  infoIcon: {
    color: "#8b5cf6",
    marginBottom: "12px",
  },
  infoTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#f0f0f5",
    marginBottom: "6px",
  },
  infoDesc: {
    fontSize: "13px",
    color: "#9494a8",
    lineHeight: 1.5,
    margin: 0,
  },
};
