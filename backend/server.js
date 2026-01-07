import { spawn } from 'child_process';
import { join } from 'path';
import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';

const app = express();
const port = 3000;

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('file is not of pdf type'), false);
  }
};

const upload = multer({
  dest: 'uploads/',
  fileFilter,
  limits: {
    fileSize: 10000000
  }
});

app.use(cors());

const cred = {
  key: fs.readFileSync('/home/saidharahas/buzzdoc/key.pem'),
  cert: fs.readFileSync('/home/saidharahas/buzzdoc/cert.pem')
};

const secserv = https.createServer(cred, app);

app.post('/', upload.single('file'), (req, res) => {
  console.log("i receveid a request  ")
  const inputPath = req.file.path;
  const outputPath = inputPath + '_compressed.pdf';

  const py = spawn('/home/saidharahas/buzzdoc/venv/bin/python', [
  '/home/saidharahas/buzzdoc/compress.py',
  inputPath,
  outputPath
]);

py.stderr.on('data', data => {
  console.error(data.toString());
});

py.on('close', code => {
  if (code !== 0) {
    return res.status(500).send('Compression failed');
  }
  res.download(outputPath, () => {
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  });
});




});




app.post('/context', upload.single('file'), (req, res) => {
  const start = Date.now();
  console.log("Request received");

  const tempPath = req.file.path;
  const inputPath = tempPath + '.pdf';
  const outputPath = inputPath + '_context.txt';

  fs.renameSync(tempPath, inputPath);

  const py = spawn('/home/saidharahas/buzzdoc/venv/bin/python', [
    '/home/saidharahas/buzzdoc/pad.py',
    inputPath,
    outputPath
  ]);

  py.stderr.on('data', data => {
    console.error(data.toString());
  });

  py.on('close', code => {
    const end = Date.now();
    console.log(`Total request time: ${(end - start) / 1000}s`);

    if (code !== 0) {
      return res.status(500).send('OCR failed');
    }

    res.download(outputPath, () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});






secserv.listen(port, () => {
  console.log(`Server running on https://localhost:${port}`);
});
