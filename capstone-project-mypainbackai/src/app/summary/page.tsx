"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Analysis {
  fileId: string;
  originalFilename: string;
  analyzedAt: string;
  category: string;
  confidence: number;
  extractedDate: string | null;
  provider: string | null;
  bodyRegion: string | null;
  summary: string;
  suggestedTitle: string;
  keywords?: string[];
}

interface PatientSummary {
  conditions: string[];
  providers: string[];
  bodyRegions: string[];
  dateRange: { earliest: string | null; latest: string | null };
  medicationsFound: string[];
  treatmentsFound: string[];
}

interface SummaryData {
  lastUpdated: string;
  totalFilesAnalyzed: number;
  patientSummary: PatientSummary;
  byCategory: Record<string, Analysis[]>;
}

export default function SummaryPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [doctorSummary, setDoctorSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/ai/summary");
      if (response.ok) {
        const summaryData = await response.json();
        setData(summaryData);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateDoctorSummary = async () => {
    setGenerating(true);
    setError(null);
    try {
      const apiKey = localStorage.getItem("openai_api_key") || "";
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const result = await response.json();
      setDoctorSummary(result.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
    imaging: { label: "Medical Imaging", icon: "🔬", color: "#10b981" },
    visit_notes: { label: "Visit Notes", icon: "📋", color: "#3b82f6" },
    physical_therapy: { label: "Physical Therapy", icon: "🏃", color: "#8b5cf6" },
    medication: { label: "Medications", icon: "💊", color: "#f97066" },
    lab_results: { label: "Lab Results", icon: "🧪", color: "#eab308" },
    billing: { label: "Billing", icon: "💰", color: "#6b6b80" },
    other: { label: "Other Documents", icon: "📄", color: "#9494a8" },
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading summary...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <Link href="/" style={styles.backLink}>← Back to Dashboard</Link>
          <h1 style={styles.title}>Medical Records Summary</h1>
          <p style={styles.subtitle}>
            Cumulative analysis of your uploaded medical documents
          </p>
        </div>
        <button
          onClick={generateDoctorSummary}
          disabled={generating || !data?.totalFilesAnalyzed}
          style={{
            ...styles.generateButton,
            opacity: generating || !data?.totalFilesAnalyzed ? 0.5 : 1,
          }}
        >
          {generating ? "Generating..." : "📄 Generate Doctor-Ready Summary"}
        </button>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{data?.totalFilesAnalyzed || 0}</div>
          <div style={styles.statLabel}>Files Analyzed</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{data?.patientSummary?.providers?.length || 0}</div>
          <div style={styles.statLabel}>Healthcare Providers</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{data?.patientSummary?.bodyRegions?.length || 0}</div>
          <div style={styles.statLabel}>Body Regions</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {data?.patientSummary?.dateRange?.earliest
              ? formatDate(data.patientSummary.dateRange.earliest)
              : "N/A"}
          </div>
          <div style={styles.statLabel}>Earliest Record</div>
        </div>
      </div>

      {/* Doctor Summary */}
      {doctorSummary && (
        <div style={styles.doctorSummary}>
          <div style={styles.doctorSummaryHeader}>
            <h2 style={styles.sectionTitle}>📋 Doctor-Ready Summary</h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(doctorSummary);
                alert("Summary copied to clipboard!");
              }}
              style={styles.copyButton}
            >
              📋 Copy
            </button>
          </div>
          <div style={styles.doctorSummaryContent}>
            {doctorSummary.split("\n").map((line, i) => (
              <p key={i} style={{ margin: line.trim() ? "8px 0" : "16px 0" }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Providers */}
      {data?.patientSummary?.providers && data.patientSummary.providers.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🏥 Healthcare Providers</h2>
          <div style={styles.tagGrid}>
            {data.patientSummary.providers.map((provider, i) => (
              <span key={i} style={styles.providerTag}>{provider}</span>
            ))}
          </div>
        </div>
      )}

      {/* Body Regions */}
      {data?.patientSummary?.bodyRegions && data.patientSummary.bodyRegions.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🦴 Body Regions</h2>
          <div style={styles.tagGrid}>
            {data.patientSummary.bodyRegions.map((region, i) => (
              <span key={i} style={styles.regionTag}>{region}</span>
            ))}
          </div>
        </div>
      )}

      {/* Documents by Category */}
      {data?.byCategory && Object.keys(data.byCategory).length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📁 Documents by Category</h2>
          <div style={styles.categoryGrid}>
            {Object.entries(data.byCategory).map(([category, files]) => {
              const catInfo = categoryLabels[category] || categoryLabels.other;
              return (
                <div key={category} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <span style={{ fontSize: "24px" }}>{catInfo.icon}</span>
                    <div>
                      <div style={{ ...styles.categoryTitle, color: catInfo.color }}>
                        {catInfo.label}
                      </div>
                      <div style={styles.categoryCount}>{files.length} documents</div>
                    </div>
                  </div>
                  <div style={styles.categoryFiles}>
                    {files.slice(0, 5).map((file, i) => (
                      <div key={i} style={styles.fileItem}>
                        <div style={styles.fileTitle}>{file.suggestedTitle}</div>
                        <div style={styles.fileMeta}>
                          {file.extractedDate && (
                            <span>{formatDate(file.extractedDate)}</span>
                          )}
                          {file.provider && (
                            <span style={{ marginLeft: "8px" }}>• {file.provider}</span>
                          )}
                        </div>
                        <div style={styles.fileSummary}>{file.summary}</div>
                      </div>
                    ))}
                    {files.length > 5 && (
                      <div style={styles.moreFiles}>
                        +{files.length - 5} more documents
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data || data.totalFilesAnalyzed === 0) && (
        <div style={styles.emptyState}>
          <span style={{ fontSize: "48px" }}>📊</span>
          <h3 style={{ marginTop: "16px", color: "#f0f0f5" }}>No Analyzed Files Yet</h3>
          <p style={{ color: "#9494a8", marginBottom: "24px" }}>
            Upload and analyze your medical files to see a comprehensive summary.
          </p>
          <Link href="/upload" style={styles.uploadButton}>
            Upload Files
          </Link>
        </div>
      )}

      {/* Last Updated */}
      {data?.lastUpdated && (
        <div style={styles.lastUpdated}>
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d0d12",
    padding: "32px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh",
    color: "#9494a8",
    fontSize: "16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
  },
  backLink: {
    color: "#8b5cf6",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    display: "inline-block",
    marginBottom: "12px",
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
  },
  generateButton: {
    padding: "14px 24px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  error: {
    padding: "16px",
    borderRadius: "8px",
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid #ef4444",
    color: "#ef4444",
    marginBottom: "24px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    background: "#13131a",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center",
    border: "1px solid #2a2a3a",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#f0f0f5",
    marginBottom: "8px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#9494a8",
  },
  doctorSummary: {
    background: "#13131a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #8b5cf6",
    marginBottom: "32px",
  },
  doctorSummaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  doctorSummaryContent: {
    color: "#f0f0f5",
    fontSize: "14px",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
  },
  copyButton: {
    padding: "8px 16px",
    borderRadius: "6px",
    background: "#2a2a3a",
    color: "#f0f0f5",
    fontSize: "13px",
    border: "none",
    cursor: "pointer",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#f0f0f5",
    marginBottom: "16px",
  },
  tagGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  providerTag: {
    padding: "8px 16px",
    borderRadius: "20px",
    background: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
    fontSize: "13px",
    fontWeight: 500,
  },
  regionTag: {
    padding: "8px 16px",
    borderRadius: "20px",
    background: "rgba(234, 179, 8, 0.15)",
    color: "#eab308",
    fontSize: "13px",
    fontWeight: 500,
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
  },
  categoryCard: {
    background: "#13131a",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #2a2a3a",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid #2a2a3a",
  },
  categoryTitle: {
    fontSize: "16px",
    fontWeight: 600,
  },
  categoryCount: {
    fontSize: "12px",
    color: "#6b6b80",
    marginTop: "2px",
  },
  categoryFiles: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  fileItem: {
    padding: "12px",
    background: "#1a1a24",
    borderRadius: "8px",
  },
  fileTitle: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#f0f0f5",
    marginBottom: "4px",
  },
  fileMeta: {
    fontSize: "12px",
    color: "#6b6b80",
    marginBottom: "6px",
  },
  fileSummary: {
    fontSize: "13px",
    color: "#9494a8",
    lineHeight: 1.4,
  },
  moreFiles: {
    textAlign: "center",
    color: "#8b5cf6",
    fontSize: "13px",
    padding: "8px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#13131a",
    borderRadius: "16px",
    border: "1px solid #2a2a3a",
  },
  uploadButton: {
    display: "inline-block",
    padding: "12px 24px",
    borderRadius: "8px",
    background: "#8b5cf6",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
  lastUpdated: {
    textAlign: "center",
    color: "#6b6b80",
    fontSize: "12px",
    marginTop: "32px",
  },
};

