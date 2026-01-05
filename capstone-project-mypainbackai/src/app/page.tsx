"use client";

import Link from "next/link";

// Icon components for a cleaner look
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
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="14" height="13" rx="2" />
      <path d="M2 7h14M6 1v4M12 1v4" strokeLinecap="round" />
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
  Pill: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12.5 5.5l-7 7a2.5 2.5 0 103.5 3.5l7-7a2.5 2.5 0 10-3.5-3.5z" />
      <path d="M9 9l3.5-3.5" />
    </svg>
  ),
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 16h14M5 13V9M9 13V5M13 13V8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  MRI: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="9" r="7" />
      <circle cx="9" cy="9" r="3" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2" strokeLinecap="round" />
    </svg>
  ),
  Doctor: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="5" r="3" />
      <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M9 11v3M7 13h4" strokeLinecap="round" />
    </svg>
  ),
};

// Styles object for consistent theming
const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid #2a2a3a",
    background: "#0d0d12",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  navLeft: {
    display: "flex",
    alignItems: "center",
    gap: "32px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: 700,
    fontSize: "18px",
    color: "#f0f0f5",
  },
  navLinks: {
    display: "flex",
    gap: "8px",
  },
  navLink: {
    padding: "8px 16px",
    borderRadius: "8px",
    color: "#9494a8",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s",
  },
  navLinkActive: {
    padding: "8px 16px",
    borderRadius: "8px",
    color: "#f0f0f5",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    background: "#1a1a24",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  iconButton: {
    background: "transparent",
    border: "none",
    color: "#9494a8",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px",
  },
  hero: {
    background: "#13131a",
    borderRadius: "16px",
    padding: "40px",
    marginBottom: "32px",
    border: "1px solid #2a2a3a",
  },
  heroTitle: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "12px",
    color: "#f0f0f5",
    lineHeight: 1.3,
  },
  heroSubtitle: {
    fontSize: "16px",
    color: "#9494a8",
    marginBottom: "28px",
    lineHeight: 1.6,
    maxWidth: "600px",
  },
  heroButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap" as const,
  },
  buttonPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.2s",
  },
  buttonSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    background: "#10b981",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.2s",
  },
  buttonOutline: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    background: "transparent",
    color: "#f0f0f5",
    fontWeight: 600,
    fontSize: "14px",
    border: "1px solid #2a2a3a",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.2s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: "24px",
    marginBottom: "32px",
  },
  card: {
    background: "#13131a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a3a",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#f0f0f5",
  },
  viewAllLink: {
    color: "#8b5cf6",
    fontSize: "14px",
    textDecoration: "none",
    fontWeight: 500,
  },
  activityItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "8px",
    transition: "all 0.2s",
    cursor: "pointer",
    border: "1px solid transparent",
  },
  activityIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f0f0f5",
    marginBottom: "4px",
  },
  activityDesc: {
    fontSize: "13px",
    color: "#9494a8",
  },
  activityTime: {
    fontSize: "13px",
    color: "#6b6b80",
    whiteSpace: "nowrap" as const,
  },
  statLabel: {
    fontSize: "14px",
    color: "#9494a8",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#f0f0f5",
  },
  progressBar: {
    height: "8px",
    borderRadius: "4px",
    background: "#2a2a3a",
    marginTop: "8px",
    marginBottom: "24px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "4px",
    background: "linear-gradient(90deg, #8b5cf6 0%, #10b981 100%)",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #22222e",
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "32px",
  },
  actionCard: {
    background: "#13131a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a3a",
    cursor: "pointer",
    transition: "all 0.2s",
    textDecoration: "none",
    display: "block",
  },
  actionIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  actionTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#f0f0f5",
    marginBottom: "6px",
  },
  actionDesc: {
    fontSize: "13px",
    color: "#9494a8",
  },
  timelineItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "12px",
    background: "#1a1a24",
    border: "1px solid #2a2a3a",
  },
  timelineIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tag: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    marginRight: "8px",
    marginTop: "8px",
  },
};

