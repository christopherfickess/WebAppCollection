// Client-side only, no backend: GitHub itself doesn't expose the
// contribution calendar over its public REST/GraphQL API without an
// auth token (the calendar is GraphQL-only, behind a PAT). This uses
// github-contributions-api.jogruber.de, a public CORS-enabled proxy
// that reads the same public calendar GitHub renders on profile pages,
// and returns it as JSON - no token, no server of our own needed.

const GITHUB_USER = "christopherfickess";
const CONTRIB_API = "https://github-contributions-api.jogruber.de/v4/" + GITHUB_USER + "?y=last";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildWeeks(contributions) {
  const weeks = [];
  let currentWeek = [];

  const firstDow = new Date(contributions[0].date + "T00:00:00Z").getUTCDay();
  for (let i = 0; i < firstDow; i++) currentWeek.push(null);

  contributions.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}

function monthLabelsForWeeks(weeks) {
  let lastMonth = -1;
  return weeks.map((week) => {
    const firstReal = week.find((d) => d);
    if (!firstReal) return "";
    const month = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      return MONTH_NAMES[month];
    }
    return "";
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderCalendar(container, data) {
  const weeks = buildWeeks(data.contributions);
  const labels = monthLabelsForWeeks(weeks);

  const monthsHtml = labels
    .map((label) => '<span class="gh-contrib-month-cell' + (label ? " gh-contrib-month-label" : "") + '">' + escapeHtml(label) + "</span>")
    .join("");

  const daysHtml = weeks
    .map((week) =>
      week
        .map((day) => {
          if (!day) return '<span class="gh-contrib-day level-0 gh-contrib-day-empty"></span>';
          const title = day.count + (day.count === 1 ? " contribution" : " contributions") + " on " + day.date;
          return '<span class="gh-contrib-day level-' + day.level + '" title="' + escapeHtml(title) + '"></span>';
        })
        .join("")
    )
    .join("");

  container.innerHTML =
    '<p class="gh-contrib-total"><strong>' +
    data.total.lastYear.toLocaleString() +
    "</strong> contributions in the last year</p>" +
    '<div class="gh-contrib-scroll">' +
    '<div class="gh-contrib-graph">' +
    '<div class="gh-contrib-months">' +
    monthsHtml +
    "</div>" +
    '<div class="gh-contrib-body">' +
    '<div class="gh-contrib-daylabels"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>' +
    '<div class="gh-contrib-weeks">' +
    daysHtml +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="gh-contrib-legend"><span>Less</span><span class="gh-contrib-day level-0"></span><span class="gh-contrib-day level-1"></span><span class="gh-contrib-day level-2"></span><span class="gh-contrib-day level-3"></span><span class="gh-contrib-day level-4"></span><span>More</span></div>';
}

async function loadContributions(container) {
  try {
    const res = await fetch(CONTRIB_API);
    if (!res.ok) throw new Error("contributions API " + res.status);
    const data = await res.json();
    if (!data || !data.contributions || !data.contributions.length) {
      container.innerHTML = '<p class="obs-empty">No contribution data to show yet.</p>';
      return;
    }
    renderCalendar(container, data);
    // On phones the calendar scrolls sideways; start at the newest weeks
    // (the right end) instead of a year ago. No-op when it all fits.
    const scroller = container.querySelector(".gh-contrib-scroll");
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  } catch (err) {
    container.innerHTML =
      '<p class="obs-error">Couldn\'t load the contribution graph right now (rate limit or network). Check <a href="https://github.com/' +
      GITHUB_USER +
      '" target="_blank" rel="noopener">github.com/' +
      GITHUB_USER +
      "</a> directly.</p>";
  }
}

const contribContainer = document.getElementById("github-contributions");
if (contribContainer) loadContributions(contribContainer);
