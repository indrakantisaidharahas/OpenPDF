import { spawn } from 'child_process';
import { join } from 'path';
import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { createClient } from 'redis';
import {randomBytes} from 'crypto';
import { createHash } from 'crypto';


app.use(express.json())
function genjobid(){
  return randomBytes(16).toString('hex');
}
function gensessid(){
  return randomBytes(17).toString('hex');
}
function genuserid(){
  return randomBytes(18).toString('hex');
}





const client = createClient({
  socket: {
    host: '127.0.0.1',
    port: 6379
  }
});

client.on('error', (err) => console.error('Redis error:', err));
await client.connect();
console.log('Connected to Redis1');

/// handlig  redis 
// so redis here handles job queue 
// so it can check stu of the job 
// we need three finction  
// one forsetting the job here red must have the location where the df is stored
//ohter is knowi thus of job 
//so we will the user id as key 
// he wil; have further 2 keys and wiht ter vlues as statuses
//one other proes for lgoin hndling 


//priblme is how shhould the job quue be 
// like it shoul be ofortable for wo sides
//for users i need to have fo user id 
// bu for fast api i need to have a key of status 
// so should i make both vectors
// fits scneario be likee user id , {pdf name,staus} 
//{status , user id pdf name }
//

async function run() {
  await client.set('key', '123');
  const value = await client.get('key');
  console.log('VALUE:', value);

  //await client.quit();
}
// async function push(user,pdf,bobj){
//   //await client.connect();
//  // console.log('connecte to push')
//   await client.lpush(user+'a',pdf)
//   await client.lpush(user+'b',bobj)
//   console.log(user+"and his pdf "+pdf +"have been pushed")
//   sstat(pdf,"pend")
//   //await client.quit();

// }
// async function sstat(pdf,status){
// await client.set(pdf,status)
// console.log(pdf+"has been give the status"+status)

// }

// async function check(user,bobj){
// const val=await client.lpos(user+'b',bobj)
// if(val==null){
//   return true
// }
// return false
// }

// // async function finished(){

// // }

// async function getstat(user,pdf){
//   const  val=await client.lpos(user,pdf)
//   if(val){
//     const rval=await client.get(pdf)
//     return rval
//   }
// }




// i thi k this will make more sense every pdfnae willbe unique because multer assing s a random name which
//which doesnt repast so it has to work
//but orobem is wiht ouotu fie s
// how should i ggiv the naming schem toit 
// andser must not know it name 



// i need sme ither extra tigs too 
//like now i know out fie cn be hnlde s
// but now i need t take care theay sam file is not uploaded efrytim 
//and also i need makes sure that he doesnt always giv ethe same job 
//i need t see al this cases
// so what now i will do is prevent the user form submitt the same file rpetedl 




//so i need to decide fast 




// so all the previous models hahve been dsicarded 
// becausue i was doing thing like storing blob ojbject and all
// changes dine will be 
// one job queue ehich key as job id 
// fiel willb euser id , status id , path ,hash 
//so if the file cineten ahs matches then it woud be rejected becue it releaed too manyt tie 


function filehash(fpath){
return new Promise((resolve,reject)=>{
  const hash=createHash('SHA-256');
  const  stream=fs.createReadStream(fpath)
  stream.on('data',data=>hash.update(data))
  stream.on('error',reject())
  stream.on('end',resolve(hash.digest('hex')));

})
}





async function push(user,pdf){
  const  jobid=genjobid();
   const hash=await filehash(pdf);

     await client.hset(jobid,{
    'userid':user,
    'status':"pending",
    'path':pdf,
    'verify':hash

  })
     await client.set(hash,jobid)
     return jobid;
}

async function getstat(user,jobid){

  const val=await client.hGet(jobid,'status')
  const val2=await client.hGet(jobid,'user')
  if(val2==user){
  return val;
}
return -1;
}
















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





