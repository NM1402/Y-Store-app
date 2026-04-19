/**
 * URL Filters Utility - единый источник правды для фильтров каталога
 */

export function parseFiltersFromSearch(search) {
  const sp = new URLSearchParams(search);

  const q = sp.get("q") || "";
  const brands = (sp.get("brand") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const priceMin = sp.get("pmin") ? Number(sp.get("pmin")) : null;
  const priceMax = sp.get("pmax") ? Number(sp.get("pmax")) : null;

  const inStock = sp.get("stock") === "1";
  const rating = sp.get("rating") ? Number(sp.get("rating")) : null;
  const category = sp.get("category") || "";

  const sort = sp.get("sort") || "pop";
  const page = sp.get("page") ? Math.max(1, Number(sp.get("page"))) : 1;

  return {
    filters: {
      q,
      brands,
      priceMin: Number.isFinite(priceMin) ? priceMin : null,
      priceMax: Number.isFinite(priceMax) ? priceMax : null,
      inStock,
      rating: Number.isFinite(rating) ? rating : null,
      category,
      sort,
    },
    page,
  };
}

export function buildSearchFromFilters(filters, page) {
  const sp = new URLSearchParams();

  if (filters?.q) sp.set("q", filters.q);
  if (filters?.brands?.length) sp.set("brand", filters.brands.join(","));
  if (filters?.priceMin != null) sp.set("pmin", String(filters.priceMin));
  if (filters?.priceMax != null) sp.set("pmax", String(filters.priceMax));
  if (filters?.inStock) sp.set("stock", "1");
  if (filters?.rating != null) sp.set("rating", String(filters.rating));
  if (filters?.category) sp.set("category", filters.category);
  if (filters?.sort && filters.sort !== "pop") sp.set("sort", filters.sort);

  if (page && page !== 1) sp.set("page", String(page));

  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default { parseFiltersFromSearch, buildSearchFromFilters };
