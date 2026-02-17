// Structured Message Envelope
export function createEnvelope({ from, to, type, payload, meta = {} }) {
  return {
    envelope: true,
    from,
    to,
    type,
    payload,
    meta,
    ts: new Date().toISOString()
  };
}
