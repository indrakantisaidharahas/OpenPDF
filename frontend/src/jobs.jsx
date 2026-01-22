import { useEffect, useState } from "react";
import "./jobs.css";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);

  useEffect(() => {
    fetch(import.meta.env.VITE_JOBS, {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === -1) {
          setLog(data.log || "Something went wrong");
          setLoading(false);
          return;
        }
        
        if (!data.jobs || !Array.isArray(data.jobs)) {
          setLog("Invalid data format from server");
          setLoading(false);
          return;
        }
        
        setJobs(data.jobs);
        setLoading(false);
      })
      .catch(() => {
        setLog("Server unreachable. Please try again.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="jobs-page">
      <h1>Your Jobs</h1>
      {loading && <p>Loading jobs…</p>}
      {log && (
        <div className="job-log error">
          ⚠ {log}
        </div>
      )}
      {!loading && !log && jobs.length === 0 && (
        <p className="empty">No jobs yet</p>
      )}
      <div className="job-list">
        {jobs.map((job, index) => (
          <JobCard key={job.jobid || index} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job }) {
  const jobId = job.jobid || job._id || "unknown";

  const handleDownload = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_DEST}/download?jobid=${jobId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        alert('Download failed: ' + res.statusText);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobId}.txt`; // or suitable filename
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download error: ' + err.message);
    }
  };

  return (
    <div className={`job-card ${job.status}`}>
      <div>
        <p className="job-id">
          Job ID: <span>{jobId.toString().slice(0, 8)}…</span>
        </p>
        <p className={`job-status ${job.status}`}>
          {job.status ? job.status.toUpperCase() : "UNKNOWN"}
        </p>
      </div>
      {job.status === "done" && job.output_path && (
        <button className="job-download" onClick={handleDownload}>
          Download
        </button>
      )}
      {job.status === "failed" && (
        <p className="job-failed">
          ❌ Processing failed. Try again.
        </p>
      )}
    </div>
  );
}


export default Jobs;