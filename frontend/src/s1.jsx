import { useState } from "react";
import "./pdf.css";

function Pdf() {
  const [jobid, setJobid] = useState(null);
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [log, setLog] = useState(null);

  async function handler(e) {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("uploading");
    setLog(null);

    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("https://localhost:3000/context", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const json = await res.json();

      if (json.log === false) {
        setStatus("error");
        setLog("You are not logged in.");
        return;
      }

      if (!json.jobid) {
        setStatus("error");
        setLog(json.log || "Failed to create job");
        return;
      }

      setJobid(json.jobid);
      setStatus("processing");
      waitForJob(json.jobid);

    } catch {
      setStatus("error");
      setLog("Upload failed. Please try again.");
    }
  }

 async function waitForJob(jobid) {
  try {
    const res = await fetch(
      `https://localhost:3000/wait?jobid=${jobid}`,
      { credentials: "include" }
    );

    const json = await res.json();
    console.log("WAIT RESPONSE:", json); // 🔍 keep for now

    // ✅ job completed
    if (json.status === 1 && json.job_status === "done") {
      setStatus("done");
      setDownloadUrl(
        `https://localhost:3000/download?jobid=${jobid}`
      );
      return;
    }

    // ⏳ still running
    if (json.job_status === "timeout") {
      setTimeout(() => waitForJob(jobid), 1500);
      return;
    }

    // ❌ job failed
    if (json.job_status === "failed") {
      setStatus("error");
      setLog("Job failed during processing.");
      return;
    }

    // ❌ unexpected response
    setStatus("error");
    setLog("Unexpected server response.");

  } catch (err) {
    console.error(err);
    setStatus("error");
    setLog("Lost connection to server.");
  }
}


  return (
    <div className="page">
      <div className="card">
        <h1>PDF → Text Converter</h1>
        <p className="sub">
          Upload a PDF and get extracted text using OCR
        </p>

        {log && <div className="pdf-log error">{log}</div>}

        <label className="upload-btn">
          Upload PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={handler}
            hidden
          />
        </label>

        <Status status={status} />

        {downloadUrl && (
          <a className="download-btn" href={downloadUrl}>
            Download Result
          </a>
        )}
      </div>
    </div>
  );
}

function Status({ status }) {
  if (status === "idle") return null;

  const map = {
    uploading: "Uploading file…",
    processing: "Processing with OCR…",
    done: "Conversion complete 🎉",
    error: "Something went wrong ❌",
  };

  return <p className={`status ${status}`}>{map[status]}</p>;
}

export default Pdf;
