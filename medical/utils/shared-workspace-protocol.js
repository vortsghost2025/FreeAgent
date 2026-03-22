/**
 * Shared Workspace Protocol
 */
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const COMMIT_LOCK_FILE=path.join(__dirname,"..","agent-memory","shared-workspace","commit-lock.json");

export async function acquireCommitLock(agentId){
  const maxRetries=30,retryDelay=1000;
  for(let i=0;i<maxRetries;i++){
    try{
      const lockDir=path.dirname(COMMIT_LOCK_FILE);
      if(!fs.existsSync(lockDir))fs.mkdirSync(lockDir,{recursive:true});
      let lockData=null;
      if(fs.existsSync(COMMIT_LOCK_FILE)){try{lockData=JSON.parse(fs.readFileSync(COMMIT_LOCK_FILE,"utf-8"))}catch(e){}}
      if(lockData&&lockData.holder&&lockData.holder!==agentId){
        console.log("[CommitLock] "+agentId+" waiting for "+lockData.holder+"...");
        await new Promise(r=>setTimeout(r,retryDelay));continue}
      const newLock={holder:agentId,timestamp:Date.now(),expiresAt:Date.now()+60000};
      fs.writeFileSync(COMMIT_LOCK_FILE,JSON.stringify(newLock,null,2));
      console.log("[CommitLock] "+agentId+" acquired");
      return{success:true,message:"Lock acquired"}
    }catch(err){
      if(err.code==="ENOENT"){await new Promise(r=>setTimeout(r,retryDelay));continue}
      console.error("[CommitLock] "+err.message);await new Promise(r=>setTimeout(r,retryDelay))}
    }
  }return{success:false,message:"Failed to acquire lock"}
}

export async function releaseCommitLock(agentId){
  try{
    if(!fs.existsSync(COMMIT_LOCK_FILE))return{success:true,message:"No lock"};
    const lockData=JSON.parse(fs.readFileSync(COMMIT_LOCK_FILE,"utf-8"));
    if(lockData.holder!==agentId)return{success:false,message:"Held by "+lockData.holder};
    fs.unlinkSync(COMMIT_LOCK_FILE);
    console.log("[CommitLock] "+agentId+" released");
    return{success:true,message:"Released"}
  }catch(err){return{success:false,message:err.message}}
}

export class SharedWorkspaceBus{
  constructor(agentId){this.agentId=agentId;this.subscribers=new Map;this.messageQueue=[];this.memoryFile=null;this.initialized=false}
  async init(){
    if(this.initialized)return;
    const memoryDir=path.join(__dirname,"..","agent-memory","shared-workspace");
    if(!fs.existsSync(memoryDir))fs.mkdirSync(memoryDir,{recursive:true});
    this.memoryFile=path.join(memoryDir,this.agentId+"-messages.json");
    if(!fs.existsSync(this.memoryFile))fs.writeFileSync(this.memoryFile,JSON.stringify({messages:[]}));
    this.initialized=true;console.log("[WorkspaceBus] "+this.agentId)}
  async subscribe(channel,cb){if(!this.subscribers.has(channel))this.subscribers.set(channel,new Set);this.subscribers.get(channel).add(cb)}
  async unsubscribe(channel,cb){if(this.subscribers.has(channel))this.subscribers.get(channel).delete(cb)}
  async publish(channel,msg){
    const m={channel,data:msg,from:this.agentId,timestamp:Date.now()};
    this.messageQueue.push(m);this._write();
    if(this.subscribers.has(channel))for(const cb of this.subscribers.get(channel))try{await cb(m)}catch(e){}}
  async sendTo(agentId,msg){
    const tf=path.join(__dirname,"..","agent-memory","shared-workspace",agentId+"-messages.json");
    let msgs=[];if(fs.existsSync(tf))try{msgs=JSON.parse(fs.readFileSync(tf)).messages||[]}catch(e){}
    msgs.push({from:this.agentId,to:agentId,data:msg,timestamp:Date.now()});
    fs.writeFileSync(tf,JSON.stringify({messages:msgs}))}
  _write(){try{fs.writeFileSync(this.memoryFile,JSON.stringify({messages:this.messageQueue}))}catch(e){}}
  async getMessages(l=50){return this.messageQueue.slice(-l)}
}

export const workspaceBus=new SharedWorkspaceBus("workspace");
export const kiloBus=new SharedWorkspaceBus("kilo");
export const lingmaBus=new SharedWorkspaceBus("lingma");
(async()=>{await Promise.all([workspaceBus.init(),kiloBus.init(),lingmaBus.init()]);console.log("[WorkspaceBus] Ready")})();
