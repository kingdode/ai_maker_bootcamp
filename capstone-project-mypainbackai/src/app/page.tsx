"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// Types for API data
interface UploadedFile {
  id: string;
  originalFilename: string;
  aiStatus: string;
  aiCategory: string;
  fileSize: number;
  uploadedAt: string;
}

// Icon components
const Icons = {
  Logo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill="url(#logoGradient)" />
      <path d="M10 14h8M14 10v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8M5 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Document: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 1v4h4M6 8h4M6 11h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15 7a5 5 0 00-10 0c0 5-2 7-2 7h14s-2-2-2-7M9 17a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="3" />
      <path d="M16.5 10a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
  ),
  File: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 1H4a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V6l-5-5z" />
      <path d="M10 1v5h5" />
    </svg>
  ),
  Report: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="14" height="14" rx="2" />
      <path d="M5 10l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 16h14M5 13V9M9 13V5M13 13V8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Pain: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 2L7 6l-4 .5 3 2.8-.8 4.2L9 11l3.8 2.5-.8-4.2 3-2.8-4-.5L9 2z" strokeLinejoin="round" />
    </svg>
  ),
  Empty: () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#6b6b80" strokeWidth="1.5">
      <rect x="8" y="8" width="32" height="32" rx="4" />
      <path d="M18 24h12M24 18v12" strokeLinecap="round" />
    </svg>
  ),
};

// Category info mapping
const categoryInfo: Record<string, { icon: string; color: string; label: string }> = {
  imaging: { icon: "🔬", color: "#10b981", label: "Imaging" },
  visit_notes: { icon: "📋", color: "#3b82f6", label: "Visit Notes" },
  physical_therapy: { icon: "🏃", color: "#8b5cf6", label: "Physical Therapy" },
  medication: { icon: "💊", color: "#f97066", label: "Medication" },
  lab_results: { icon: "🧪", color: "#eab308", label: "Lab Results" },
  billing: { icon: "💰", color: "#6b6b80", label: "Billing" },
  other: { icon: "📄", color: "#9494a8", label: "Other" },
};

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return diffMins + " min ago";
  if (diffHours < 24) return diffHours + " hour" + (diffHours > 1 ? "s" : "") + " ago";
  if (diffDays < 7) return diffDays + " day" + (diffDays > 1 ? "s" : "") + " ago";
  return date.toLocaleDateString();
}

