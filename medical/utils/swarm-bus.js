/**
 * ZeroMQ SwarmBus
 * High-Speed IPC Pub/Sub for Agent Communication
 */
import{Publisher,Subscriber}from"zeromq";import{randomUUID}from"crypto";
const IPC_ENDPOINT="ipc:///tmp/swarm-bus";
class SwarmBus{constructor(i,o={}){this.identity=i||randomUUID().slice(0,8);this.options={ipcEndpoint:o.ipcEndpoint||IPC_ENDPOINT,debug:o.debug||false};this.publisher=null;this.subscriber=null;this.connected=false;this.messageHandlers=new Map();this.messageHandlers.set("*",[])}
async connect(){if(this.connected)return;try{this.publisher=new Publisher();await this.publisher.bind(this.options.ipcEndpoint);this.subscriber=new Subscriber();this.subscriber.connect(this.options.ipcEndpoint);await this.subscriber.subscribe("");this.connected=true;this.startListening();if(this.options.debug)console.log("[SwarmBus "+this.identity+"] Connected")}catch(e){console.error("[SwarmBus "+this.identity+"] Error:",e.message)}}
async startListening(){for await(const[m]of this.subscriber){try{let d=JSON.parse(m.toString());if(d.sender!==this.identity)this.handleMessage(d)}catch(e){}}}
handleMessage(d){if(this.options.debug)console.log("["+this.identity+"] Received:",d.content?.slice(0,50));let h=this.messageHandlers.get(d.target)||[];h.forEach(x=>x(d));(this.messageHandlers.get("*")||[]).forEach(x=>x(d))}
send(t="all",c="",m={}){if(!this.connected)return;let msg=JSON.stringify({sender:this.identity,target:t,timestamp:Date.now(),content:c,metadata:m});this.publisher.send(msg)}
on(t,h){if(!this.messageHandlers.has(t))this.messageHandlers.set(t,[]);this.messageHandlers.get(t).push(h)}
async close(){if(this.publisher)await this.publisher.close();if(this.subscriber)await this.subscriber.close();this.connected=false}}
export default SwarmBus;