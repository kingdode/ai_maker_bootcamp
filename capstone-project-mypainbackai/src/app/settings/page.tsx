"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ApiKeyStatus {
  configured: boolean;
  maskedKey: string | null;
  message: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check API key status from server
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/settings/status");
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error("Failed to check API key status:", error);
        setStatus({
          configured: false,
          maskedKey: null,
          message: "Failed to check API key status",
        });
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  return (
    <div style={styles.page}>
      <Link href="/" style={styles.backLink}>← Back to Dashboard</Link>
      
      <h1 style={styles.title}>Settings</h1>
      <p style={styles.subtitle}>Configure your AI integrations and preferences</p>

      {/* OpenAI API Key Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardIcon}>🤖</div>
          <div>
            <h2 style={styles.cardTitle}>OpenAI API Key</h2>
            <p style={styles.cardDesc}>
              Required for automatic file classification and metadata extraction
            </p>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <span>Checking configuration...</span>
          </div>
        ) : status?.configured ? (
          <div style={styles.statusBox}>
            <div style={styles.statusIcon}>✓</div>
            <div>
              <div style={styles.statusTitle}>API Key Configured</div>
              <code style={styles.maskedKey}>{status.maskedKey}</code>
            </div>
          </div>
        ) : (
          <div style={styles.warningBox}>
            <div style={styles.warningIcon}>⚠️</div>
            <div>
              <div style={styles.warningTitle}>API Key Not Configured</div>
              <p style={styles.warningText}>
                To enable AI features, add your OpenAI API key to the <code style={styles.codeInline}>.env.local</code> file:
              </p>
              <pre style={styles.codeBlock}>
{`# .env.local
OPENAI_API_KEY="sk-proj-your-key-here"`}
              </pre>
              <p style={styles.warningHint}>
                Get your API key from{" "}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  platform.openai.com
                </a>
              </p>
            </div>
          </div>
        )}

        <div style={styles.securityNote}>
          <span style={styles.securityIcon}>🔒</span>
          <span>
            Your API key is stored securely on the server and never exposed to the browser.
          </span>
        </div>
      </div>

      {/* AI Features Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>What AI Can Do</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>📄</span>
            <div>
              <strong>Automatic Classification</strong>
              <p style={styles.featureDesc}>
                AI categorizes files as imaging, visit notes, PT records, medications, lab results, or billing
              </p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>📅</span>
            <div>
              <strong>Date Extraction</strong>
              <p style={styles.featureDesc}>
                Automatically extracts dates from document content
              </p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>🏥</span>
            <div>
              <strong>Provider Detection</strong>
              <p style={styles.featureDesc}>
                Identifies healthcare providers, facilities, and doctors
              </p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}>🦴</span>
            <div>
              <strong>Body Region Identification</strong>
              <p style={styles.featureDesc}>
                Detects which body parts are referenced (spine, knee, shoulder, etc.)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Environment Variables</h2>
        <p style={styles.envDesc}>
          This application uses environment variables for sensitive configuration. 
          Create a <code style={styles.codeInline}>.env.local</code> file in the project root with:
        </p>
        <pre style={styles.codeBlock}>
{`# Database URL for Prisma
DATABASE_URL="file:./dev.db"

# OpenAI API Key
OPENAI_API_KEY="sk-proj-your-key-here"`}
        </pre>
        <p style={styles.envNote}>
          <strong>Note:</strong> The <code style={styles.codeInline}>.env.local</code> file is gitignored 
          and should never be committed to version control.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d0d12",
    padding: "32px",
    maxWidth: "700px",
    margin: "0 auto",
  },
  backLink: {
    color: "#8b5cf6",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    display: "inline-block",
    marginBottom: "24px",
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
    marginBottom: "32px",
  },
  card: {
    background: "#13131a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a3a",
    marginBottom: "24px",
  },
  cardHeader: {
    display: "flex",
    gap: "16px",
    marginBottom: "24px",
  },
  cardIcon: {
    fontSize: "32px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#f0f0f5",
    marginBottom: "4px",
  },
  cardDesc: {
    fontSize: "14px",
    color: "#9494a8",
    margin: 0,
  },
  loadingBox: {
    padding: "16px",
    background: "#1a1a24",
    borderRadius: "8px",
    color: "#9494a8",
    fontSize: "14px",
  },
  statusBox: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid #10b981",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  statusIcon: {
    fontSize: "24px",
    color: "#10b981",
  },
  statusTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#10b981",
    marginBottom: "4px",
  },
  maskedKey: {
    fontSize: "13px",
    color: "#9494a8",
    background: "#1a1a24",
    padding: "4px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  warningBox: {
    display: "flex",
    gap: "16px",
    padding: "16px",
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid #eab308",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  warningIcon: {
    fontSize: "24px",
  },
  warningTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#eab308",
    marginBottom: "8px",
  },
  warningText: {
    fontSize: "14px",
    color: "#9494a8",
    margin: "0 0 12px 0",
  },
  warningHint: {
    fontSize: "13px",
    color: "#6b6b80",
    margin: 0,
  },
  codeInline: {
    background: "#1a1a24",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "monospace",
    color: "#f0f0f5",
  },
  codeBlock: {
    background: "#1a1a24",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "monospace",
    color: "#f0f0f5",
    overflow: "auto",
    margin: "12px 0",
    whiteSpace: "pre",
  },
  link: {
    color: "#8b5cf6",
    textDecoration: "underline",
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    background: "#1a1a24",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#9494a8",
  },
  securityIcon: {
    fontSize: "16px",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  featureItem: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  featureIcon: {
    fontSize: "24px",
  },
  featureDesc: {
    fontSize: "13px",
    color: "#9494a8",
    margin: "4px 0 0 0",
  },
  envDesc: {
    fontSize: "14px",
    color: "#9494a8",
    marginTop: "8px",
  },
  envNote: {
    fontSize: "13px",
    color: "#6b6b80",
    margin: 0,
  },
};
