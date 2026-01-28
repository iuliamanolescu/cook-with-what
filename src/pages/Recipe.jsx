import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRecipeById } from "../api/mealdb";
import { extractIngredientsWithMeasures } from "../utils/ingredients";

export default function Recipe() {
  const { id } = useParams();
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getRecipeById(id);
        if (!data) throw new Error("Rețeta nu a fost găsită.");
        if (mounted) setMeal(data);
      } catch (e) {
        if (mounted) setErr(e?.message ?? "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  const ingredients = useMemo(() => extractIngredientsWithMeasures(meal), [meal]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <p>Error: {err}</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '8%', maxWidth: 900, margin: "0%" }}>
      <Link to="/">← Back</Link>

      <h1 className='recipe-title' style={{ marginTop: 12, marginBottom:5}}>{meal.strMeal}</h1>
<div className="wrap">
      {meal.strYoutube && (
  <div className="video-container">
    <iframe
      src={meal.strYoutube.replace("watch?v=", "embed/")}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    ></iframe>
  </div>
)}
<div className="ingredients">
      <h2>Ingredients</h2>
      <ul>
        {ingredients.map((x, idx) => (
          <li key={idx}>{x}</li>
        ))}
      </ul>
</div>
</div>

      <h2>Instructions</h2>
      <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
        {meal.strInstructions}
      </p>

    </div>
  );
}
