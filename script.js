// Mishtimukh — small vanilla JS for nav, menu tabs, booking form and opening status.
(function () {
  "use strict";

  // ---- Mobile navigation ----
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var header = document.querySelector(".site-header");

  function closeNav() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeNav();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  window.addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }, { passive: true });

  // ---- Menu tabs ----
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));

  function showTab(name) {
    tabs.forEach(function (tab) {
      var active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      var panel = document.getElementById("panel-" + tab.dataset.tab);
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { showTab(tab.dataset.tab); });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { next.focus(); showTab(next.dataset.tab); }
    });
  });
  showTab("starters");

  // Links like "See all sweets" open a specific tab
  document.querySelectorAll("[data-open-tab]").forEach(function (link) {
    link.addEventListener("click", function () { showTab(link.dataset.openTab); });
  });

  // ---- Reservation form ----
  var form = document.getElementById("reserve-form");
  var success = document.getElementById("form-success");
  var successText = document.getElementById("success-text");
  var dateInput = document.getElementById("date");

  function isoDate(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  var today = new Date();
  var maxDate = new Date();
  maxDate.setDate(today.getDate() + 60);
  dateInput.min = isoDate(today);
  dateInput.max = isoDate(maxDate);

  function setError(id, message) {
    var field = document.getElementById(id).closest(".field");
    document.getElementById(id + "-error").textContent = message;
    field.classList.toggle("has-error", Boolean(message));
    document.getElementById(id).setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validate() {
    var ok = true;
    var name = document.getElementById("name").value.trim();
    var phone = document.getElementById("phone").value.replace(/[\s-]/g, "").replace(/^(\+91|0)/, "");
    var date = dateInput.value;

    if (name.length < 2) { setError("name", "Please enter your name."); ok = false; }
    else setError("name", "");

    if (!/^[6-9]\d{9}$/.test(phone)) { setError("phone", "Enter a valid 10-digit mobile number."); ok = false; }
    else setError("phone", "");

    if (!date) { setError("date", "Please choose a date."); ok = false; }
    else if (date < dateInput.min) { setError("date", "That date has already passed."); ok = false; }
    else if (date > dateInput.max) { setError("date", "We take bookings up to 60 days ahead."); ok = false; }
    else if (new Date(date + "T12:00:00").getDay() === 2) { setError("date", "Our kitchen is closed on Tuesdays."); ok = false; }
    else setError("date", "");

    if (!document.getElementById("time").value) { setError("time", "Pick a time."); ok = false; }
    else setError("time", "");

    if (!document.getElementById("guests").value) { setError("guests", "How many guests?"); ok = false; }
    else setError("guests", "");

    return ok;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      var firstError = form.querySelector("[aria-invalid='true']");
      if (firstError) firstError.focus();
      return;
    }
    var d = new Date(dateInput.value + "T12:00:00");
    var niceDate = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    var guests = document.getElementById("guests").value;
    successText.textContent = "Thanks, " + document.getElementById("name").value.trim().split(" ")[0] + ". We have your request for a table for " +
      guests + (guests === "1" ? " guest" : " guests") + " on " + niceDate + " at " + document.getElementById("time").value +
      ". (This is a demo, so no real booking was made.)";
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });

  // Clear an error as soon as the user fixes the field
  form.addEventListener("input", function (e) {
    var field = e.target.closest(".field");
    if (field && field.classList.contains("has-error")) setError(e.target.id, "");
  });

  document.getElementById("book-again").addEventListener("click", function () {
    form.reset();
    success.hidden = true;
    form.hidden = false;
    document.getElementById("name").focus();
  });

  // ---- Map: show a static map first, load the interactive one on request ----
  var mapBtn = document.getElementById("map-load");
  mapBtn.addEventListener("click", function () {
    var frame = document.createElement("iframe");
    frame.title = "Interactive map of Kaiba, Khanakul, Hooghly";
    frame.src = mapBtn.dataset.src;
    document.getElementById("map-frame").appendChild(frame);
    mapBtn.remove();
  });

  // ---- "Open now?" line, based on Kolkata time ----
  var hours = {
    // day index: [[open, close], ...] in minutes from midnight
    0: [[720, 1410]], 1: [[720, 930], [1140, 1380]], 2: [],
    3: [[720, 930], [1140, 1380]], 4: [[720, 930], [1140, 1380]],
    5: [[720, 1410]], 6: [[720, 1410]]
  };
  var status = document.getElementById("today-status");
  try {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date());
    var get = function (type) { return parts.filter(function (p) { return p.type === type; })[0].value; };
    var dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    var mins = parseInt(get("hour"), 10) % 24 * 60 + parseInt(get("minute"), 10);
    var open = hours[dayIdx].some(function (slot) { return mins >= slot[0] && mins < slot[1]; });
    status.textContent = open ? "The kitchen is open right now." :
      (dayIdx === 2 ? "Kitchen closed today, but the sweet counter is open." : "The kitchen is closed right now.");
  } catch (err) {
    status.textContent = "";
  }
})();
