/** Supabase RPC returning SETOF / TABLE often returns an array; normalize to first row. */
export function firstRpcRow<T extends Record<string, unknown>>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return (data[0] as T) ?? undefined;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    // Some clients / versions may return a single row as a plain object with column keys
    if (
      'first_name' in o ||
      'last_name' in o ||
      'business_name' in o ||
      'avatar_url' in o
    ) {
      return data as T;
    }
    // Rare: numeric keys like { "0": { ... } }
    const row0 = o['0'];
    if (row0 && typeof row0 === 'object') return row0 as T;
    // Fallback: treat any plain object as a row (covers RPCs returning { phone: ... }).
    return o as T;
  }
  return undefined;
}
