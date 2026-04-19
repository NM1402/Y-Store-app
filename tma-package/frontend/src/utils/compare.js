/**
 * Compare Utils - Client-only localStorage management
 * BLOCK V2-19
 */

export function getCompare() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem("compare") || "[]");
}

export function toggleCompare(id) {
  let list = getCompare();
  if (list.includes(id)) {
    list = list.filter(x => x !== id);
  } else {
    if (list.length >= 4) return list; // максимум 4
    list.push(id);
  }
  localStorage.setItem("compare", JSON.stringify(list));
  // Dispatch event for CompareBar to update
  window.dispatchEvent(new Event('compareChanged'));
  return list;
}

export function clearCompare() {
  localStorage.setItem("compare", "[]");
  window.dispatchEvent(new Event('compareChanged'));
  return [];
}

export function isInCompare(id) {
  return getCompare().includes(id);
}
