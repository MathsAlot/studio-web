/** Reorder a list to match a server-confirmed ordered id array. */
export function applyOrderById<T extends { id: string }>(items: T[], orderedIds: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of orderedIds) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
    }
  }
  for (const item of items) {
    if (!orderedIds.includes(item.id)) {
      ordered.push(item);
    }
  }
  return ordered;
}
