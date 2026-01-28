const BASE = "https://www.themealdb.com/api/json/v1/1";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export async function listIngredients() {
  const data = await fetchJson(`${BASE}/list.php?i=list`);
  return data.meals?.map((x) => x.strIngredient).filter(Boolean) ?? [];
}

export async function listCategories() {
  const data = await fetchJson(`${BASE}/list.php?c=list`);
  return data.meals?.map((x) => x.strCategory).filter(Boolean) ?? [];
}

export async function filterByCategory(category) {
  const data = await fetchJson(
    `${BASE}/filter.php?c=${encodeURIComponent(category)}`
  );
  return data.meals ?? [];
}

export async function filterByIngredient(ingredient) {
  const data = await fetchJson(
    `${BASE}/filter.php?i=${encodeURIComponent(ingredient)}`
  );
  return data.meals ?? [];
}

export async function getRecipeById(id) {
  const data = await fetchJson(
    `${BASE}/lookup.php?i=${encodeURIComponent(id)}`
  );
  return data.meals?.[0] ?? null;
}
