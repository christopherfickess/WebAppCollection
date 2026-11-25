// How Verify deploy decides what a Netlify deploy record means. A commit that changes no site content makes Netlify cancel
// the build with an "error" state; that must not fail the pipeline.
import assert from "node:assert/strict";
import { classifyDeploy, latestReady } from "../lib/deploy-state.mjs";
const ok = (m) => console.log("ok " + m);

assert.equal(classifyDeploy(undefined), "missing");
assert.equal(classifyDeploy({ state: "ready" }), "ready");
assert.equal(classifyDeploy({ state: "building" }), "waiting");
assert.equal(classifyDeploy({ state: "enqueued" }), "waiting");
assert.equal(classifyDeploy({ state: "error", error_message: "Failed during stage 'building site': exit code 2" }), "failed");
assert.equal(classifyDeploy({ state: "rejected", error_message: "" }), "failed");
assert.equal(classifyDeploy({ state: "error" }), "failed", "an error with no message is still a failure");
assert.equal(classifyDeploy({ state: "error", error_message: "Failed during stage 'checking build content for changes': Canceled build due to no content change" }), "unchanged");
ok("deploy states: ready, waiting, failed, unchanged");

const list = [
  { id: "c", state: "error", branch: "dev", commit_ref: "3" },
  { id: "b", state: "ready", branch: "other", commit_ref: "2" },
  { id: "a", state: "ready", branch: "dev", commit_ref: "1" },
  { id: "z", state: "ready", branch: "dev", commit_ref: "0" },
];
assert.equal(latestReady(list, "dev").id, "a", "newest finished deploy of the same branch");
assert.equal(latestReady(list, "none"), undefined);
ok("falls back to the branch's latest finished deploy");
