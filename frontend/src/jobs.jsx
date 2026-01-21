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
      a.download = `${jobId}.pdf`; // or suitable filename
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
