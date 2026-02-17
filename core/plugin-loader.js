// Plugin Loader (ESM dynamic import)
// Dynamically loads agent modules and plugins

export async function loadPlugin(path) {
  const mod = await import(path);
  if (!mod || (!mod.classify && !mod.default)) {
    throw new Error(`Invalid plugin at ${path}`);
  }
  return mod;
}
