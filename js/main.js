/* ==========================================================================
   Bunn Corner Dubai — site behavior
   Plain JavaScript, no frameworks. Safe to open the site directly from disk.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Mobile menu
     ------------------------------------------------------------------ */
  var navToggle = document.querySelector(".js-nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  var navToggleIcon = document.querySelector(".js-nav-toggle-icon");

  function closeMenu() {
    if (!mobileNav) return;
    mobileNav.classList.remove("is-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    if (navToggleIcon) navToggleIcon.textContent = "menu";
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (navToggleIcon) navToggleIcon.textContent = isOpen ? "close" : "menu";
    });

    mobileNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024) closeMenu();
    });
  }

  /* ------------------------------------------------------------------
     2. Live Dubai time and "open / closed" status
     Opening hours: Mon–Thu 8:00–23:00, Fri 8:00–24:00 (prayer pause),
     Sat–Sun 8:30–24:00. Times are minutes after midnight.
     ------------------------------------------------------------------ */
  var SCHEDULE = {
    Mon: { open: 480, close: 1380 },
    Tue: { open: 480, close: 1380 },
    Wed: { open: 480, close: 1380 },
    Thu: { open: 480, close: 1380 },
    Fri: { open: 480, close: 1440, pause: [750, 825] },
    Sat: { open: 510, close: 1440 },
    Sun: { open: 510, close: 1440 }
  };
  var DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatMinutes(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = minutes % 60;
    var suffix = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    var hh = (h12 < 10 ? "0" : "") + h12;
    var mm = (m < 10 ? "0" : "") + m;
    return hh + ":" + mm + " " + suffix;
  }

  function dubaiNow() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dubai",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) {
      values[part.type] = part.value;
    });
    return {
      day: values.weekday,
      minutes: parseInt(values.hour, 10) * 60 + parseInt(values.minute, 10),
      clock: values.hour + ":" + values.minute
    };
  }

  function getStatus() {
    var now = dubaiNow();
    var today = SCHEDULE[now.day];
    var t = now.minutes;

    if (t >= today.open && t < today.close) {
      if (today.pause && t >= today.pause[0] && t < today.pause[1]) {
        return { text: "Paused for Friday prayer • Reopens " + formatMinutes(today.pause[1]) + " GST", clock: now.clock };
      }
      return { text: "Open now • Closes " + formatMinutes(today.close) + " GST", clock: now.clock };
    }
    if (t < today.open) {
      return { text: "Closed • Opens " + formatMinutes(today.open) + " GST", clock: now.clock };
    }
    var tomorrow = SCHEDULE[DAY_ORDER[(DAY_ORDER.indexOf(now.day) + 1) % 7]];
    return { text: "Closed • Opens tomorrow " + formatMinutes(tomorrow.open) + " GST", clock: now.clock };
  }

  function updateStatus() {
    var headerStatus = document.getElementById("header-status-text");
    var heroStatus = document.getElementById("hero-status-text");
    var footerHours = document.getElementById("footer-hours-text");

    var status = getStatus();
    if (headerStatus) headerStatus.textContent = status.text;
    if (heroStatus) heroStatus.textContent = status.text + " • Dubai " + status.clock + " GST";
    if (footerHours) {
      var today = SCHEDULE[dubaiNow().day];
      footerHours.textContent =
        "Live Roastery GST: " + formatMinutes(today.open) + " \u2013 " + formatMinutes(today.close) + " Today";
    }
  }

  updateStatus();
  setInterval(updateStatus, 30000);

  /* ------------------------------------------------------------------
     3. Copy-to-clipboard buttons (phone, email, address)
     ------------------------------------------------------------------ */
  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      document.body.removeChild(area);
      ok ? resolve() : reject(new Error("copy-failed"));
    });
  }

  document.querySelectorAll(".js-copy").forEach(function (button) {
    button.addEventListener("click", function () {
      var label = button.querySelector(".js-copy-label");
      var original = label ? label.textContent : "";

      copyText(button.getAttribute("data-copy")).then(
        function () {
          if (label) label.textContent = "Copied!";
          button.setAttribute("data-copied", "true");
          window.setTimeout(function () {
            if (label) label.textContent = original;
            button.removeAttribute("data-copied");
          }, 2200);
        },
        function () {
          // Last resort: show the value itself, pre-selected, so Ctrl+C works.
          if (label) {
            label.textContent = button.getAttribute("data-copy");
            var range = document.createRange();
            range.selectNodeContents(label);
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            button.title = "Press Ctrl+C to copy";
            window.setTimeout(function () {
              label.textContent = original;
              button.removeAttribute("title");
            }, 4000);
          }
        }
      );
    });
  });

  /* ------------------------------------------------------------------
     4. Contact form (demo only — nothing is sent to a server)
     ------------------------------------------------------------------ */
  var form = document.getElementById("contact-form");

  if (form) {
    var alertBox = document.getElementById("form-alert");
    var successBox = document.getElementById("form-success");
    var messageInput = document.getElementById("message-content");
    var charCount = document.getElementById("char-count");

    if (messageInput && charCount) {
      var updateCount = function () {
        charCount.textContent = messageInput.value.length + " / 600";
      };
      messageInput.addEventListener("input", updateCount);
      updateCount();
    }

    var validators = {
      "full-name": function (value) {
        return value.trim().length >= 2;
      },
      "email-address": function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
      },
      "phone-number": function (value) {
        var digits = value.replace(/[^0-9]/g, "").replace(/^(00971|971|0)/, "");
        return /^5\d{8}$/.test(digits);
      },
      "message-content": function (value) {
        return value.trim().length >= 15;
      }
    };

    function validateField(id) {
      var input = document.getElementById(id);
      var wrapper = input.closest(".field");
      var isValid = validators[id](input.value);
      wrapper.classList.toggle("field--invalid", !isValid);
      input.setAttribute("aria-invalid", isValid ? "false" : "true");
      return isValid;
    }

    Object.keys(validators).forEach(function (id) {
      var input = document.getElementById(id);
      input.addEventListener("blur", function () {
        validateField(id);
      });
      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("field--invalid")) {
          validateField(id);
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var firstInvalid = null;
      Object.keys(validators).forEach(function (id) {
        if (!validateField(id) && !firstInvalid) {
          firstInvalid = document.getElementById(id);
        }
      });

      if (firstInvalid) {
        alertBox.classList.add("is-visible");
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      alertBox.classList.remove("is-visible");

      var inquiry = form.querySelector('input[name="inquiry"]:checked');
      var inquiryLabel = inquiry ? inquiry.getAttribute("data-label") : "General Question";
      var reference = "BC-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000));

      document.getElementById("success-reference").textContent = reference;
      document.getElementById("success-inquiry").textContent = inquiryLabel;

      form.hidden = true;
      form.setAttribute("aria-hidden", "true");
      successBox.classList.add("is-visible");
      successBox.focus();
    });

    var resetButton = document.getElementById("form-reset");
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        form.reset();
        form.hidden = false;
        form.removeAttribute("aria-hidden");
        successBox.classList.remove("is-visible");
        form.querySelectorAll(".field--invalid").forEach(function (field) {
          field.classList.remove("field--invalid");
        });
        if (charCount) charCount.textContent = "0 / 600";
        document.getElementById("full-name").focus();
      });
    }
  }

  /* ------------------------------------------------------------------
     5. Footer year (keeps the copyright current automatically)
     ------------------------------------------------------------------ */
  var year = document.getElementById("footer-year");
  if (year) year.textContent = new Date().getFullYear();
})();
