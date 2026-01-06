"use client";

import { useState, useEffect, use } from "react";

// Type definition for a StudyFile (matches what the API returns)
interface StudyFile {
  id: string;
  studyId: string;
  fileType: string;
  originalFilename: string;
  storagePath: string;
  uploadedAt: string;
}

// Study Detail Page Component
export default function StudyDetailPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = use(params);

  // State to hold the list of files
  const [files, setFiles] = useState<StudyFile[]>([]);
  // State to track if we're currently loading files
  const [loading, setLoading] = useState(true);
  // State to track if we're currently uploading
  const [uploading, setUploading] = useState(false);
  // State for form inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("image_png");

  // Fetch files when the component loads
  useEffect(() => {
    fetchFiles();
  }, [studyId]);

  // Function to fetch the list of files from the API
  async function fetchFiles() {
    try {
      setLoading(true);
      const response = await fetch(`/api/studies/${studyId}/files`);
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
      alert("Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  // Function to handle file upload
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault(); // Prevent page refresh

    // Validate that a file was selected
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    try {
      setUploading(true);

      // Create FormData object (required for file uploads)
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("fileType", fileType);

      // Send POST request to upload the file
      const response = await fetch(`/api/studies/${studyId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      // Reset the form
      setSelectedFile(null);
      setFileType("image_png");
      
      // Refresh the file list to show the new file
      await fetchFiles();

      alert("File uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Study Files</h1>
      <p>Study ID: {studyId}</p>

      {/* File Upload Form */}
      <div style={{ marginBottom: "40px", padding: "20px", border: "1px solid #ccc", borderRadius: "4px" }}>
        <h2>Upload File</h2>
        <form onSubmit={handleUpload}>
          {/* File input */}
          <div style={{ marginBottom: "10px" }}>
            <label>
              File:{" "}
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </label>
          </div>

          {/* File type selector */}
          <div style={{ marginBottom: "10px" }}>
            <label>
              File Type:{" "}
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                disabled={uploading}
              >
                <option value="image_png">PNG Image</option>
                <option value="pdf">PDF</option>
                <option value="dicom_zip">DICOM ZIP</option>
              </select>
            </label>
          </div>

          {/* Upload button */}
          <button type="submit" disabled={uploading || !selectedFile}>
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </form>
      </div>

      {/* Files List */}
      <div>
        <h2>Uploaded Files</h2>
        {loading ? (
          <p>Loading files...</p>
        ) : files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((file) => (
              <li
                key={file.id}
                style={{
                  padding: "10px",
                  marginBottom: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                <strong>{file.originalFilename}</strong>
                <br />
                Type: {file.fileType}
                <br />
                Uploaded: {new Date(file.uploadedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
