// Online booking and print orders. Everything here is optional: if /api is
// not available (no server, no Stripe keys), the page keeps its plain request
// form and the wall preview, and nothing looks broken.
export class Booking {
  static async attach(form) {
    if (!form) return null;
    let info;
    try {
      const res = await fetch("/api/availability", { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      info = await res.json();
    } catch { return null; }
    return new Booking(form, info);
  }

  constructor(form, info) {
    this.form = form;
    this.info = info;
    this.taken = new Set(info.unavailable);
    this.date = form.querySelector("#date");
    this.note = form.querySelector("#light-note");
    this.msg = document.createElement("p");
    this.msg.className = "book-msg";
    this.msg.setAttribute("role", "status");
    if (this.date) {
      const min = new Date(Date.now() + info.minLeadDays * 864e5).toISOString().slice(0, 10);
      this.date.min = min;
      this.date.addEventListener("input", () => this.check());
    }
    if (info.payments) this.addPayButton();
  }

  problem() {
    const v = this.date?.value;
    if (!v) return "Choose a date to book online.";
    if (this.taken.has(v)) return "That date is not available. Please choose another.";
    if (this.date.validity.rangeUnderflow) return `Dates need at least ${this.info.minLeadDays} days notice.`;
    const day = new Date(`${v}T12:00:00Z`).getUTCDay();
    if (this.info.closedWeekdays.includes(day)) return "Sessions are not offered on that day.";
    return "";
  }

  check() {
    const bad = this.date.value && this.problem();
    this.date.setCustomValidity(bad || "");
    this.msg.textContent = bad || "";
  }

  addPayButton() {
    const submit = this.form.querySelector('button[type="submit"]');
    const pay = document.createElement("button");
    pay.type = "button";
    pay.className = "btn btn-ghost";
    pay.textContent = "Reserve date with deposit";
    pay.addEventListener("click", () => this.pay(pay));
    submit.after(pay);
    if (this.info.depositNote) {
      const n = document.createElement("p");
      n.className = "light-note";
      n.textContent = this.info.depositNote;
      pay.after(n);
    }
    pay.after(this.msg);
  }

  async pay(button) {
    const f = this.form.elements;
    const bad = this.problem();
    if (bad || !this.form.reportValidity()) { this.msg.textContent = bad; return; }
    if (f.session.value === "Not sure yet") { this.msg.textContent = "Choose a session to pay its deposit."; return; }
    button.disabled = true;
    this.msg.textContent = "Taking you to the payment page…";
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "session", name: f.name.value, email: f.email.value, package: f.session.value, date: f.date.value, message: f.message.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        const why = { held: "Someone is paying for that date right now. Try again in half an hour.", booked: "That date was just booked.", "too-soon": "That date is too soon." };
        throw new Error(why[data.error] || "Payment could not start. Send the request instead and I will follow up.");
      }
      location.assign(data.url);
    } catch (e) {
      this.msg.textContent = e.message;
      button.disabled = false;
    }
  }
}

// Adds an "Order this print" button to the wall preview.
export class PrintOrder {
  static async attach(wall) {
    if (!wall) return;
    try {
      const info = await (await fetch("/api/availability")).json();
      if (!info.payments) return;
    } catch { return; }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Order this print";
    const msg = document.createElement("p");
    msg.className = "wall-note";
    msg.setAttribute("role", "status");
    wall.querySelector(".wall-controls").append(btn, msg);
    btn.addEventListener("click", async () => {
      const photo = wall.data[wall.state.photo];
      const size = wall.sizes()[wall.state.size];
      btn.disabled = true;
      msg.textContent = "Taking you to the payment page…";
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "print", photo: photo.file.replace("img/photos/", ""), size: size.label }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error();
        location.assign(data.url);
      } catch {
        msg.textContent = "Ordering is unavailable right now. Please use the contact form.";
        btn.disabled = false;
      }
    });
  }
}

// Anonymous page counts: no cookies, no IP, nothing stored in the browser.
// Skipped when the visitor sends Do Not Track or Global Privacy Control.
export class Beacon {
  static send() {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    try {
      const body = JSON.stringify({ path: location.pathname, ref: document.referrer });
      if (!navigator.sendBeacon?.("/api/collect", new Blob([body], { type: "text/plain" }))) {
        fetch("/api/collect", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {}
  }
}

// On the thank-you page: say what actually happened.
export class Thanks {
  static attach() {
    const q = new URLSearchParams(location.search);
    const el = document.querySelector(".thanks p");
    if (!el) return;
    if (q.has("paid")) el.textContent = "Your deposit is paid and the date is held for you. A confirmation email is on its way.";
    else if (q.has("order")) el.textContent = "Your print order is paid. A confirmation email is on its way.";
  }
}
