export function groupByCategory<T extends { category: string }>(
  items: T[]
): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
