from fastapi import FastAPI,WebSocket
from fastapi.middleware.cors import CORSMiddleware
import json,asyncio
app=FastAPI()
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
connections={}
@app.websocket("/ws/{agent_id}")
async def ws(ws:WebSocket,agent_id:str):
  await ws.accept()
  connections[agent_id]=ws
  try:
    while True:
      data=await ws.receive_json()
      for cid,conn in connections.items():
        if cid!=agent_id:await conn.send_json({**data,"from":agent_id})
  except:pass
  finally:if agent_id in connections:del connections[agent_id]
@app.get("/agents")
async def list_agents():return{"connected_agents":list(connections.keys())}
if __name__=="__main__":import uvicorn;uvicorn.run(app,host="0.0.0.0",port=8000)