import fs from "fs";

export function loadEnvironment() {
  const path = "S:/workspace/environment.json";
  const raw = fs.readFileSync(path, "utf-8");
  return JSON.parse(raw);
}