// Format file size
function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid #2a2a3a",
    background: "#0d0d12",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navLeft: { display: "flex", alignItems: "center", gap: "32px" },
  logo: { display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "18px", color: "#f0f0f5" },
  navLinks: { display: "flex", gap: "8px" },
  navLink: { padding: "8px 16px", borderRadius: "8px", color: "#9494a8", textDecoration: "none", fontSize: "14px", fontWeight: 500 },
  navLinkActive: { padding: "8px 16px", borderRadius: "8px", color: "#f0f0f5", textDecoration: "none", fontSize: "14px", fontWeight: 500, background: "#1a1a24" },
  navRight: { display: "flex", alignItems: "center", gap: "16px" },
  iconButton: { background: "transparent", border: "none", color: "#9494a8", cursor: "pointer", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: "14px" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "32px" },
  hero: { background: "#13131a", borderRadius: "16px", padding: "40px", marginBottom: "32px", border: "1px solid #2a2a3a" },
  heroTitle: { fontSize: "32px", fontWeight: 700, marginBottom: "12px", color: "#f0f0f5", lineHeight: 1.3 },
  heroSubtitle: { fontSize: "16px", color: "#9494a8", marginBottom: "28px", lineHeight: 1.6, maxWidth: "600px" },
  heroButtons: { display: "flex", gap: "12px", flexWrap: "wrap" as const },
  buttonPrimary: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "10px", background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", color: "#fff", fontWeight: 600, fontSize: "14px", border: "none", cursor: "pointer", textDecoration: "none" },
  buttonSecondary: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "10px", background: "#10b981", color: "#fff", fontWeight: 600, fontSize: "14px", border: "none", cursor: "pointer", textDecoration: "none" },
  buttonOutline: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "10px", background: "transparent", color: "#f0f0f5", fontWeight: 600, fontSize: "14px", border: "1px solid #2a2a3a", cursor: "pointer", textDecoration: "none" },
  grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", marginBottom: "32px" },
  card: { background: "#13131a", borderRadius: "16px", padding: "24px", border: "1px solid #2a2a3a" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  cardTitle: { fontSize: "18px", fontWeight: 600, color: "#f0f0f5" },
  viewAllLink: { color: "#8b5cf6", fontSize: "14px", textDecoration: "none", fontWeight: 500 },
  activityIcon: { width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  activityTitle: { fontSize: "14px", fontWeight: 600, color: "#f0f0f5", marginBottom: "4px" },
  activityDesc: { fontSize: "13px", color: "#9494a8" },
  activityTime: { fontSize: "13px", color: "#6b6b80", whiteSpace: "nowrap" as const },
  statLabel: { fontSize: "14px", color: "#9494a8" },
  statValue: { fontSize: "32px", fontWeight: 700, color: "#f0f0f5" },
  statRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #22222e" },
  quickActions: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" },
  actionCard: { background: "#13131a", borderRadius: "16px", padding: "24px", border: "1px solid #2a2a3a", cursor: "pointer", textDecoration: "none", display: "block" },
  actionIcon: { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" },
  actionTitle: { fontSize: "15px", fontWeight: 600, color: "#f0f0f5", marginBottom: "6px" },
  actionDesc: { fontSize: "13px", color: "#9494a8" },
  emptyState: { textAlign: "center" as const, padding: "40px 20px", color: "#6b6b80" },
  fileItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#1a1a24", borderRadius: "8px", marginBottom: "8px" },
};

export default function Dashboard() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/upload");
      if (response.ok) {
        const data = await response.json();
        setFiles(Array.isArray(data) ? data : (data.files || []));
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const safeFiles = Array.isArray(files) ? files : [];
  const totalFiles = safeFiles.length;
  const categoryCounts = safeFiles.reduce((acc, file) => {
    const cat = file.aiCategory || "other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d12" }}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <div style={styles.logo}>
            <Icons.Logo />
            <span>MyPainBack</span>
          </div>
          <div style={styles.navLinks}>
            <Link href="/" style={styles.navLinkActive}>Home</Link>
            <Link href="/timeline" style={styles.navLink}>Timeline</Link>
            <Link href="/upload" style={styles.navLink}>Upload</Link>
            <Link href="/review" style={styles.navLink}>Review</Link>
            <Link href="/settings" style={styles.navLink}>Settings</Link>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.iconButton}><Icons.Bell /></button>
          <button style={styles.iconButton}><Icons.Settings /></button>
          <div style={styles.avatar}>VP</div>
        </div>
      </nav>

      <main style={styles.container}>
        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>Your complete history, organized over time</h1>
          <p style={styles.heroSubtitle}>
            Track medical records, treatments, and recovery progress in one secure place. 
            Generate comprehensive reports whenever you need them.
          </p>
          <div style={styles.heroButtons}>
            <Link href="/upload" style={styles.buttonPrimary}>
              <Icons.Upload /> Upload Files
            </Link>
            <Link href="/review" style={styles.buttonSecondary}>
              <Icons.Report /> Review AI Suggestions
            </Link>
            <button style={styles.buttonOutline}>
              <Icons.Document /> Generate Doctor-Ready Summary
            </button>
          </div>
        </section>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Recent Uploads</h2>
              <Link href="/upload" style={styles.viewAllLink}>Upload More</Link>
            </div>
            
            {loading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : safeFiles.length === 0 ? (
              <div style={styles.emptyState}>
                <Icons.Empty />
                <p style={{ marginTop: "16px", marginBottom: "8px", color: "#f0f0f5", fontWeight: 500 }}>
                  No files uploaded yet
                </p>
                <p style={{ fontSize: "13px" }}>Upload your medical records to get started</p>
                <Link href="/upload" style={{ ...styles.buttonPrimary, marginTop: "16px", display: "inline-flex" }}>
                  <Icons.Upload /> Upload Files
                </Link>
              </div>
            ) : (
              safeFiles.slice(0, 5).map((file) => {
                const catInfo = categoryInfo[file.aiCategory] || categoryInfo.other;
                return (
                  <div key={file.id} style={styles.fileItem}>
                    <div style={{ ...styles.activityIcon, background: catInfo.color + "20", color: catInfo.color, fontSize: "18px" }}>
                      {catInfo.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.activityTitle}>{file.originalFilename}</div>
                      <div style={styles.activityDesc}>{catInfo.label} • {formatFileSize(file.fileSize)}</div>
                    </div>
                    <div style={styles.activityTime}>{formatRelativeTime(file.uploadedAt)}</div>
                  </div>
                );
              })
            )}
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.cardTitle, marginBottom: "24px" }}>Overview</h2>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <span style={styles.statLabel}>Total Files</span>
              <span style={styles.statValue}>{totalFiles}</span>
            </div>

            {totalFiles > 0 ? (
              <>
                {Object.entries(categoryCounts).map(([category, count]) => {
                  const catInfo = categoryInfo[category] || categoryInfo.other;
                  return (
                    <div key={category} style={styles.statRow}>
                      <span style={{ color: "#9494a8", fontSize: "14px" }}>{catInfo.icon} {catInfo.label}</span>
                      <span style={{ color: catInfo.color, fontSize: "14px", fontWeight: 600 }}>{count}</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ color: "#6b6b80", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
                Upload files to see statistics
              </div>
            )}

            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #2a2a3a", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9494a8", fontSize: "14px" }}>Pending Review</span>
              <span style={{ color: "#eab308", fontSize: "14px", fontWeight: 500 }}>
                {safeFiles.filter(f => f.aiStatus === "pending").length} files
              </span>
            </div>
          </div>
        </div>

        <h2 style={{ ...styles.cardTitle, marginBottom: "20px" }}>Quick Actions</h2>
        <div style={styles.quickActions}>
          <Link href="/upload" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(16, 185, 129, 0.15)" }}>
              <span style={{ color: "#10b981" }}><Icons.Upload /></span>
            </div>
            <div style={styles.actionTitle}>Upload Files</div>
            <div style={styles.actionDesc}>AI extracts dates, providers, and more</div>
          </Link>
          <Link href="/review" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(139, 92, 246, 0.15)" }}>
              <span style={{ color: "#8b5cf6" }}><Icons.Report /></span>
            </div>
            <div style={styles.actionTitle}>Review AI Suggestions</div>
            <div style={styles.actionDesc}>Confirm or edit AI classifications</div>
          </Link>
          <Link href="/timeline" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(234, 179, 8, 0.15)" }}>
              <span style={{ color: "#eab308" }}><Icons.Pain /></span>
            </div>
            <div style={styles.actionTitle}>View Timeline</div>
            <div style={styles.actionDesc}>See your medical history</div>
          </Link>
          <Link href="/reports" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(59, 130, 246, 0.15)" }}>
              <span style={{ color: "#3b82f6" }}><Icons.Chart /></span>
            </div>
            <div style={styles.actionTitle}>Doctor-Ready Summary</div>
            <div style={styles.actionDesc}>Generate comprehensive report</div>
          </Link>
        </div>

        {safeFiles.length > 5 && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>All Uploaded Files</h2>
              <span style={{ color: "#6b6b80", fontSize: "14px" }}>{totalFiles} files</span>
            </div>
            {safeFiles.slice(5, 15).map((file) => {
              const catInfo = categoryInfo[file.aiCategory] || categoryInfo.other;
              return (
                <div key={file.id} style={styles.fileItem}>
                  <div style={{ ...styles.activityIcon, background: catInfo.color + "20", color: catInfo.color, fontSize: "18px" }}>
                    {catInfo.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.activityTitle}>{file.originalFilename}</div>
                    <div style={styles.activityDesc}>{catInfo.label} • {formatFileSize(file.fileSize)}</div>
                  </div>
                  <div style={styles.activityTime}>{formatRelativeTime(file.uploadedAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
