// Client-side only, no backend: both GitHub's and GitLab's REST APIs
// serve public user/repo data with CORS enabled, so a plain fetch()
// works straight from the browser. Only runs on the Observability
// page (imported there directly, not from BaseLayout), since there's
// no reason to make these calls on every page load.

const GITHUB_USER = "christopherfickess";
const GITLAB_USERNAME = "christopher.fickess20";

function timeAgo(dateString) {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return minutes <= 1 ? "just now" : minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 30) return days + "d ago";
  const months = Math.floor(days / 30);
  if (months < 12) return months + "mo ago";
  return Math.floor(months / 12) + "y ago";
}

function renderError(container, label) {
  container.innerHTML =
    '<p class="obs-error">Couldn\'t reach ' + label + ' right now (rate limit or network). Try again shortly, or check ' +
    (label === "GitHub"
      ? '<a href="https://github.com/' + GITHUB_USER + '" target="_blank" rel="noopener">github.com/' + GITHUB_USER + "</a>"
      : '<a href="https://gitlab.com/' + GITLAB_USERNAME + '" target="_blank" rel="noopener">gitlab.com/' + GITLAB_USERNAME + "</a>") +
    " directly.</p>";
}

function repoRow({ name, url, description, language, updated, stars }) {
  return (
    '<a class="obs-repo-row" href="' + url + '" target="_blank" rel="noopener">' +
    '<div class="obs-repo-main">' +
    '<span class="obs-repo-name">' + name + "</span>" +
    (description ? '<span class="obs-repo-desc">' + description + "</span>" : "") +
    "</div>" +
    '<div class="obs-repo-meta">' +
    (language ? '<span class="obs-repo-lang">' + language + "</span>" : "") +
    '<span class="obs-repo-stars">★ ' + stars + "</span>" +
    '<span class="obs-repo-updated">' + timeAgo(updated) + "</span>" +
    "</div>" +
    "</a>"
  );
}

async function loadGitHub(container) {
  try {
    const res = await fetch("https://api.github.com/users/" + GITHUB_USER + "/repos?sort=pushed&per_page=5", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error("GitHub API " + res.status);
    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      container.innerHTML = '<p class="obs-empty">No public activity to show yet.</p>';
      return;
    }
    container.innerHTML = repos
      .map((r) =>
        repoRow({
          name: r.name,
          url: r.html_url,
          description: r.description,
          language: r.language,
          updated: r.pushed_at,
          stars: r.stargazers_count,
        })
      )
      .join("");
  } catch (err) {
    renderError(container, "GitHub");
  }
}

async function loadGitLab(container) {
  try {
    const userRes = await fetch(
      "https://gitlab.com/api/v4/users?username=" + encodeURIComponent(GITLAB_USERNAME)
    );
    if (!userRes.ok) throw new Error("GitLab API " + userRes.status);
    const users = await userRes.json();
    if (!Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<p class="obs-empty">No public activity to show yet.</p>';
      return;
    }
    const userId = users[0].id;
    const projectsRes = await fetch(
      "https://gitlab.com/api/v4/users/" + userId + "/projects?order_by=last_activity_at&per_page=5"
    );
    if (!projectsRes.ok) throw new Error("GitLab API " + projectsRes.status);
    const projects = await projectsRes.json();
    if (!Array.isArray(projects) || projects.length === 0) {
      container.innerHTML = '<p class="obs-empty">No public projects to show yet.</p>';
      return;
    }
    container.innerHTML = projects
      .map((p) =>
        repoRow({
          name: p.name,
          url: p.web_url,
          description: p.description,
          language: null,
          updated: p.last_activity_at,
          stars: p.star_count,
        })
      )
      .join("");
  } catch (err) {
    renderError(container, "GitLab");
  }
}

const githubContainer = document.getElementById("github-activity");
const gitlabContainer = document.getElementById("gitlab-activity");

if (githubContainer) loadGitHub(githubContainer);
if (gitlabContainer) loadGitLab(gitlabContainer);