export default function Dashboard() {
  const recentActivity = [
    { icon: <Icons.Report />, iconBg: "#8b5cf6", title: "Physical Therapy Session", desc: "Added to timeline with progress notes", time: "2 hours ago" },
    { icon: <Icons.File />, iconBg: "#10b981", title: "MRI Scan Results", desc: "Uploaded • 2.4 MB PDF", time: "Yesterday" },
    { icon: <Icons.Document />, iconBg: "#f97066", title: "6-Month Summary Report", desc: "Generated and exported to PDF", time: "3 days ago" },
    { icon: <Icons.Pill />, iconBg: "#f97066", title: "Medication Update", desc: "Changed dosage for pain management", time: "5 days ago" },
  ];

  const timelineItems = [
    { icon: <Icons.Doctor />, iconBg: "#3b82f6", title: "Doctor Visit - Orthopedic Specialist", desc: "Follow-up consultation for knee recovery progress", date: "Jan 15, 2025", tags: [{ label: "Doctor Visit", color: "#3b82f6" }], files: "2 files attached" },
    { icon: <Icons.MRI />, iconBg: "#10b981", title: "MRI Scan", desc: "Knee imaging to assess healing progress", date: "Jan 10, 2025", tags: [{ label: "Imaging", color: "#10b981" }], files: "1 file attached" },
    { icon: <Icons.Pill />, iconBg: "#f97066", title: "Medication Change", desc: "Reduced pain medication dosage", date: "Jan 5, 2025", tags: [{ label: "Medication", color: "#f97066" }], files: null },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d12" }}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <div style={styles.logo}><Icons.Logo /><span>MyPainBack</span></div>
          <div style={styles.navLinks}>
            <Link href="/" style={styles.navLinkActive}>Home</Link>
            <Link href="/timeline" style={styles.navLink}>Timeline</Link>
            <Link href="/files" style={styles.navLink}>Files</Link>
            <Link href="/reports" style={styles.navLink}>Reports</Link>
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
          <p style={styles.heroSubtitle}>Track medical records, treatments, and recovery progress in one secure place. Generate comprehensive reports whenever you need them.</p>
          <div style={styles.heroButtons}>
            <button style={styles.buttonPrimary}><Icons.Plus /> Add to Timeline</button>
            <Link href="/studies/test-study-1" style={styles.buttonSecondary}><Icons.Upload /> Upload Files</Link>
            <button style={styles.buttonOutline}><Icons.Document /> Generate Overview</button>
          </div>
        </section>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Recent Activity</h2>
              <Link href="/activity" style={styles.viewAllLink}>View All</Link>
            </div>
            {recentActivity.map((item, idx) => (
              <div key={idx} style={{ ...styles.activityItem, background: "#1a1a24" }}>
                <div style={{ ...styles.activityIcon, background: item.iconBg, color: "#fff" }}>{item.icon}</div>
                <div style={styles.activityContent}>
                  <div style={styles.activityTitle}>{item.title}</div>
                  <div style={styles.activityDesc}>{item.desc}</div>
                </div>
                <div style={styles.activityTime}>{item.time}</div>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.cardTitle, marginBottom: "24px" }}>Overview</h2>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={styles.statLabel}>History Tracked</span>
              <span style={styles.statValue}>3.5 <span style={{ fontSize: "18px", fontWeight: 500 }}>years</span></span>
            </div>
            <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: "70%" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={styles.statLabel}>Files Uploaded</span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#f0f0f5" }}>127</span>
            </div>
            <div style={styles.statRow}><span style={{ color: "#9494a8", fontSize: "14px" }}>Medical Records</span><span style={{ color: "#f0f0f5", fontSize: "14px", fontWeight: 600 }}>45</span></div>
            <div style={styles.statRow}><span style={{ color: "#9494a8", fontSize: "14px" }}>Test Results</span><span style={{ color: "#f0f0f5", fontSize: "14px", fontWeight: 600 }}>38</span></div>
            <div style={styles.statRow}><span style={{ color: "#9494a8", fontSize: "14px" }}>Imaging</span><span style={{ color: "#f0f0f5", fontSize: "14px", fontWeight: 600 }}>22</span></div>
            <div style={{ ...styles.statRow, borderBottom: "none" }}><span style={{ color: "#9494a8", fontSize: "14px" }}>Other</span><span style={{ color: "#f0f0f5", fontSize: "14px", fontWeight: 600 }}>22</span></div>
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #2a2a3a", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9494a8", fontSize: "14px" }}>Last Updated</span>
              <span style={{ color: "#10b981", fontSize: "14px", fontWeight: 500 }}>2 hours ago</span>
            </div>
          </div>
        </div>

        <h2 style={{ ...styles.cardTitle, marginBottom: "20px" }}>Quick Actions</h2>
        <div style={styles.quickActions}>
          <Link href="/timeline/new" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(139, 92, 246, 0.15)" }}><span style={{ color: "#8b5cf6" }}><Icons.Calendar /></span></div>
            <div style={styles.actionTitle}>Log an Event</div>
            <div style={styles.actionDesc}>Add a new entry to your timeline</div>
          </Link>
          <Link href="/studies/test-study-1" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(16, 185, 129, 0.15)" }}><span style={{ color: "#10b981" }}><Icons.Upload /></span></div>
            <div style={styles.actionTitle}>Upload Document</div>
            <div style={styles.actionDesc}>Add medical records or test results</div>
          </Link>
          <Link href="/treatments/new" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(249, 112, 102, 0.15)" }}><span style={{ color: "#f97066" }}><Icons.Pill /></span></div>
            <div style={styles.actionTitle}>Add Treatment</div>
            <div style={styles.actionDesc}>Log medication or therapy session</div>
          </Link>
          <Link href="/reports/generate" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, background: "rgba(59, 130, 246, 0.15)" }}><span style={{ color: "#3b82f6" }}><Icons.Chart /></span></div>
            <div style={styles.actionTitle}>Generate Summary</div>
            <div style={styles.actionDesc}>Create a comprehensive report</div>
          </Link>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Timeline Preview</h2>
            <Link href="/timeline" style={{ ...styles.viewAllLink, display: "flex", alignItems: "center", gap: "6px" }}>View Full Timeline <Icons.ArrowRight /></Link>
          </div>
          {timelineItems.map((item, idx) => (
            <div key={idx} style={styles.timelineItem}>
              <div style={{ ...styles.timelineIcon, background: item.iconBg, color: "#fff" }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f5", marginBottom: "6px" }}>{item.title}</div>
                    <div style={{ fontSize: "14px", color: "#9494a8" }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b6b80", whiteSpace: "nowrap" }}>{item.date}</div>
                </div>
                <div style={{ marginTop: "8px" }}>
                  {item.tags.map((tag, tagIdx) => (<span key={tagIdx} style={{ ...styles.tag, background: tag.color + "20", color: tag.color }}>{tag.label}</span>))}
                  {item.files && <span style={{ fontSize: "12px", color: "#6b6b80" }}>{item.files}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
