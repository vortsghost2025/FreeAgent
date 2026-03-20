import { API_BASE } from "@/lib/config";

export default async function Page() {
  const res = await fetch(`${API_BASE}/api/infer/health`);
  const data = await res.json();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}