//code for handling pdf compression 
// app.post('/', upload.single('file'), (req, res) => {
//   console.log("i receveid a request  ")
//   const inputPath = req.file.path;
//   const outputPath = inputPath + '_compressed.pdf';

//   const py = spawn('/home/saidharahas/buzzdoc/venv/bin/python', [
//   '/home/saidharahas/buzzdoc/compress.py',
//   inputPath,
//   outputPath
// ]);

// py.stderr.on('data', data => {
//   console.error(data.toString());
// });

// py.on('close', code => {
//   if (code !== 0) {
//     return res.status(500).send('Compression failed');
//   }
//   res.download(outputPath, () => {
//     fs.unlinkSync(inputPath);
//     fs.unlinkSync(outputPath);
//   });
// });




// });
async function check(sid){
  const valid=client.get(sid)
  if(valid==null){
    return -1
  }
  return  valid
}



//code for handling pdf to txt converison
app.post('/context', upload.single('file'), (req, res) => {
  const start = Date.now();
  console.log("Request received");

  const tempPath = req.file.path;
  const inputPath = tempPath + '.pdf';
  //const outputPath = inputPath + '_context.txt';


  fs.renameSync(tempPath, inputPath);
   // const fileBuffer=req.file.buffer

   // const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
    // if(check(user,fileBlob)){
    //   push(user,inputPath,fileBlob)
    // }else{
    //   fs.unlink(req.file.path)
    // }

    const user=await check(req.body.sid)
    if(user==-1){
      res.json({log:false,jobid=-1,exist:false})
    }




     const var=filehash(inputPath)
     if(client.get(var)==null){
      const valt=await push(user,pdf)//need t defie user here 
      //req.body.jobid=valt  
      res.json({log:true,jobid=valt,exist:false})

     }else{
      res.json({log:true,jobid:-1,exist:true})
     

     }

    // one step is done


  // const py = spawn('/home/saidharahas/buzzdoc/venv/bin/python', [
  //   '/home/saidharahas/buzzdoc/pad.py',
  //   inputPath,
  //   outputPath
  // ]);

  // py.stderr.on('data', data => {
  //   console.error(data.toString());
  // });

  // py.on('close', code => {
  //   const end = Date.now();
  //   console.log(`Total request time: ${(end - start) / 1000}s`);

  //   if (code !== 0) {
  //     return res.status(500).send('OCR failed');
  //   }

  //   res.download(outputPath, () => {
  //     fs.unlinkSync(inputPath);
  //     fs.unlinkSync(outputPath);
  //   });
  // });
});



app.get('/status',(req,res)=>{
const jobid=req.body.jobid 
const stat=getStat(user,jobid)
res.json({
  'status':stat
})

})


//now for deifninn  user i ned to make session description protocols 

app.post('/signin',(req,res)=>{
  const mail=req.body.mail
  const pass=req.body.pass 
  const val3=await client.get(mail)
  if(val3==null){
    const uid=genuserid()
    const sid=gensessid()
    await client.hset(mail,{
      'uid':uid,
      'sid':sid
      'pass':pass
    })
    await client.set(sid,uid)
    res.json({
      'status':true,
       'sid':sid
    })

  }else{
    res.json({
      'status':false,
      'sid':-1
    })
  }

})
app.post('/login',(req,res)=>{
  const mail=req.body.mail
  const pass=req.body.pass 
  const vpass=await client.hget(mail,'pass')
  const uid=await client.hget(mail,'uid')
  if(vpass==pass){
     const sid=gensessid()

     await client.set(sid,uid)
     await client.hset(mail,{
      'uid':uid,
      'sid':sid,
      'pass':pass
     })
     res.json({
      'status':true,
      'sid':sid
     })
  }else{
    res.json({
      'status':false
      'sid':-1
    })
  }
})



secserv.listen(port, () => {
  console.log(`Server running on https://localhost:${port}`);
});
