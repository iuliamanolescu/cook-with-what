import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  filterByCategory,
  filterByIngredient,
  getRecipeById,
  listCategories,
  listIngredients,
} from "../api/mealdb";
import IngredientPicker from "../components/IngredientPicker";
import {
  canonicalIngredient,
  DEFAULT_STAPLES,
  extractIngredientNames,
} from "../utils/ingredients";

const LS_LOOKUP_CACHE = "mealdb_lookup_cache_v3";
const LS_LIGHT_ALL = "mealdb_light_all_v2";

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [allIngredients, setAllIngredients] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [allMealsMap, setAllMealsMap] = useState(new Map());

  const [selected, setSelected] = useState(() => {
  const saved = localStorage.getItem("selected_ingredients");
  return saved ? JSON.parse(saved) : [];
});
  const [allowedMissing, setAllowedMissing] = useState(2);
  const [ignoreStaples, setIgnoreStaples] = useState(true);

  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [err, setErr] = useState("");

  const [computed, setComputed] = useState([]);

  useEffect(() => {
  localStorage.setItem("selected_ingredients", JSON.stringify(selected));
}, [selected]);

  const lookupCacheRef = useRef(new Map());

  const ready = allMealsMap.size > 0 && allIngredients.length > 0;

  const activeMealsMap = useMemo(() => {
    if (!allMealsMap || allMealsMap.size === 0) return new Map();
    if (selectedCategory === "All") return allMealsMap;

   const filteredMeals = new Map();
for (const [id, meal] of allMealsMap.entries()) {
  if (meal.category === selectedCategory) {
    filteredMeals.set(id, meal);
  }
}
return filteredMeals;
  }, [allMealsMap, selectedCategory]);

  const results = useMemo(() => {
    return computed
      .filter((result) => result.missing.length <= allowedMissing)
      .sort((a, b) => {
        if (a.missing.length !== b.missing.length)
          return a.missing.length - b.missing.length;
        if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
        return Number(a.light.idMeal) - Number(b.light.idMeal);
      });
  }, [computed, allowedMissing]);

  function persistLookupCache() {
    const entries = Array.from(lookupCacheRef.current.entries()).slice(-300);
    const obj = Object.fromEntries(entries);
    try {
      localStorage.setItem(LS_LOOKUP_CACHE, JSON.stringify(obj));
    } catch {}
  }

  async function getMealCached(id) {
    if (lookupCacheRef.current.has(id)) return lookupCacheRef.current.get(id);
    const meal = await getRecipeById(id);
    if (meal) {
      lookupCacheRef.current.set(id, meal);
      persistLookupCache();
    }
    return meal;
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const rawLookup = localStorage.getItem(LS_LOOKUP_CACHE);
        if (rawLookup) {
          const lookupCacheObject = safeJsonParse(rawLookup, {});
          for (const [id, meal] of Object.entries(lookupCacheObject)) {
            lookupCacheRef.current.set(id, meal);
          }
        }

        const [ings, cats] = await Promise.all([
          listIngredients(),
          listCategories(),
        ]);

        if (!mounted) return;

        setAllIngredients(ings);
        setCategories(["All", ...cats]);

        const rawLight = localStorage.getItem(LS_LIGHT_ALL);
        if (rawLight) {
          const cachedMealsObject = safeJsonParse(rawLight, null);
          if (cachedMealsObject && typeof cachedMealsObject === "object") {
           const mealsMap = new Map();
for (const [id, meal] of Object.entries(cachedMealsObject)) {
  mealsMap.set(id, meal);
}
setAllMealsMap(mealsMap);
            return;
          }
        }

        const lists = await Promise.all(cats.map((category) => filterByCategory(category)));

        const all = new Map();
        for (let i = 0; i < cats.length; i++) {
          const cat = cats[i];
          const list = lists[i] ?? [];
          for (const meal of list) {
            all.set(meal.idMeal, { ...meal, category: cat });
          }
        }

        if (!mounted) return;

        setAllMealsMap(all);

        try {
          const obj = Object.fromEntries(all.entries());
          localStorage.setItem(LS_LIGHT_ALL, JSON.stringify(obj));
        } catch {}
      } catch (e) {
        if (mounted) setErr(e?.message ?? "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");
      setComputed([]);

      if (!ready) return;
      if (selected.length === 0) return;
      if (!activeMealsMap || activeMealsMap.size === 0) return;

      try {
        setFinding(true);

        const sortedSelected = [...selected].sort((a, b) => a.localeCompare(b));

        const lists = await Promise.all(
          sortedSelected.map((ing) => filterByIngredient(ing))
        );

const hitCount = new Map();

for (const list of lists) {
  if (!list) continue;
  for (const meal of list) {
    hitCount.set(meal.idMeal, (hitCount.get(meal.idMeal) ?? 0) + 1);
  }
}

const candidates = [];
for (const [id] of hitCount.entries()) {
  const light = activeMealsMap.get(id);
  if (light) candidates.push(light);
}

candidates.sort((a, b) => {
  const ha = hitCount.get(a.idMeal) ?? 0;
  const hb = hitCount.get(b.idMeal) ?? 0;

  if (hb !== ha) return hb - ha;
  return Number(a.idMeal) - Number(b.idMeal);
});

const MAX_CANDIDATES = 250;
const trimmed = candidates.slice(0, MAX_CANDIDATES);

        const pantrySet = new Set(sortedSelected.map(canonicalIngredient));

        const staplesSet = new Set(
          (DEFAULT_STAPLES ?? []).map(canonicalIngredient)
        );

        const computedList = await mapWithConcurrency(trimmed, 6, async (light) => {
          const full = await getMealCached(light.idMeal);
          if (!full) return null;

          let recipeIngs = extractIngredientNames(full)
            .map(canonicalIngredient)
            .filter(Boolean);

          if (ignoreStaples) {
            recipeIngs = recipeIngs.filter((result) => !staplesSet.has(result));
          }

          recipeIngs = Array.from(new Set(recipeIngs));

          const missing = recipeIngs.filter((result) => !pantrySet.has(result));
          const usedCount = recipeIngs.filter((result) => pantrySet.has(result)).length;

          return {
            light,
            missing,
            usedCount,
            recipeIngCount: recipeIngs.length,
          };
        });

        if (cancelled) return;

        const minUsed = 1;

        const clean = computedList
          .filter(Boolean)
          .filter((result) => result.usedCount >= minUsed)
          .sort((a, b) => Number(a.light.idMeal) - Number(b.light.idMeal));

        setComputed(clean);
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? "Eroare");
      } finally {
        if (!cancelled) setFinding(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, selected, activeMealsMap, ignoreStaples]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (err) return <div style={{ padding: 16 }}>Eroare: {err}</div>;

  return (
      <div className="home-page">
    <div className="title">
      <h1>Find recipes with what you already have at home</h1>
    </div>
  
    <div className="home-layout">
     <div className="home-sidebar">
        <h2 style={{ margin: 0, textAlign: "center",fontSize: "32px",}}>Filters</h2>

        <div style={{ marginBottom: 12 }}>
          <label>Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <IngredientPicker
          allIngredients={allIngredients}
          selected={selected}
          onAdd={(result) =>
            setSelected((prev) => (prev.includes(result) ? prev : [...prev, result]))
          }
          onRemove={(result) => setSelected((prev) => prev.filter((p) => p !== result))}
        />

        <div style={{ marginTop: 12 }}>
          <label>
            Allow missing: <b>{allowedMissing}</b>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={allowedMissing}
            onChange={(e) => setAllowedMissing(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8,}}
          />
        </div>

        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <input
            type="checkbox"
            checked={ignoreStaples}
            onChange={(e) => setIgnoreStaples(e.target.checked)}
          />
          Ignore basic ingredients (water, salt, pepper)
        </label>

        <button
          onClick={() => setSelected([])}
          style={{ marginTop: 12, padding: 10, width: "100%" }}
          type="button"
        >
          Clear ingredients
        </button>

        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Select the ingredients you have. I’ll show recipes that use at least one of them and tell you what’s missing.
        </p>
      </div>

      <main>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Matching recipes</h1>
            <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
              {selected.length === 0
                ? "Select ingredients to find recipes."
                : finding
                ? "Searching for recipes..."
                : `Found: ${results.length} (out of ${activeMealsMap.size} recipes)`}{" "}
     Category: <b>{selectedCategory}</b>
            </p>
          </div>
        </div>

        {selected.length > 0 && !finding && results.length === 0 && (
          <p style={{ marginTop: 16 }}>
            No recipes found with up to {allowedMissing} missing ingredients.
          </p>
        )}

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {results.map((r) => (
            <Link
              key={r.light.idMeal}
              to={`/recipe/${r.light.idMeal}`}
              style={{
                textDecoration: "none",
                backgroundColor:'#ffffff69',
                color: "inherit",
                border: "1px solid #7C6A5E",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <img
                src={r.light.strMealThumb}
                alt={r.light.strMeal}
                style={{ width: "100%", height: 160, objectFit: "cover" }}
                loading="lazy"
              />
              <div style={{ padding: 12 ,paddingTop:0,}}>
                <h3 style={{ margin: 0, fontSize: 20 }}>{r.light.strMeal}</h3>

                <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
                  {r.light.category ? `Category: ${r.light.category}` : null}
                </p>

                <p style={{ margin: "8px 0 0", opacity: 0.85 }}>
                  Missing: <b>{r.missing.length}</b> (max {allowedMissing})
                </p>

                {r.missing.length > 0 && (
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
                    You also need: {r.missing.slice(0, 4).join(", ")}
                    {r.missing.length > 4 ? "…" : ""}
                  </p>
                )}

                <p style={{ margin: "8px 0 0",}}>View recipe →</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
    </div>
  );
}
