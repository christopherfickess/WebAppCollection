// Shows the anonymous page counts. The token stays in this tab only.
const $ = (s) => document.querySelector(s);
const fill = (table, obj) => {
  const body = table.querySelector("tbody");
  body.replaceChildren(...Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => {
    const tr = document.createElement("tr");
    for (const text of [k, v]) { const td = document.createElement("td"); td.textContent = text; tr.append(td); }
    return tr;
  }));
  table.hidden = false;
};
$("#f").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#out").textContent = "Loading…";
  try {
    const res = await fetch(`/api/stats?days=${$("#d").value}`, { headers: { Authorization: `Bearer ${$("#t").value}` } });
    if (res.status === 401) throw new Error("That token was not accepted.");
    if (!res.ok) throw new Error("Counts are unavailable right now.");
    const s = await res.json();
    $("#out").textContent = `${s.totalViews} page views in the last ${s.days.length} days.`;
    fill($("#tbl"), s.topPages);
    fill($("#ref"), s.topReferrers);
  } catch (err) { $("#out").textContent = err.message; }
});
