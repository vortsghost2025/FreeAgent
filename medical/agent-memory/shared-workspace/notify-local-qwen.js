#!/usr/bin/env node
const fs=require("fs");
const path=require("path");
const http=require("http");
const LM_HOST="localhost";
const LM_PORT=1234;
const MODEL="qwen2.5-7b-instruct-1m";
const BRIEF="agent-memory/shared-workspace/session-brief.json";
async function notify(){
  console.log("Starting notify-local-qwen...");
  const b=JSON.parse(fs.readFileSync(BRIEF));
  console.log("Brief:",b.summary);
  const msgs=[
    {role:"system",content:"Read and acknowledge."},
    {role:"user",content:"Read:"+JSON.stringify(b)}
  ];
  const data=JSON.stringify({model:MODEL,messages:msgs});
  const options={
    hostname:LM_HOST,
    port:LM_PORT,
    path:"/api/v1/chat/completions",
    method:"POST",
    headers:{"Content-Type":"application/json","Content-Length":data.length}
  };
  const req=http.request(options,(res)=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{const j=JSON.parse(d);console.log("Qwen:",j.choices[0].message.content)})});
  req.on("error",e=>console.error(e));
  req.write(data);
  req.end();
}
notify();
