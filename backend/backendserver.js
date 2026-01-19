import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { createClient } from 'redis';
import { randomBytes, createHash } from 'crypto';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import path from 'path';
import { MongoClient } from 'mongodb';
import validator from 'validator';
import {ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
//import router from "./server.js";


/* ================= CONFIG ================= */
dotenv.config()

const BASE_DIR = process.cwd();
const UPLOAD_DIR = path.join(BASE_DIR, 'uploads');
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
/* ================= APP ================= */

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors({
  origin: process.env.frontend,
  credentials: true
}));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use(limiter);


/* ================= HELPERS ================= */

const genJobId = () => randomBytes(16).toString('hex');
const genSessId = () => randomBytes(32).toString('hex');
const genUserId = () => randomBytes(16).toString('hex');

function logError(code, message) {
  return {
    status: -1,
    log: { code, message }
  };
}


/* ================= MONGO ================= */

const mongo = new MongoClient(process.env.mongodb);
await mongo.connect();

const db = mongo.db('openpdf');
const users = db.collection('users');
const jobs = db.collection('jobs');

console.log('Mongo connected');

/* ================= REDIS ================= */

//const redis = createClient({ socket: {host:process.env.redis_host,port:process.env.redis_port} });
const redis = createClient({
  url: process.env.REDIS_URL
});
//const sub = redis.duplicate();
await redis.connect();

console.log('Redis connected');
const sub = redis.duplicate();
await sub.connect();
console.log('subs connected');

/* ================= SESSION ================= */

async function checkSession(sid) {
  if (!sid) return null;
  return await redis.get(`session:${sid}`);
}

/* ================= FILE HASH ================= */

function fileHash(fpath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    fs.createReadStream(fpath)
      .on('data', d => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

/* ================= MULTER ================= */

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('INVALID_FILE'))
});

/* ================= JOB CREATION ================= */

async function createJob(userid, pdfPath) {
  const jobid = genJobId();
  const hash = await fileHash(pdfPath);
  const now = new Date();

  const existing = await redis.get(`filehash:${hash}`);
  if (existing) {
    return { jobid: existing, exist: true };
  }

  await redis.hSet(`job:${jobid}`, {
    userid,
    status: 'pending',
    path: pdfPath,
    output_path: ''
  });

  await redis.lPush('job_queue', jobid);
  await redis.zAdd(`user_jobs:${userid}`, {
    score: Date.now(),
    value: jobid
  });

  await redis.set(`filehash:${hash}`, jobid);

  await jobs.insertOne({
    jobid,
    userid,
    status: 'pending',
    input_path: pdfPath,
    output_path: null,
    file_hash: hash,
    created_at: now,
    updated_at: now
  });

  return { jobid, exist: false };
}

/* ================= ROUTES ================= */

/* ---- SIGNUP ---- */
app.post('/signin', async (req, res) => {
  const { mail, pass, uname } = req.body;

  if (!mail || !pass || !uname) {
    return res.json(logError('INVALID_INPUT', 'Missing required fields'));
  }

  /* Gmail validation */
  if (!validator.isEmail(mail) || !mail.endsWith('@gmail.com')) {
    return res.json(
      logError('INVALID_EMAIL', 'Only valid Gmail addresses are allowed')
    );
  }

  if (await users.findOne({ email: mail })) {
    return res.json(
      logError('USER_EXISTS', 'User already exists')
    );
  }

  const userid = genUserId();
  const hash = await bcrypt.hash(pass, 12);
  const sid = genSessId();

  await users.insertOne({
    userid,
    username: uname,
    email: mail,
    password_hash: hash,
    created_at: new Date()
  });

  await redis.set(`session:${sid}`, userid, { EX: 3600 });
  console.log("new user signed in");
  res.cookie('sid', sid, {
    httpOnly: true,
    secure: isProd,                 // ❌ false locally
  sameSite: isProd ? 'none' : 'lax'
  });

  res.json({ status: 1 });
});

/* ---- LOGIN ---- */
app.post('/login', async (req, res) => {
  const { mail, pass } = req.body;

  const user = await users.findOne({ email: mail });
  if (!user) {
    return res.json(
      logError('NO_USER', 'User not found')
    );
  }

  if (!(await bcrypt.compare(pass, user.password_hash))) {
    return res.json(
      logError('BAD_PASS', 'Incorrect password')
    );
  }

  const sid = genSessId();
  await redis.set(`session:${sid}`, user.userid, { EX: 3600 });

  res.cookie('sid', sid, {
    httpOnly: true,
   secure: isProd,                 
  sameSite: isProd ? 'none' : 'lax'
  });
 console.log('good guy login in');
  res.json({ status: 1 });
});

/* ---- VERIFY SESSION ---- */
app.get('/imdver', async (req, res) => {
  console.log('imd ver going on');
  const uid = await checkSession(req.cookies.sid);
  if (!uid) {
    return res.json(
      logError('NO_SESSION', 'User not logged in')
    );
  }

  const user = await users.findOne({ userid: uid });
  if (!user) {
    return res.json(
      logError('USER_DB_MISSING', 'User record missing in DB')
    );
  }

  res.json({ status: 1, uname: user.username });
});

