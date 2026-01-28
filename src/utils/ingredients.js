export function norm(s) {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export const ALIASES = new Map([

  ["eggs", "egg"],
  ["egg yolk", "egg"],
  ["egg yolks", "egg"],
  ["egg white", "egg"],
  ["egg whites", "egg"],

  ["caster sugar", "sugar"],
  ["granulated sugar", "sugar"],
  ["powdered sugar", "sugar"],
  ["icing sugar", "sugar"],
  ["confectioners sugar", "sugar"],
  ["confectioner's sugar", "sugar"],
  ["brown sugar", "sugar"],

  ["plain flour", "flour"],
  ["all-purpose flour", "flour"],
  ["all purpose flour", "flour"],
  ["self-raising flour", "flour"],
  ["self raising flour", "flour"],

  ["unsalted butter", "butter"],
  ["salted butter", "butter"],

  ["whole milk", "milk"],
  ["skimmed milk", "milk"],

  ["dark chocolate", "chocolate"],
  ["milk chocolate", "chocolate"],
  ["white chocolate", "chocolate"],
]);

export const DEFAULT_STAPLES = [
  "water",
  "salt",
  "pepper",
  "black pepper",
];

export function canonicalIngredient(raw) {
  if (!raw) return "";

  let x = norm(raw);

  x = x.replace(/\([^)]*\)/g, "").trim();

  x = x.split(",")[0].trim();

  if (ALIASES.has(x)) return ALIASES.get(x);

  return x;
}

export function extractIngredientNames(meal) {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal?.[`strIngredient${i}`]?.trim();
    if (ing) out.push(ing);
  }
  return out;
}

export function extractIngredientsWithMeasures(meal) {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal?.[`strIngredient${i}`]?.trim();
    const measure = meal?.[`strMeasure${i}`]?.trim();
    if (ing) out.push(`${measure ? measure + " " : ""}${ing}`);
  }
  return out;
}
