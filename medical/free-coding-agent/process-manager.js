/*
  File: process-manager.js
  Description: Auto-restart and health monitoring.
*/

import { exec } from "child_process";

export function startProcess(cmd) {
  const proc = exec(cmd);

  proc.stdout.on("data", d => console.log(d));
  proc.stderr.on("data", d => console.error(d));

  proc.on("exit", code => {
    console.log("Process exited with code", code);
    console.log("Restarting...");
    startProcess(cmd);
  });
}
