import { useEffect, useState } from "react";
import "./jobs.css";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://localhost:3000/jobs", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        setJobs(
          data.jobids.map((id, i) => ({
            id,
            ...data.info[i],
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="jobs-page">
      <h1>Your Jobs</h1>

      {loading && <p>Loading jobs…</p>}

      {!loading && jobs.length === 0 && (
        <p className="empty">No jobs yet</p>
      )}

      <div className="job-list">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job }) {
  return (
    <div className="job-card">
      <div>
        <p className="job-id">
          Job ID: <span>{job.id.slice(0, 8)}…</span>
        </p>

        <p className={`job-status ${job.status}`}>
          {job.status.toUpperCase()}
        </p>
      </div>

      {job.status === "done" && (
        <a
          className="job-download"
          href={`https://localhost:3000/download?jobid=${job.id}`}
        >
          Download
        </a>
      )}
    </div>
  );
}

export default Jobs;
