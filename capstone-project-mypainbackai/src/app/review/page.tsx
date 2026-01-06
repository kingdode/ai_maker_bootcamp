"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface FileAnalysis {
  fileId: string;
  analyzedAt: string;
  category: string;
  confidence: number;
  extractedDate: string | null;
  provider: string | null;
  bodyRegion: string | null;
  summary: string;
  suggestedTitle: string;
}

interface FileForReview {
  id: string;
  originalFilename: string;
  aiStatus: string;
  batchId?: string;
  mimeType?: string;
  analysis?: FileAnalysis;
}

interface FileGroup {
  groupId: string;
  groupName: string;
  files: FileForReview[];
  isExpanded: boolean;
}

export default function ReviewPage() {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileForReview | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"split" | "full">("split");
  
  // Editable fields
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editBodyRegion, setEditBodyRegion] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/review");
      if (!response.ok) throw new Error("Failed to fetch files");
      
      const data = await response.json();
      const fileList = Array.isArray(data) ? data : (data.files || []);
      
      // Fetch analysis for each file
      const filesWithAnalysis = await Promise.all(
        fileList.map(async (file: FileForReview) => {
          try {
            const analysisRes = await fetch(`/api/ai/analyze?fileId=${file.id}`);
            if (analysisRes.ok) {
              const data = await analysisRes.json();
              if (data.analyzed && data.analysis) {
                // Extract the nested analysis object
                return { ...file, aiStatus: "review", analysis: data.analysis };
              }
            }
          } catch (e) {
            // Analysis not found
          }
          return file;
        })
      );
      
      const groups = groupFilesByBatch(filesWithAnalysis);
      setFileGroups(groups);
      
      if (groups.length > 0 && groups[0].files.length > 0 && !selectedFile) {
        selectFile(groups[0].files[0]);
      }
    } catch (error) {
      console.error("Error fetching review files:", error);
      setMessage({ type: "error", text: "Failed to load files for review." });
    } finally {
      setLoading(false);
    }
  }, []);

  const groupFilesByBatch = (files: FileForReview[]): FileGroup[] => {
    const groupMap = new Map<string, FileForReview[]>();
    
    for (const file of files) {
      const timestamp = file.id.match(/^(\d+)-/)?.[1];
      const groupId = file.batchId || timestamp || "ungrouped";
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(file);
    }

    const groups: FileGroup[] = [];
    groupMap.forEach((groupFiles, groupId) => {
      const hasZipFiles = groupFiles.some(f => f.id.includes("-zip-"));
      
      let groupName = "Upload Group";
      if (hasZipFiles && groupFiles.length > 1) {
        groupName = `📦 ZIP Archive (${groupFiles.length} files)`;
      } else if (groupFiles.length > 1) {
        groupName = `📂 Upload Batch (${groupFiles.length} files)`;
      } else {
        groupName = groupFiles[0].analysis?.suggestedTitle || groupFiles[0].originalFilename;
      }
      
      groups.push({
        groupId,
        groupName,
        files: groupFiles,
        isExpanded: true,
      });
    });

    groups.sort((a, b) => {
      const aTime = parseInt(a.groupId.replace(/\D/g, "")) || 0;
      const bTime = parseInt(b.groupId.replace(/\D/g, "")) || 0;
      return bTime - aTime;
    });

    return groups;
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const toggleGroup = (groupId: string) => {
    setFileGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId ? { ...g, isExpanded: !g.isExpanded } : g
      )
    );
  };

  const selectFile = (file: FileForReview) => {
    setSelectedFile(file);
    if (file.analysis) {
      setEditCategory(file.analysis.category || "other");
      setEditDate(file.analysis.extractedDate || "");
      setEditProvider(file.analysis.provider || "");
      setEditBodyRegion(file.analysis.bodyRegion || "");
      setEditTitle(file.analysis.suggestedTitle || file.originalFilename);
    } else {
      setEditCategory("other");
      setEditDate("");
      setEditProvider("");
      setEditBodyRegion("");
      setEditTitle(file.originalFilename);
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;

    setMessage(null);
    try {
      const response = await fetch(`/api/review/${selectedFile.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          category: editCategory,
          date: editDate,
          provider: editProvider,
          bodyRegion: editBodyRegion,
          title: editTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Confirmation failed");
      }

      setMessage({ type: "success", text: `"${editTitle}" confirmed and added to timeline!` });
      setSelectedFile(null);
      fetchFiles();
    } catch (error: any) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    }
  };

  const handleConfirmGroup = async (groupId: string) => {
    const group = fileGroups.find((g) => g.groupId === groupId);
    if (!group) return;

    setMessage(null);
    try {
      for (const file of group.files) {
        await fetch(`/api/review/${file.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            category: file.analysis?.category || "other",
            date: file.analysis?.extractedDate || "",
            provider: file.analysis?.provider || "",
            bodyRegion: file.analysis?.bodyRegion || "",
            title: file.analysis?.suggestedTitle || file.originalFilename,
          }),
        });
      }

      setMessage({ type: "success", text: `Group with ${group.files.length} files confirmed!` });
      setSelectedFile(null);
      fetchFiles();
    } catch (error: any) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    }
  };

  const handleReject = async () => {
    if (!selectedFile) return;

    setMessage(null);
    try {
      const response = await fetch(`/api/review/${selectedFile.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Rejection failed");
      }

      setMessage({ type: "success", text: `File rejected and removed.` });
      setSelectedFile(null);
      fetchFiles();
    } catch (error: any) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    }
  };

  const categories = [
    { value: "imaging", label: "🔬 Imaging" },
    { value: "visit_notes", label: "📋 Visit Notes" },
    { value: "physical_therapy", label: "🏃 Physical Therapy" },
    { value: "medication", label: "💊 Medication" },
    { value: "lab_results", label: "🧪 Lab Results" },
    { value: "billing", label: "💰 Billing" },
    { value: "other", label: "📄 Other" },
  ];

  const bodyRegions = [
    { value: "", label: "Not specified" },
    { value: "spine", label: "Spine" },
    { value: "back", label: "Back" },
    { value: "neck", label: "Neck" },
    { value: "shoulder", label: "Shoulder" },
    { value: "knee", label: "Knee" },
    { value: "hip", label: "Hip" },
    { value: "general", label: "General/Multiple" },
  ];

  const totalFiles = fileGroups.reduce((sum, g) => sum + g.files.length, 0);

  // Determine file preview type
  const getPreviewType = (filename: string): "pdf" | "image" | "unsupported" => {
    const ext = filename.toLowerCase().split(".").pop() || "";
    if (ext === "pdf") return "pdf";
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"].includes(ext)) return "image";
    return "unsupported";
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <Link href="/" style={styles.backLink}>← Back to Dashboard</Link>
          <h1 style={styles.title}>AI Review Queue</h1>
          <p style={styles.subtitle}>
            Review files with preview. Click a file to see its contents and categorize it.
          </p>
        </div>
        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.toggleButton,
              background: previewMode === "split" ? "#8b5cf6" : "transparent",
            }}
            onClick={() => setPreviewMode("split")}
          >
            Split View
          </button>
          <button
            style={{
              ...styles.toggleButton,
              background: previewMode === "full" ? "#8b5cf6" : "transparent",
            }}
            onClick={() => setPreviewMode("full")}
          >
            Full Preview
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          background: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          borderColor: message.type === "success" ? "#10b981" : "#ef4444",
          color: message.type === "success" ? "#10b981" : "#ef4444",
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        ...styles.contentGrid,
        gridTemplateColumns: previewMode === "full" 
          ? "300px 1fr" 
          : "300px 1fr 380px",
      }}>
        {/* File List Panel */}
        <div style={styles.fileListPanel}>
          <h2 style={styles.panelTitle}>
            {fileGroups.length} Group{fileGroups.length !== 1 ? "s" : ""} • {totalFiles} Files
          </h2>
          {loading ? (
            <p style={styles.loadingText}>Loading files...</p>
          ) : fileGroups.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No files awaiting review.</p>
              <Link href="/upload" style={styles.uploadLink}>
                Upload Files →
              </Link>
            </div>
          ) : (
            <div style={styles.groupList}>
              {fileGroups.map((group) => (
                <div key={group.groupId} style={styles.groupCard}>
                  <div
                    style={styles.groupHeader}
                    onClick={() => toggleGroup(group.groupId)}
                  >
                    <div style={styles.groupHeaderLeft}>
                      <span style={styles.expandIcon}>
                        {group.isExpanded ? "▼" : "▶"}
                      </span>
                      <span style={styles.groupName}>{group.groupName}</span>
                    </div>
                    {group.files.length > 1 && (
                      <button
                        style={styles.confirmGroupButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmGroup(group.groupId);
                        }}
                      >
                        ✓ All
                      </button>
                    )}
                  </div>
                  {group.isExpanded && (
                    <div style={styles.groupFiles}>
                      {group.files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            ...styles.fileListItem,
                            background: selectedFile?.id === file.id ? "#2a2a3a" : "#1a1a24",
                            borderColor: selectedFile?.id === file.id ? "#8b5cf6" : "transparent",
                          }}
                          onClick={() => selectFile(file)}
                        >
                          <div style={styles.fileListItemIcon}>
                            {getPreviewType(file.originalFilename) === "pdf" ? "📄" :
                             getPreviewType(file.originalFilename) === "image" ? "🖼️" : "📁"}
                          </div>
                          <div style={styles.fileListItemText}>
                            <div style={styles.fileListItemTitle}>
                              {file.analysis?.suggestedTitle || file.originalFilename}
                            </div>
                            <div style={styles.fileListItemMeta}>
                              {file.analysis ? (
                                <CategoryBadge category={file.analysis.category} />
                              ) : (
                                <span style={{ color: "#eab308", fontSize: "11px" }}>Awaiting AI</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div style={styles.previewPanel}>
          {selectedFile ? (
            <>
              <div style={styles.previewHeader}>
                <h3 style={styles.previewTitle}>{selectedFile.originalFilename}</h3>
                <CategoryBadge category={editCategory || "other"} />
              </div>
              <FilePreview fileId={selectedFile.id} filename={selectedFile.originalFilename} />
            </>
          ) : (
            <div style={styles.emptyPreview}>
              <span style={{ fontSize: "48px", opacity: 0.5 }}>👀</span>
              <p>Select a file to preview</p>
            </div>
          )}
        </div>

        {/* Detail / Edit Panel - Only show in split mode */}
        {previewMode === "split" && (
          <div style={styles.detailPanel}>
            {selectedFile ? (
              <>
                <h2 style={styles.panelTitle}>Edit Details</h2>
                
                {selectedFile.analysis && (
                  <div style={styles.aiSummaryBox}>
                    <div style={styles.aiSummaryHeader}>
                      <span>🤖 AI Analysis</span>
                      <span style={{ fontSize: "12px", color: "#6b6b80" }}>
                        {Math.round((selectedFile.analysis.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <p style={styles.aiSummaryText}>{selectedFile.analysis.summary}</p>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={styles.select}
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Body Region</label>
                    <select
                      value={editBodyRegion}
                      onChange={(e) => setEditBodyRegion(e.target.value)}
                      style={styles.select}
                    >
                      {bodyRegions.map((region) => (
                        <option key={region.value} value={region.value}>{region.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Provider</label>
                  <input
                    type="text"
                    value={editProvider}
                    onChange={(e) => setEditProvider(e.target.value)}
                    placeholder="e.g., Dr. Smith"
                    style={styles.input}
                  />
                </div>

                <div style={styles.actionButtons}>
                  <button style={styles.confirmButton} onClick={handleConfirm}>
                    ✓ Confirm
                  </button>
                  <button style={styles.rejectButton} onClick={handleReject}>
                    ✕
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.emptyDetail}>
                <p>Select a file to edit</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating action bar in full preview mode */}
      {previewMode === "full" && selectedFile && (
        <div style={styles.floatingBar}>
          <div style={styles.floatingFields}>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={styles.floatingSelect}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={styles.floatingInput}
            />
            <input
              type="text"
              value={editProvider}
              onChange={(e) => setEditProvider(e.target.value)}
              placeholder="Provider"
              style={{ ...styles.floatingInput, width: "150px" }}
            />
          </div>
          <div style={styles.floatingActions}>
            <button style={styles.floatingConfirm} onClick={handleConfirm}>
              ✓ Confirm
            </button>
            <button style={styles.floatingReject} onClick={handleReject}>
              ✕ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// File Preview Component
function FilePreview({ fileId, filename }: { fileId: string; filename: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = filename.toLowerCase().split(".").pop() || "";
  const previewUrl = `/api/files/${encodeURIComponent(fileId)}`;

  const isPdf = ext === "pdf";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"].includes(ext);
  const isDicom = ext === "dcm";
  const isFont = ["ttf", "otf", "woff", "woff2", "eot"].includes(ext);
  const isCode = ["h", "m", "swift", "js", "ts", "json", "xml", "html", "css"].includes(ext);

  if (isFont) {
    return (
      <div style={previewStyles.unsupported}>
        <span style={{ fontSize: "48px" }}>🔤</span>
        <p style={{ marginTop: "16px", color: "#9494a8" }}>Font File</p>
        <p style={{ fontSize: "13px", color: "#6b6b80" }}>{filename}</p>
      </div>
    );
  }

  if (isDicom) {
    return (
      <div style={previewStyles.unsupported}>
        <span style={{ fontSize: "48px" }}>🔬</span>
        <p style={{ marginTop: "16px", color: "#9494a8" }}>DICOM Medical Image</p>
        <p style={{ fontSize: "13px", color: "#6b6b80" }}>{filename}</p>
        <p style={{ fontSize: "12px", color: "#6b6b80", marginTop: "8px" }}>
          (Preview not available - specialized viewer required)
        </p>
      </div>
    );
  }

  if (isCode) {
    return (
      <div style={previewStyles.unsupported}>
        <span style={{ fontSize: "48px" }}>📝</span>
        <p style={{ marginTop: "16px", color: "#9494a8" }}>Code/Text File</p>
        <p style={{ fontSize: "13px", color: "#6b6b80" }}>{filename}</p>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div style={previewStyles.container}>
        {loading && <div style={previewStyles.loading}>Loading PDF...</div>}
        <iframe
          src={`${previewUrl}#toolbar=1&navpanes=0`}
          style={{
            ...previewStyles.iframe,
            display: loading ? "none" : "block",
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Failed to load PDF");
          }}
        />
        {error && <div style={previewStyles.error}>{error}</div>}
      </div>
    );
  }

  if (isImage) {
    return (
      <div style={previewStyles.imageContainer}>
        {loading && <div style={previewStyles.loading}>Loading image...</div>}
        <img
          src={previewUrl}
          alt={filename}
          style={{
            ...previewStyles.image,
            display: loading ? "none" : "block",
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Failed to load image");
          }}
        />
        {error && <div style={previewStyles.error}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={previewStyles.unsupported}>
      <span style={{ fontSize: "48px" }}>📁</span>
      <p style={{ marginTop: "16px", color: "#9494a8" }}>Preview not available</p>
      <p style={{ fontSize: "13px", color: "#6b6b80" }}>{filename}</p>
      <a
        href={previewUrl}
        download={filename}
        style={previewStyles.downloadLink}
      >
        ⬇️ Download File
      </a>
    </div>
  );
}

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
    <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 500, background: `${color}20`, color }}>
      {label}
    </span>
  );
}

