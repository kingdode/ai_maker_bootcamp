"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Load saved API key from localStorage
    const stored = localStorage.getItem("openai_api_key");
    if (stored) {
      setSavedKey(stored);
      setApiKey(stored);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Validate the API key by making a test request
      const response = await fetch("/api/settings/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("openai_api_key", apiKey);
        setSavedKey(apiKey);
        setMessage({ type: "success", text: "API key saved and validated successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Invalid API key" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to validate API key" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem("openai_api_key");
    setApiKey("");
    setSavedKey("");
    setMessage({ type: "success", text: "API key removed" });
  };

  const maskKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 7) + "••••••••" + key.slice(-4);
  };

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

        {savedKey && (
          <div style={styles.savedKeyBox}>
            <span style={styles.savedKeyLabel}>Current key:</span>
            <code style={styles.savedKeyValue}>{maskKey(savedKey)}</code>
            <span style={styles.savedKeyStatus}>✓ Active</span>
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-proj-..."
            style={styles.input}
          />
          <p style={styles.inputHint}>
            Get your API key from{" "}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={styles.link}>
              platform.openai.com
            </a>
          </p>
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

        <div style={styles.buttonRow}>
          <button
            onClick={handleSave}
            disabled={saving || !apiKey}
            style={{
              ...styles.buttonPrimary,
              opacity: saving || !apiKey ? 0.5 : 1,
            }}
          >
            {saving ? "Validating..." : "Save API Key"}
          </button>
          {savedKey && (
            <button onClick={handleClear} style={styles.buttonDanger}>
              Remove Key
            </button>
          )}
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
  savedKeyBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "rgba(16, 185, 129, 0.1)",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  savedKeyLabel: {
    fontSize: "14px",
    color: "#9494a8",
  },
  savedKeyValue: {
    fontSize: "13px",
    color: "#f0f0f5",
    background: "#1a1a24",
    padding: "4px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  savedKeyStatus: {
    fontSize: "13px",
    color: "#10b981",
    marginLeft: "auto",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: 500,
    color: "#f0f0f5",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "14px",
    background: "#1a1a24",
    border: "1px solid #2a2a3a",
    borderRadius: "8px",
    color: "#f0f0f5",
    outline: "none",
  },
  inputHint: {
    fontSize: "13px",
    color: "#6b6b80",
    marginTop: "8px",
  },
  link: {
    color: "#8b5cf6",
    textDecoration: "underline",
  },
  message: {
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
  },
  buttonPrimary: {
    padding: "12px 24px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
  },
  buttonDanger: {
    padding: "12px 24px",
    borderRadius: "8px",
    background: "transparent",
    color: "#ef4444",
    fontWeight: 600,
    fontSize: "14px",
    border: "1px solid #ef4444",
    cursor: "pointer",
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
};