/* ---- CREATE JOB ---- */
app.post('/context', upload.single('file'), async (req, res) => {
  const uid = await checkSession(req.cookies.sid);
  if (!uid) {
    return res.json(
      logError('NO_SESSION', 'Login required to upload file')
    );
  }

  if (!req.file) {
    return res.json(
      logError('NO_FILE', 'No PDF file uploaded')
    );
  }

  const pdfPath = req.file.path + '.pdf';
  fs.renameSync(req.file.path, pdfPath);

  const job = await createJob(uid, pdfPath);
  res.json({ status: 1, ...job });
});

/* ---- JOB STATUS ---- */
app.get('/status', async (req, res) => {
  const uid = await checkSession(req.cookies.sid);
  if (!uid) {
    return res.json(
      logError('NO_SESSION', 'Login required')
    );
  }

  const job = await redis.hGetAll(`job:${req.query.jobid}`);
  if (!job.status) {
    return res.json(
      logError('JOB_NOT_FOUND', 'Job not present in Redis')
    );
  }

  res.json({ status: 1, job_status: job.status });
});

/* ---- JOB LIST (Redis → Mongo) ---- */


app.get('/jobs', async (req, res) => {
  const uid = await checkSession(req.cookies.sid);
  if (!uid) {
    return res.json(
      logError('NO_SESSION', 'Login required')
    );
  }

  const redisJobs = await redis.zRange(`user_jobs:${uid}`, 0, 9);
  if (redisJobs.length) {
    const data = await Promise.all(
      redisJobs.map(async (id) => {
        const jobData = await redis.hGetAll(`job:${id}`);
        return { jobid: id, ...jobData };
      })
    );
    console.log("giving user his job data")
    return res.json({ status: 1, source: 'redis', jobs: data });
  }

  const mongoJobs = await jobs.find({ userid: uid })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray();

  if (!mongoJobs.length) {
    return res.json(
      logError('NO_JOBS', 'No jobs found for user')
    );
  }

  const sanitizedJobs = mongoJobs.map(j => ({
    ...j,
    _id: j._id.toString()
  }));

  res.json({ status: 1, source: 'mongo', jobs: sanitizedJobs });
});



/* ---- DOWNLOAD ---- */
app.get('/download', async (req, res) => {
  console.log('Download request for jobid:', req.query.jobid);

  const uid = await checkSession(req.cookies.sid);
  if (!uid) {
    return res.status(401).send('Login required');
  }

  const jobid = req.query.jobid;
  if (!jobid) {
    return res.status(400).send('Job ID required');
  }

  
  const job = await jobs.findOne({ jobid: jobid, userid: uid });

  console.log('Found job:', job);

  if (!job || !job.output_path) {
    return res.status(404).send('Output file not ready');
  }

  res.download(job.output_path);
});
/*-------logout-------*/
app.post('/logout', async (req, res) => {
  const sid = req.cookies.sid;
  if (sid) {
    await redis.del(`session:${sid}`); // Delete session from Redis
  }

  // Clear the cookie on client by sending expired cookie
  res.clearCookie('sid', {
    httpOnly: true,
   secure: isProd,                
  sameSite: isProd ? 'none' : 'lax'
  });

  res.json({ status: 1, message: 'Logged out successfully' });
});
/*------------- WAIT (NO POLLING) ----------------*/

// Global map to hold waiting responses

/* ================= WAIT (LONG POLLING) ================= */
const waitMap = new Map();
app.get('/wait', async (req, res) => {
  const uid = await checkSession(req.cookies.sid);
  if (!uid) {
    return res.json(
      logError('NO_SESSION', 'Login required')
    );
  }

  const { jobid } = req.query;
  if (!jobid) {
    return res.json(
      logError('NO_JOBID', 'Job ID missing')
    );
  }

  const job = await redis.hGetAll(`job:${jobid}`);
  if (!job.status || job.userid !== uid) {
    return res.json(
      logError('JOB_NOT_FOUND', 'Job not found for this user')
    );
  }

  /* already finished */
  if (job.status === 'done' || job.status === 'failed') {
    return res.json({
      status: 1,
      job_status: job.status,
      jobid
    });
  }

  /* prevent overwrite */
  if (!waitMap.has(jobid)) {
    waitMap.set(jobid, res);
  }

  /* timeout */
  setTimeout(() => {
    if (waitMap.has(jobid)) {
      waitMap.delete(jobid);
      res.json({
        status: 0,
        job_status: 'timeout',
        jobid
      });
    }
  }, 30000);
});

/* ================= REDIS SUBSCRIBER ================= */

await sub.pSubscribe('job_done:*', async (message, channel) => {
  const jobid = message;

  if (waitMap.has(jobid)) {
    const res = waitMap.get(jobid);
    waitMap.delete(jobid);

    res.json({
      status: 1,
      job_status: 'done',
      jobid
    });
  }
});


/*receiving file from worker */
app.post("/worker/result", async (req, res) => {
  try {
    const { jobid, text } = req.body;
    if (!jobid || !text) {
      return res.status(400).json({ ok: false });
    }

   // const outDir = process.env.UPLOAD_DIR|| path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const outPath = path.join(UPLOAD_DIR, `${jobid}.txt`);
    fs.writeFileSync(outPath, text);

    // update redis
    await redis.hSet(`job:${jobid}`, {
      status: "done",
      output_path: outPath
    });

    // update mongo
    await jobs.updateOne(
      { jobid },
      {
        $set: {
          status: "done",
          output_path: outPath,
          updated_at: new Date()
        }
      }
    );

    const userid = await redis.hGet(`job:${jobid}`, "userid");
    await redis.publish(`job_done:${userid}`, jobid);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});






/* ================= HTTPS ================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