const previewStyles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#1a1a24",
    borderRadius: "8px",
    overflow: "hidden",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    minHeight: "500px",
  },
  imageContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a24",
    borderRadius: "8px",
    overflow: "auto",
    padding: "16px",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: "4px",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    color: "#9494a8",
  },
  error: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    color: "#ef4444",
  },
  unsupported: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a24",
    borderRadius: "8px",
    padding: "40px",
    textAlign: "center",
  },
  downloadLink: {
    marginTop: "16px",
    padding: "8px 16px",
    background: "#2a2a3a",
    borderRadius: "6px",
    color: "#8b5cf6",
    textDecoration: "none",
    fontSize: "14px",
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d0d12",
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    maxWidth: "1600px",
    margin: "0 auto 20px",
  },
  backLink: {
    color: "#8b5cf6",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    display: "inline-block",
    marginBottom: "8px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#f0f0f5",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#9494a8",
  },
  viewToggle: {
    display: "flex",
    gap: "4px",
    background: "#1a1a24",
    padding: "4px",
    borderRadius: "8px",
  },
  toggleButton: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    color: "#f0f0f5",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  message: {
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid",
    maxWidth: "1600px",
    margin: "0 auto 20px",
  },
  contentGrid: {
    display: "grid",
    gap: "20px",
    maxWidth: "1600px",
    margin: "0 auto",
    height: "calc(100vh - 180px)",
  },
  fileListPanel: {
    background: "#13131a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #2a2a3a",
    overflowY: "auto",
  },
  previewPanel: {
    background: "#13131a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #2a2a3a",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #2a2a3a",
  },
  previewTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f0f0f5",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "80%",
  },
  emptyPreview: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b6b80",
  },
  panelTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f0f0f5",
    marginBottom: "12px",
  },
  loadingText: {
    color: "#9494a8",
    textAlign: "center",
    padding: "40px 0",
    fontSize: "14px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#9494a8",
    fontSize: "14px",
  },
  uploadLink: {
    color: "#8b5cf6",
    textDecoration: "underline",
    marginTop: "8px",
    display: "inline-block",
  },
  groupList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  groupCard: {
    background: "#1a1a24",
    borderRadius: "8px",
    border: "1px solid #2a2a3a",
    overflow: "hidden",
  },
  groupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#22222e",
    cursor: "pointer",
  },
  groupHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
    flex: 1,
  },
  expandIcon: {
    fontSize: "8px",
    color: "#6b6b80",
  },
  groupName: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#f0f0f5",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  confirmGroupButton: {
    padding: "3px 8px",
    borderRadius: "4px",
    background: "#10b981",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
  },
  groupFiles: {
    padding: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  fileListItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    border: "1px solid transparent",
  },
  fileListItemIcon: {
    fontSize: "14px",
    flexShrink: 0,
  },
  fileListItemText: {
    flex: 1,
    minWidth: 0,
  },
  fileListItemTitle: {
    fontSize: "12px",
    color: "#f0f0f5",
    fontWeight: 500,
    marginBottom: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fileListItemMeta: {},
  detailPanel: {
    background: "#13131a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #2a2a3a",
    overflowY: "auto",
  },
  aiSummaryBox: {
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid #8b5cf6",
    borderRadius: "6px",
    padding: "12px",
    marginBottom: "16px",
  },
  aiSummaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
    color: "#8b5cf6",
    fontSize: "12px",
    fontWeight: 500,
  },
  aiSummaryText: {
    color: "#f0f0f5",
    fontSize: "13px",
    lineHeight: 1.4,
    margin: 0,
  },
  formGroup: {
    marginBottom: "12px",
    flex: 1,
  },
  formRow: {
    display: "flex",
    gap: "12px",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    color: "#9494a8",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    background: "#1a1a24",
    border: "1px solid #2a2a3a",
    borderRadius: "6px",
    color: "#f0f0f5",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    background: "#1a1a24",
    border: "1px solid #2a2a3a",
    borderRadius: "6px",
    color: "#f0f0f5",
    outline: "none",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
  },
  confirmButton: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "6px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    border: "none",
    cursor: "pointer",
  },
  rejectButton: {
    padding: "12px 16px",
    borderRadius: "6px",
    background: "transparent",
    color: "#ef4444",
    fontWeight: 600,
    fontSize: "13px",
    border: "1px solid #ef4444",
    cursor: "pointer",
  },
  emptyDetail: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#9494a8",
    fontSize: "14px",
  },
  floatingBar: {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#1a1a24",
    padding: "12px 20px",
    borderRadius: "12px",
    border: "1px solid #2a2a3a",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  floatingFields: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  floatingSelect: {
    padding: "8px 12px",
    fontSize: "13px",
    background: "#13131a",
    border: "1px solid #2a2a3a",
    borderRadius: "6px",
    color: "#f0f0f5",
    outline: "none",
  },
  floatingInput: {
    padding: "8px 12px",
    fontSize: "13px",
    background: "#13131a",
    border: "1px solid #2a2a3a",
    borderRadius: "6px",
    color: "#f0f0f5",
    outline: "none",
    width: "120px",
  },
  floatingActions: {
    display: "flex",
    gap: "8px",
  },
  floatingConfirm: {
    padding: "10px 20px",
    borderRadius: "6px",
    background: "#10b981",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    border: "none",
    cursor: "pointer",
  },
  floatingReject: {
    padding: "10px 16px",
    borderRadius: "6px",
    background: "transparent",
    color: "#ef4444",
    fontWeight: 500,
    fontSize: "13px",
    border: "1px solid #ef4444",
    cursor: "pointer",
  },
};
