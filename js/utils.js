// js/utils.js — دوال مشتركة بين جميع صفحات التطبيق

export function translateStatus(s) {
  switch (s) {
    case "pending":   return "قيد الانتظار";
    case "assigned":  return "تم الإسناد لعامل";
    case "accepted":  return "قيد التنفيذ";
    case "completed": return "مكتمل";
    default: return s || "—";
  }
}

export function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(ts) {
  try {
    const d = ts && ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "—";
  }
}

export function badgeClass(status) {
  if (status === "completed") return "success";
  if (status === "pending")   return "warning";
  return "info";
}
