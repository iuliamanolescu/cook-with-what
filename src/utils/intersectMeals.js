export function intersectMeals(...lists) {
  const nonEmpty = lists.filter((l) => Array.isArray(l) && l.length > 0);
  if (nonEmpty.length === 0) return [];

  const base = new Map(nonEmpty[0].map((m) => [m.idMeal, m]));

  for (let i = 1; i < nonEmpty.length; i++) {
    const set = new Set(nonEmpty[i].map((m) => m.idMeal));
    for (const id of Array.from(base.keys())) {
      if (!set.has(id)) base.delete(id);
    }
  }
  return Array.from(base.values());
}
