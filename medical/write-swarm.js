// Write swarm-bus  
const fs=require('fs');  
const code=`import zmq from 'zeromq';  
import { randomUUID } from 'crypto';  
  
const DEFAULT_ENDPOINT = 'ipc:///tmp/swarm-bus';  
 
