import { spawn } from 'child_process';
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
import {MongoClient} from 'mongodb';

const BASE_DIR = '/home/saidharahas/buzzdoc/backend';
const UPLOAD_DIR = path.join(BASE_DIR, 'uploads');

/*-------------Mongodb part---------*/
const murl="mongodb://localhost:27017/"
const dbclient= new MongoClient(murl)
await dbclient.connect();
console.log("Connected successfully to mongo db server");

    
const db = dbclient.db('openpdf');
const tb=db.collection('user');



/* ---------------- BASIC APP SETUP ---------------- */

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({
  origin: "https://localhost:5173",
  credentials: true
}));
app.use(cookieParser());

/* ---------------- ID GENERATORS ---------------- */

function genjobid() {
  return randomBytes(16).toString('hex');
}

function gensessid() {
  return randomBytes(32).toString('hex');
}

function genuserid() {
  return randomBytes(16).toString('hex');
}

/* ---------------- REDIS ---------------- */

const client = createClient({
  socket: { host: '127.0.0.1', port: 6379 }
});

client.on('error', err => console.error('Redis error:', err));
await client.connect();
console.log('Connected to Redis');

/* ---------------- FILE HASH ---------------- */

function filehash(fpath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(fpath);

    stream.on('data', data => hash.update(data));
    stream.on('error', err => reject(err));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/* ---------------- SESSION CHECK ---------------- */

// returns userid or -1
async function check(sid) {
  const valid = await client.get(`session:${sid}`);
  if (!valid) return -1;
  return valid;
}

/* ---------------- JOB PUSH ---------------- */

async function push(user, pdf) {
  const jobid = genjobid();
  const hash = await filehash(pdf);
  const now = Date.now();

  const existing = await client.get(`filehash:${hash}`);
  if (existing) {
    return { jobid: existing, exist: true };
  }

  await client.hSet(`job:${jobid}`, {
    userid: user,
    status: 'pending',
    path: pdf,
    output_path: '',
    verify: hash,
    created_at: now,
    finished_at: ''
  });

  // File hash → job mapping
  await client.set(`filehash:${hash}`, jobid);

  await client.zAdd(`user_jobs:${user}`, {
    score: now,
    value: jobid
  });

  // Enqueue for worker
  await client.lPush('job_queue', jobid);

  console.log('job pushed:', jobid);
  return { jobid, exist: false };
}




/* ---------------- GET JOB STATUS ---------------- */

async function getstat(user, jobid) {
  const owner = await client.hGet(`job:${jobid}`, 'userid');
  if (owner !== user) return -1;

  const stat = await client.hGet(`job:${jobid}`, 'status');
  return stat;
}

/* ---------------- MULTER ---------------- */

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10000000 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('file is not of pdf type'));
  }
});

/* ---------------- CONTEXT ROUTE ---------------- */


app.post('/context', upload.single('file'), async (req, res) => {
  console.log("intiaising text file covnerion support")
  const sid = req.cookies.sid;
  const user = await check(sid);

  if (user === -1) {
    return res.json({ log: false, jobid: -1, exist: false });
  }

  const tempPath = req.file.path;
  const inputPath = tempPath + '.pdf';
  fs.renameSync(tempPath, inputPath);

  const result = await push(user, inputPath);

  res.json({
    log: true,
    jobid: result.jobid,
    exist: result.exist
  });
});

/* ---------------- STATUS ROUTE ---------------- */

app.get('/status', async (req, res) => {
  console.log("checking job status")
  const sid = req.cookies.sid;
  const user = await check(sid);

  if (user === -1) return res.status(401).json({ status: -1 });

  const jobid = req.query.jobid;
  const stat = await getstat(user, jobid);
  res.json({ status: stat });
});

/* ---------------- SIGNIN ---------------- */

app.post('/signin', async (req, res) => {
  console.log("sigin is happending")
  const { mail, pass, uname } = req.body;

  const exists = await client.exists(`user:${mail}`);
  if (exists) {
    return res.json({ status: false });
  }

  const uid = genuserid();
  const sid = gensessid();
  const hash = await bcrypt.hash(pass, 12);

  await client.hSet(`user:${mail}`, {
    uid: uid,
    pass: hash
  });
  await tb.insertOne({ userid: uid, username: uname });  // <-- fixed

  await client.set(`session:${sid}`, uid, { EX: 3600 });

  res.cookie('sid', sid, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  res.json({ status: true });
});

/*------------immediate verifcation----------*/
app.get('/imdver', async (req, res) => {
  console.log("imdver is happening ")
  const sid = req.cookies.sid;  // use cookie, not body
  const user = await check(sid);
  if (user === -1) return res.status(401).json({ status: -1 });

  const userDoc = await tb.findOne({ userid: user });
  res.json({
    uname: userDoc?.username || null
  });
});








/* ---------------- LOGIN ---------------- */

app.post('/login', async (req, res) => {
  const { mail, pass } = req.body;
   console.log("login request ")
  const user = await client.hGetAll(`user:${mail}`);
  if (!user.uid) return res.json({ status: false });

  const ok = await bcrypt.compare(pass, user.pass);
  if (!ok) return res.json({ status: false });

  const sid = gensessid();
  await client.set(`session:${sid}`, user.uid, { EX: 3600 });

  res.cookie('sid', sid, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  res.json({ status: true });
});


/*------download--------*/
app.get('/download', async (req, res) => {
    const sid = req.cookies.sid;
  const user = await check(sid);

  if (user === -1) return res.status(401).json({ status: -1 });
  const jobid = req.query.jobid;
  const output_path = await client.hGet(`job:${jobid}`, 'output_path');

  if (!output_path || output_path === '') {
    return res.status(404).send('File not ready');
  }

  res.download(output_path, `result_${jobid}.txt`);
});


/*--------user jobs history construction-------*/
app.get('/jobs', async (req, res) => {
  const sid = req.cookies.sid;
  const user = await check(sid);

  if (user === -1) {
    return res.status(401).json({ status: -1 });
  }

  const jobIds = await client.zRevRange(`user:${user}:jobs`, 0, 9);

  if (jobIds.length === 0) {
    return res.json({ jobids: [], info: [] });
  }

  const jobs = await Promise.all(
    jobIds.map(id => client.hGetAll(`job:${id}`))
  );

  res.json({
    jobids: jobIds,
    info: jobs
  });
});








/* ---------------- HTTPS SERVER ---------------- */

const cred = {
  key: fs.readFileSync('/home/saidharahas/buzzdoc/key.pem'),
  cert: fs.readFileSync('/home/saidharahas/buzzdoc/cert.pem')
};

const secserv = https.createServer(cred, app);

secserv.listen(port, () => {
  console.log(`Server running on https://localhost:${port}`);
});


