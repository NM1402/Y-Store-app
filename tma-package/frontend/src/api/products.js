const API_URL = process.env.REACT_APP_BACKEND_URL || "";

// Map frontend sort keys to backend sort_by values
const SORT_MAP = {
  pop: "popular",
  new: "new",
  price_asc: "price_asc",
  price_desc: "price_desc",
  rating_desc: "rating"
};

export async function fetchProducts(filters, page = 1, limit = 24) {
  const sp = new URLSearchParams();

  // Category filter
  if (filters?.category) sp.set("category", filters.category);
  
  // Brand filter (backend expects single brand string)
  if (filters?.brands?.length) sp.set("brand", filters.brands.join(","));
  
  // Price range (backend expects min_price, max_price)
  if (filters?.priceMin != null) sp.set("min_price", String(filters.priceMin));
  if (filters?.priceMax != null) sp.set("max_price", String(filters.priceMax));
  
  // Stock filter (backend expects in_stock boolean)
  if (filters?.inStock) sp.set("in_stock", "true");
  
  // Sort (map frontend keys to backend values)
  const sortBy = SORT_MAP[filters?.sort] || "popular";
  sp.set("sort_by", sortBy);

  sp.set("page", String(page));
  sp.set("limit", String(limit));

  const res = await fetch(`${API_URL}/api/v2/catalog?${sp.toString()}`);
  if (!res.ok) throw new Error(`products ${res.status}`);
  return await res.json();
}

export async function fetchSuggest(q) {
  const sp = new URLSearchParams();
  sp.set("q", q);
  sp.set("limit", "8");

  const res = await fetch(`${API_URL}/api/v2/search/suggest?${sp.toString()}`);
  if (!res.ok) throw new Error(`suggest ${res.status}`);
  return await res.json();
}

export async function fetchFacets(filters) {
  const sp = new URLSearchParams();

  if (filters?.q) sp.set("q", filters.q);
  if (filters?.category) sp.set("category", filters.category);
  if (filters?.brands?.length) sp.set("brand", filters.brands.join(","));
  if (filters?.priceMin != null) sp.set("pmin", String(filters.priceMin));
  if (filters?.priceMax != null) sp.set("pmax", String(filters.priceMax));
  if (filters?.inStock) sp.set("stock", "1");
  if (filters?.rating != null) sp.set("rating", String(filters.rating));

  const res = await fetch(`${API_URL}/api/v2/catalog/facets?${sp.toString()}`);
  if (!res.ok) throw new Error(`facets ${res.status}`);
  return await res.json();
}
