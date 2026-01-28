import { useMemo, useState } from "react";

export default function IngredientPicker({
  allIngredients,
  selected,
  onAdd,
  onRemove,
}) {
  const [q, setQ] = useState("");

  const suggestions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const selectedSet = new Set(selected.map((x) => x.toLowerCase()));

    return allIngredients
      .filter((x) => x.toLowerCase().includes(query))
      .filter((x) => !selectedSet.has(x.toLowerCase()))
      .slice(0, 12);
  }, [q, allIngredients, selected]);

  return (
    <div className="ingredient-picker">
      <div className="ingredient-row">
        <label htmlFor="ingredientSearch">My ingredients:</label>
        <input
          id="ingredientSearch"
          name="ingredientSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="type e.g. sugar, flour..."
        />
      </div>

      {suggestions.length > 0 && (
        <div className="ingredient-suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                onAdd(s);
                setQ("");
              }}
              className="ingredient-suggestion-btn"
              type="button"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="ingredient-chips">
          {selected.map((x) => (
            <span key={x} className="chip">
              {x}
              <button
                onClick={() => onRemove(x)}
                className="chip-remove"
                aria-label={`Remove ${x}`}
                type="button"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
