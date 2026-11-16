/* The Signal weekly update signup, powered by Kit (Nov 15, 2026).

   THE ONE SHARED CONFIG SETTING: KIT_FORM_ID below is the only place
   the Kit form ID lives. Every signup form on the site (the homepage
   subscribe block, the compact form on topic hubs) reads it from
   here. When Thillai supplies the form ID, set it once in this file
   and every form goes live; no page markup changes.

   While the ID is empty the forms are inert by design: they render
   the "Weekly update starting soon" notice, carry no action, and the
   submit button is disabled, so nothing can post anywhere.

   With an ID set, each form posts directly from the browser to the
   form's Kit endpoint, https://app.kit.com/forms/<ID>/subscriptions,
   with the email in Kit's email_address field. Kit runs the double
   opt-in: the subscriber confirms from the email Kit sends. No API
   key or secret is used or stored anywhere in this site; the form
   endpoint is public by design.

   window.__KIT_FORM_ID__ is a QA hook only (the harnesses render the
   configured state with a dummy ID); it is never set by page code. */
(function () {
  "use strict";

  var KIT_FORM_ID = ""; /* <-- the shared Kit form ID setting */
  var formId = (typeof window.__KIT_FORM_ID__ === "string")
    ? window.__KIT_FORM_ID__ : KIT_FORM_ID;
  var ENDPOINT = formId
    ? "https://app.kit.com/forms/" + formId + "/subscriptions" : "";

  window.SignalSignup = {
    kitFormId: formId,
    endpoint: ENDPOINT,
    endpointFor: function (id) {
      return id ? "https://app.kit.com/forms/" + id + "/subscriptions" : "";
    }
  };

  function wire(form) {
    var submit = form.querySelector("[data-kit-submit]");
    var note = form.querySelector("[data-kit-note]");
    var ok = form.querySelector("[data-kit-success]");
    var err = form.querySelector("[data-kit-error]");
    var email = form.querySelector('input[name="email_address"]');
    var consent = form.querySelector("[data-kit-consent]");
    function show(el, text) {
      if (!el) return;
      if (text != null) el.textContent = text;
      el.hidden = false;
    }
    function hide(el) { if (el) el.hidden = true; }

    if (!ENDPOINT) {
      /* Starting soon state: no action, submit disabled, notice up. */
      form.removeAttribute("action");
      if (submit) submit.disabled = true;
      show(note);
      return;
    }
    form.setAttribute("action", ENDPOINT);
    form.setAttribute("method", "post");
    if (submit) submit.disabled = false;
    hide(note);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      hide(ok); hide(err);
      var value = email ? String(email.value || "").trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        show(err, "Please enter a valid email address.");
        if (email) email.focus();
        return;
      }
      if (consent && !consent.checked) {
        show(err, "Please tick the consent box so we can send you the update.");
        consent.focus();
        return;
      }
      if (submit) { submit.disabled = true; submit.textContent = "Subscribing"; }
      var body = new FormData();
      body.append("email_address", value);
      fetch(ENDPOINT, { method: "POST", body: body, mode: "no-cors" })
        .then(function () {
          show(ok, "Thank you. Please check your inbox and confirm your subscription to start receiving the weekly update.");
          form.reset();
        })
        .catch(function () {
          show(err, "Something went wrong and the signup did not go through. Please try again in a moment.");
        })
        .then(function () {
          if (submit) { submit.disabled = false; submit.textContent = "Subscribe"; }
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll("[data-kit-signup]");
    Array.prototype.forEach.call(forms, function (f) {
      try { wire(f); } catch (e) { /* a broken form never breaks the page */ }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
