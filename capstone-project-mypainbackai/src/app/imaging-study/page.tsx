"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// =============================================================================
// Imaging Study Page - Quick Reference for New Providers
// =============================================================================

interface ImagingListItem {
  date: string;
  study: string;
  provider: string | null;
  finding: string;
}

interface ImagingStudyReport {
  generatedAt: string;
  quickSummary: string;
  imagingList: ImagingListItem[];
  primaryDiagnosis: string;
  keyPoints: string[];
  lastImagingDate: string | null;
}

export default function ImagingStudyPage() {
  const [report, setReport] = useState<ImagingStudyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const response = await fetch("/api/ai/imaging-study");
      const data = await response.json();
      if (data.quickSummary || data.imagingList) {
        setReport(data);
      }
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/imaging-study", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate report");
      }
      const data = await response.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "Unknown") return "Unknown";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/" style={styles.backLink}>← Back to Dashboard</Link>
        <h1 style={styles.title}>📋 Imaging Summary</h1>
        <p style={styles.subtitle}>Quick reference for healthcare providers</p>
      </div>

      {/* Generate Button */}
      <div style={styles.actions}>
        <button
          onClick={generateReport}
          disabled={generating}
          style={styles.generateBtn}
        >
          {generating ? "Generating..." : report ? "🔄 Refresh" : "Generate Summary"}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : !report ? (
        <div style={styles.empty}>
          <p>No imaging summary generated yet.</p>
          <p style={{ fontSize: "14px", color: "#6b6b80" }}>
            Click "Generate Summary" to create a quick reference of your imaging history.
          </p>
        </div>
      ) : (
        <div style={styles.content}>
          {/* Quick Summary Card */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryHeader}>
              <span style={styles.summaryIcon}>🔬</span>
              <span style={styles.summaryLabel}>Summary</span>
            </div>
            <p style={styles.summaryText}>{report.quickSummary}</p>
          </div>

          {/* Primary Diagnosis */}
          <div style={styles.diagnosisCard}>
            <div style={styles.diagnosisLabel}>Primary Diagnosis</div>
            <div style={styles.diagnosisText}>{report.primaryDiagnosis}</div>
          </div>

          {/* Key Points */}
          {report.keyPoints && report.keyPoints.length > 0 && (
            <div style={styles.keyPointsCard}>
              <div style={styles.sectionTitle}>⚡ Key Points for Provider</div>
              <ul style={styles.keyPointsList}>
                {report.keyPoints.map((point, i) => (
                  <li key={i} style={styles.keyPoint}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Imaging List Table */}
          <div style={styles.tableCard}>
            <div style={styles.sectionTitle}>📅 Imaging History</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Study</th>
                  <th style={styles.th}>Provider</th>
                  <th style={styles.th}>Finding</th>
                </tr>
              </thead>
              <tbody>
                {report.imagingList.map((item, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{formatDate(item.date)}</td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{item.study}</td>
                    <td style={styles.td}>{item.provider || "—"}</td>
                    <td style={styles.tdFinding}>{item.finding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <p>Last imaging: {formatDate(report.lastImagingDate || "")}</p>
            <p>Report generated: {new Date(report.generatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Styles - Clean, scannable design
// =============================================================================
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e5e5e5",
    padding: "32px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    marginBottom: "24px",
  },
  backLink: {
    color: "#10b981",
    textDecoration: "none",
    fontSize: "14px",
    marginBottom: "16px",
    display: "inline-block",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    margin: "8px 0",
    color: "#fff",
  },
  subtitle: {
    color: "#6b6b80",
    fontSize: "16px",
    margin: 0,
  },
  actions: {
    marginBottom: "24px",
  },
  generateBtn: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid #ef4444",
    color: "#ef4444",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
  },
  loading: {
    textAlign: "center",
    padding: "48px",
    color: "#6b6b80",
  },
  empty: {
    textAlign: "center",
    padding: "48px",
    background: "#13131a",
    borderRadius: "12px",
    border: "1px solid #2a2a3a",
  },
  content: {
    maxWidth: "900px",
  },
  summaryCard: {
    background: "linear-gradient(135deg, #13131a 0%, #1a2a1a 100%)",
    border: "1px solid #10b981",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  },
  summaryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  summaryIcon: {
    fontSize: "20px",
  },
  summaryLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#10b981",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  summaryText: {
    fontSize: "16px",
    lineHeight: 1.6,
    margin: 0,
    color: "#e5e5e5",
  },
  diagnosisCard: {
    background: "#13131a",
    border: "1px solid #2a2a3a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  },
  diagnosisLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#8b5cf6",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  diagnosisText: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#fff",
  },
  keyPointsCard: {
    background: "#13131a",
    border: "1px solid #2a2a3a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    marginBottom: "16px",
  },
  keyPointsList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  keyPoint: {
    padding: "8px 0",
    borderBottom: "1px solid #2a2a3a",
    color: "#e5e5e5",
    fontSize: "14px",
  },
  tableCard: {
    background: "#13131a",
    border: "1px solid #2a2a3a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 8px",
    borderBottom: "2px solid #2a2a3a",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b6b80",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #1f1f2a",
  },
  td: {
    padding: "12px 8px",
    fontSize: "14px",
    color: "#e5e5e5",
    verticalAlign: "top",
  },
  tdFinding: {
    padding: "12px 8px",
    fontSize: "14px",
    color: "#9494a8",
    verticalAlign: "top",
    maxWidth: "300px",
  },
  footer: {
    textAlign: "center",
    padding: "24px",
    color: "#6b6b80",
    fontSize: "12px",
  },
};
