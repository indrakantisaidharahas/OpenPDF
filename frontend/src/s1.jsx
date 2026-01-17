import { useState } from "react";
import "./pdf.css";

function Pdf() {
  const [jobid, setJobid] = useState(null);
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);

  async function handler(e) {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("uploading");

    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("https://localhost:3000/context", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const json = await res.json();
      if (!json.log) return;

      setJobid(json.jobid);
      setStatus("processing");

      waitForJob(json.jobid);
    } catch {
      setStatus("error");
    }
  }

  async function waitForJob(jobid) {
    try {
      const res = await fetch(
        `https://localhost:3000/wait?jobid=${jobid}`,
        { credentials: "include" }
      );

      const json = await res.json();
      if (json.status === "done") {
        setStatus("done");
        setDownloadUrl(
          `https://localhost:3000/download?jobid=${jobid}`
        );
      } else {
        waitForJob(jobid);
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>PDF → Text Converter</h1>
        <p className="sub">
          Upload a PDF and get extracted text using OCR
        </p>

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
