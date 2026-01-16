import { useState, useEffect } from 'react';

function Pdf() {
  const [Gfile, setGfile] = useState(null);
  const [jobid, setJobid] = useState(null);
  const [status, setStatus] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  async function handler(e) {
    const file = e.target.files[0];
    if (!file) return;

    setGfile(file);

    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('https://localhost:3000/context', {
        method: 'POST',
        credentials: 'include',  // <-- important to send cookies!
        body: data,
      });

      if (!res.ok) {
        console.log('Network error');
        return;
      }

      const json = await res.json();

      if (!json.log) {
        console.log('Not logged in or error');
        return;
      }

      setJobid(json.jobid);
      setStatus('pending');
    } catch (err) {
      console.log('Fetch/server error', err);
    }
  }

  // Poll status every 2 seconds when jobid is set
  useEffect(() => {
    if (!jobid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`https://localhost:3000/status?jobid=${jobid}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          console.log('Status fetch error');
          return;
        }
        const json = await res.json();
        setStatus(json.status);

        if (json.status === 'done') {
          clearInterval(interval);
          // Build download URL (adjust if needed)
          setDownloadUrl(`https://localhost:3000/download?jobid=${jobid}`);

        } else if (json.status === 'failed') {
          clearInterval(interval);
          console.log('Job failed');
        }
      } catch (e) {
        console.log('Status polling error', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobid]);

  return (
    <>
      <label>
        Please select the PDF you want to compress
        <input type="file" accept="application/pdf" onChange={handler} />
      </label>

      {status && <p>Status: {status}</p>}

      {downloadUrl && (
        <a href={downloadUrl} download={`result_${jobid}.txt`}>
          Download Result
        </a>
      )}
    </>
  );
}

export default Pdf;
