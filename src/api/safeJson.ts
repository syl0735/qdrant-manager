/**
 * Qdrant peer IDs are u64 which can exceed JS Number.MAX_SAFE_INTEGER (2^53-1).
 * Before JSON.parse we quote bare integers ≥ 16 digits so they flow as strings.
 */
export function safeJsonParse(text: string): unknown {
  const safe = text.replace(/:(\s*)(\d{16,})([,}\]\s])/g, ':$1"$2"$3')
  return JSON.parse(safe)
}
