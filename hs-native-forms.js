/**
 * hs-native-forms.js
 * HubSpot Forms API v3 — Native HTML form submission handler
 * Globus Edge & Pairlot | Portal: 246067591
 * 
 * Place ONE <script src="hs-native-forms.js" defer></script> before </body>
 * No API key required — the v3 integration/submit endpoint is unauthenticated
 * Submissions create/update contacts directly in HubSpot CRM
 */

(function () {

  const PORTAL_ID = '246067591';
  const API_BASE  = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}`;

  // Map each form element ID to its HubSpot form GUID
  const FORM_MAP = {
    'ge-contact-form':      '774381a1-53e7-46dc-ada9-411c89c32718',  // Form 1 — Contact
    'ge-partnership-form':  '6ec971b1-80a1-408d-87e3-363a1df46fe1',  // Form 2 — Partnership
    'piq-early-access-form':'d4891f5a-f8fc-4fb6-b23b-b5d596226c91',  // Form 3 — Pairlot
  };

  // Read the HubSpot tracking cookie (hutk) for CRM attribution
  function getHutk() {
    const match = document.cookie.match(/hubspotutk=([^;]+)/);
    return match ? match[1] : null;
  }

  // Collect all named form fields into HubSpot's expected array format
  function collectFields(form) {
    const fields = [];
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(function (el) {
      if (!el.name || el.name === '' || el.type === 'submit') return;
      const val = el.value ? el.value.trim() : '';
      if (val) {
        fields.push({ name: el.name, value: val });
      }
    });
    return fields;
  }

  // Forms that reload the page 10s after success
  const REFRESH_AFTER_SUCCESS = {
    'ge-contact-form':       true,
    'piq-early-access-form': true,
    'ge-partnership-form':   false  // popup — no refresh needed
  };

  // Show inline success message; optionally start 10s refresh countdown
  function showSuccess(form, message, formElId) {
    const wrapper = form.parentElement;
    form.style.display = 'none';

    const doRefresh = REFRESH_AFTER_SUCCESS[formElId] || false;

    const msg = document.createElement('div');
    msg.className = 'hs-success-message';
    msg.innerHTML = `
      <div class="hs-success-icon">&#10003;</div>
      <p>${message}</p>
      ${doRefresh ? '<p class="hs-refresh-note">This page will refresh in <span class="hs-countdown">10</span> seconds&hellip;</p>' : ''}
    `;
    wrapper.appendChild(msg);

    if (doRefresh) {
      let secs = 10;
      const countEl = msg.querySelector('.hs-countdown');
      const interval = setInterval(function () {
        secs -= 1;
        if (countEl) countEl.textContent = secs;
        if (secs <= 0) {
          clearInterval(interval);
          window.location.reload();
        }
      }, 1000);
    }
  }

  // Show inline error message below the submit button
  function showError(form, message) {
    let errEl = form.querySelector('.hs-form-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'hs-form-error';
      form.appendChild(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
  }

  // Set button to loading / restore state
  function setButtonState(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Sending…';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    } else {
      btn.textContent = btn.dataset.originalText || 'Submit';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }

  // Submit a single form to HubSpot API
  function submitToHubSpot(formId, fields, successMsg, btn, form, formElId) {
    const url = `${API_BASE}/${formId}`;
    const hutk = getHutk();

    const payload = {
      fields: fields,
      context: {
        pageUri:  window.location.href,
        pageName: document.title
      }
    };
    if (hutk) payload.context.hutk = hutk;

    setButtonState(btn, true);

    fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    })
    .then(function (res) {
      if (res.ok) {
        showSuccess(form, successMsg, formElId);
      } else {
        return res.json().then(function (data) {
          throw new Error(data.message || 'Submission failed. Please try again.');
        });
      }
    })
    .catch(function (err) {
      setButtonState(btn, false);
      showError(form, err.message || 'Something went wrong. Please try again or email us directly.');
      console.error('[HubSpot form error]', err);
    });
  }

  // Wire up each form
  function initForms() {
    Object.keys(FORM_MAP).forEach(function (formElId) {
      const form = document.getElementById(formElId);
      if (!form) return;

      const formGuid   = FORM_MAP[formElId];
      const successMsg = form.dataset.successMsg || 'Thank you — we\'ll be in touch within one business day.';

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Basic client-side validation — email required
        const emailField = form.querySelector('input[type="email"]');
        if (emailField && !emailField.value.trim()) {
          showError(form, 'Please enter your email address.');
          emailField.focus();
          return;
        }

        const fields = collectFields(form);
        if (!fields.length) {
          showError(form, 'Please fill in at least one field.');
          return;
        }

        const btn = form.querySelector('button[type="submit"]');
        submitToHubSpot(formGuid, fields, successMsg, btn, form, formElId);
      });
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }

})();
