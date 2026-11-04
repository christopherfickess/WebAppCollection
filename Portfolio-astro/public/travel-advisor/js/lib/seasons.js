// Twelve monthly ratings (January first): 2 = best, 1 = good, 0 = off-season.
// Wraps the raw array with the questions the UI asks of it.
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const LABELS = ["Off-season", "Good", "Best"];

export class Seasons {
  constructor(ratings) {
    if (!Array.isArray(ratings) || ratings.length !== 12) {
      throw new Error("Seasons needs 12 monthly ratings");
    }
    this.ratings = ratings;
  }

  static label(rating) {
    return LABELS[rating];
  }

  months() {
    return this.ratings.map((rating, i) => ({ short: MONTHS[i], name: MONTH_NAMES[i], rating, label: LABELS[rating] }));
  }

  // Runs of consecutive best months, wrapping December into January,
  // as readable text: "May–Sep" or "Apr–Jun, Sep–Oct".
  bestRanges() {
    const best = this.ratings.map((r) => r === 2);
    if (best.every(Boolean)) return "All year";
    if (!best.some(Boolean)) return "";
    // Start scanning just after a non-best month so wrapped runs stay whole.
    const start = best.findIndex((b) => !b);
    const runs = [];
    let run = null;
    for (let k = 1; k <= 12; k++) {
      const i = (start + k) % 12;
      if (best[i]) {
        run ? (run.end = i) : (run = { start: i, end: i });
      } else if (run) {
        runs.push(run);
        run = null;
      }
    }
    if (run) runs.push(run);
    return runs
      .map((r) => (r.start === r.end ? MONTHS[r.start] : `${MONTHS[r.start]}–${MONTHS[r.end]}`))
      .join(", ");
  }
}
