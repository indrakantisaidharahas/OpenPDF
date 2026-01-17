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
import { MongoClient } from 'mongodb';

const BASE_DIR = '/home/saidharahas/buzzdoc/backend';
const UPLOAD_DIR = path.join(BASE_DIR, 'uploads');

/*------------- MONGODB ----------------*/
const murl = "mongodb://localhost:27017/";
const dbclient = new MongoClient(murl);
await dbclient.connect();
console.log("Connected successfully to mongo db server");

const db = dbclient.db('openpdf');
const tb = db.collection('user');

/*------------- APP SETUP ----------------*/
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({
  origin: "https://localhost:5173",
  credentials: true
}));
app.use(cookieParser());

/*------------- ID GENERATORS ----------------*/
const genjobid = () => randomBytes(16).toString('hex');
const gensessid = () => randomBytes(32).toString('hex');
const genuserid = () => randomBytes(16).toString('hex');

/*------------- REDIS ----------------*/
const client = createClient({
  socket: { host: '127.0.0.1', port: 6379 }
});
client.on('error', err => console.error('Redis error:', err));
await client.connect();
console.log('Connected to Redis');

/*------------- WAIT MAP + SUBSCRIBER ----------------*/
const waitMap = new Map();

const sub = client.duplicate();
await sub.connect();

await sub.pSubscribe('job_done:*', async (message, channel) => {
  const jobid = message;
  if (waitMap.has(jobid)) {
    const res = waitMap.get(jobid);
    waitMap.delete(jobid);
    res.json({ status: 'done', jobid });
  }
});

/*------------- FILE HASH ----------------*/
function filehash(fpath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(fpath);
    stream.on('data', d => hash.update(d));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/*------------- SESSION CHECK ----------------*/
async function check(sid) {
  const uid = await client.get(`session:${sid}`);
  return uid ? uid : -1;
}

/*------------- JOB PUSH ----------------*/
async function push(user, pdf) {
  const jobid = genjobid();
  const hash = await filehash(pdf);
  const now = Date.now();

  const existing = await client.get(`filehash:${hash}`);
  if (existing) return { jobid: existing, exist: true };

  await client.hSet(`job:${jobid}`, {
    userid: user,
    status: 'pending',
    path: pdf,
    output_path: '',
    verify: hash,
    created_at: now
  });

  await client.set(`filehash:${hash}`, jobid);
  await client.zAdd(`user_jobs:${user}`, { score: now, value: jobid });
  await client.lPush('job_queue', jobid);

  return { jobid, exist: false };
}

/*------------- MULTER ----------------*/
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10000000 },
  fileFilter: (req, file, cb) => {
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Not PDF'));
  }
});

/*------------- CONTEXT ----------------*/
app.post('/context', upload.single('file'), async (req, res) => {
  const user = await check(req.cookies.sid);
  if (user === -1) return res.json({ log: false });

  const pdfPath = req.file.path + '.pdf';
  fs.renameSync(req.file.path, pdfPath);

  const result = await push(user, pdfPath);
  res.json({ log: true, jobid: result.jobid, exist: result.exist });
});

/*------------- WAIT (NO POLLING) ----------------*/
app.get('/wait', async (req, res) => {
  const user = await check(req.cookies.sid);
  if (user === -1) return res.sendStatus(401);

  const { jobid } = req.query;
  const status = await client.hGet(`job:${jobid}`, 'status');

  if (status === 'done') return res.json({ status: 'done', jobid });

  waitMap.set(jobid, res);
  setTimeout(() => {
    if (waitMap.has(jobid)) {
      waitMap.delete(jobid);
      res.json({ status: 'timeout' });
    }
  }, 30000);
});

/*------------- STATUS ----------------*/
app.get('/status', async (req, res) => {
  const user = await check(req.cookies.sid);
  if (user === -1) return res.status(401).json({ status: -1 });

  const stat = await client.hGet(`job:${req.query.jobid}`, 'status');
  res.json({ status: stat });
});

/*------------- signin ----------------*/
app.post('/signin', async (req, res) => {
  const { mail, pass, uname } = req.body;
  if (await client.exists(`user:${mail}`)) return res.json({ status: false });

  const uid = genuserid();
  const sid = gensessid();
  const hash = await bcrypt.hash(pass, 12);

  await client.hSet(`user:${mail}`, { uid, pass: hash });
  await tb.insertOne({ userid: uid, username: uname });
  await client.set(`session:${sid}`, uid, { EX: 3600 });

  res.cookie('sid', sid, { httpOnly: true, secure: true, sameSite: 'strict' });
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
/*------------- login----------------*/
app.post('/login', async (req, res) => {
  const user = await client.hGetAll(`user:${req.body.mail}`);
  if (!user.uid) return res.json({ status: false });

  if (!(await bcrypt.compare(req.body.pass, user.pass)))
    return res.json({ status: false });

  const sid = gensessid();
  await client.set(`session:${sid}`, user.uid, { EX: 3600 });

  res.cookie('sid', sid, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ status: true });
});

/*------------- JOBS ----------------*/
app.get('/jobs', async (req, res) => {
  const user = await check(req.cookies.sid);
  if (user === -1) return res.sendStatus(401);

  const jobIds = await client.zRange(`user_jobs:${user}`, 0, 9);
  const jobs = await Promise.all(jobIds.map(id => client.hGetAll(`job:${id}`)));
  res.json({ jobids: jobIds, info: jobs });
});

/*------------- DOWNLOAD ----------------*/
app.get('/download', async (req, res) => {
  const user = await check(req.cookies.sid);
  if (user === -1) return res.sendStatus(401);

  const pathOut = await client.hGet(`job:${req.query.jobid}`, 'output_path');
  if (!pathOut) return res.sendStatus(404);

  res.download(pathOut);
});

/*------------- HTTPS ----------------*/
const cred = {
  key: fs.readFileSync('/home/saidharahas/buzzdoc/key.pem'),
  cert: fs.readFileSync('/home/saidharahas/buzzdoc/cert.pem')
};

https.createServer(cred, app).listen(port, () =>
  console.log(`Server running https://localhost:${port}`)
);
