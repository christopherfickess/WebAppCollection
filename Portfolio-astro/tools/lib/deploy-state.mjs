// How Verify deploy reads a Netlify deploy record. Kept separate from the script so it can be tested.

// "ready" | "failed" | "unchanged" | "waiting" | "missing"
//   unchanged: Netlify cancelled the build because nothing in the site changed (a docs, workflow or skill-only commit).
//   That is not a broken deploy; the previous deploy of the branch is still what is live.
export function classifyDeploy(d) {
  if (!d) return "missing";
  if (d.state === "ready") return "ready";
  if (d.state === "error" || d.state === "rejected") return /no content change/i.test(d.error_message || "") ? "unchanged" : "failed";
  return "waiting";
}

// The newest deploy of this branch that finished and is live (Netlify lists newest first).
export const latestReady = (deploys, branch) => deploys.find((x) => x.state === "ready" && x.branch === branch);
