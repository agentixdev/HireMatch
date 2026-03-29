/**
 * HireMatch Visa Widget — Embeddable visa data for third-party sites.
 *
 * Usage:
 *   <div id="hirematch-visa"></div>
 *   <script src="https://www.hirematch.com/embed/visa-widget.js"
 *     data-api-key="hm_live_xxx"
 *     data-country="us"
 *     data-theme="dark">
 *   </script>
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var API_KEY = SCRIPT.getAttribute('data-api-key');
  var COUNTRY = (SCRIPT.getAttribute('data-country') || '').toLowerCase();
  var THEME = SCRIPT.getAttribute('data-theme') || 'dark';
  var CONTAINER_ID = SCRIPT.getAttribute('data-container') || 'hirematch-visa';
  var API_BASE = SCRIPT.src.replace(/\/embed\/visa-widget\.js.*$/, '') + '/api/v1/visa';

  if (!API_KEY) {
    console.error('[HireMatch] Missing data-api-key attribute');
    return;
  }

  // ── Styles ──
  var isDark = THEME === 'dark';
  var CSS = '\n' +
    '.hm-visa-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:640px;border-radius:16px;overflow:hidden;' +
    (isDark ? 'background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.1);' : 'background:#fff;color:#1e293b;border:1px solid #e2e8f0;') +
    '}\n' +
    '.hm-visa-header{padding:20px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid ' + (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9') + ';}\n' +
    '.hm-visa-header h3{margin:0;font-size:18px;font-weight:700;}\n' +
    '.hm-visa-header span{font-size:13px;opacity:0.5;}\n' +
    '.hm-visa-card{padding:16px 24px;border-bottom:1px solid ' + (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9') + ';transition:background 0.15s;}\n' +
    '.hm-visa-card:hover{background:' + (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc') + ';}\n' +
    '.hm-visa-card:last-child{border-bottom:none;}\n' +
    '.hm-visa-title{font-size:15px;font-weight:600;margin:0 0 4px;}\n' +
    '.hm-visa-badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;margin-bottom:8px;' +
    (isDark ? 'background:rgba(59,130,246,0.15);color:#60a5fa;' : 'background:#eff6ff;color:#2563eb;') + '}\n' +
    '.hm-visa-desc{font-size:13px;opacity:0.6;margin:0 0 12px;line-height:1.5;}\n' +
    '.hm-visa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}\n' +
    '.hm-visa-stat{font-size:12px;}\n' +
    '.hm-visa-stat-label{opacity:0.4;font-size:11px;}\n' +
    '.hm-visa-stat-value{font-weight:600;}\n' +
    '.hm-visa-footer{padding:12px 24px;text-align:center;font-size:11px;opacity:0.3;}\n' +
    '.hm-visa-footer a{color:inherit;text-decoration:none;}\n' +
    '.hm-visa-footer a:hover{opacity:1;text-decoration:underline;}\n' +
    '.hm-visa-loading{padding:40px;text-align:center;opacity:0.4;}\n' +
    '.hm-visa-error{padding:24px;text-align:center;color:#ef4444;}\n' +
    '@keyframes hm-spin{to{transform:rotate(360deg)}}\n' +
    '.hm-spinner{width:24px;height:24px;border:2px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0') + ';border-top-color:' + (isDark ? '#60a5fa' : '#3b82f6') + ';border-radius:50%;animation:hm-spin 0.6s linear infinite;margin:0 auto 12px;}';

  // Inject styles
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── Render ──
  var container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error('[HireMatch] Container #' + CONTAINER_ID + ' not found');
    return;
  }

  container.innerHTML = '<div class="hm-visa-widget"><div class="hm-visa-loading"><div class="hm-spinner"></div>Loading visa data...</div></div>';

  // Fetch data
  var url = COUNTRY ? API_BASE + '/rules/' + COUNTRY : API_BASE + '/rules?per_page=20';

  fetch(url, {
    headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
  })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'API error'); });
      return res.json();
    })
    .then(function (json) {
      var rules = json.data || [];
      if (rules.length === 0) {
        container.innerHTML = '<div class="hm-visa-widget"><div class="hm-visa-loading">No visa rules found.</div></div>';
        return;
      }

      var countryName = COUNTRY ? COUNTRY.toUpperCase() : 'All Countries';
      var html = '<div class="hm-visa-widget">';
      html += '<div class="hm-visa-header"><h3>Visa Rules — ' + escapeHtml(countryName) + '</h3><span>' + rules.length + ' type' + (rules.length > 1 ? 's' : '') + '</span></div>';

      rules.forEach(function (rule) {
        html += '<div class="hm-visa-card">';
        html += '<p class="hm-visa-title">' + escapeHtml(rule.title) + '</p>';
        html += '<span class="hm-visa-badge">' + escapeHtml(rule.visa_type) + '</span>';
        if (rule.description) html += '<p class="hm-visa-desc">' + escapeHtml(truncate(rule.description, 120)) + '</p>';
        html += '<div class="hm-visa-grid">';
        if (rule.processing_time) html += stat('Processing', rule.processing_time);
        if (rule.cost) html += stat('Cost', rule.cost);
        if (rule.validity) html += stat('Validity', rule.validity);
        html += '</div></div>';
      });

      html += '<div class="hm-visa-footer">Powered by <a href="https://www.hirematch.com" target="_blank" rel="noopener">HireMatch</a></div>';
      html += '</div>';

      container.innerHTML = html;
    })
    .catch(function (err) {
      container.innerHTML = '<div class="hm-visa-widget"><div class="hm-visa-error">' + escapeHtml(err.message) + '</div></div>';
    });

  function stat(label, value) {
    return '<div class="hm-visa-stat"><div class="hm-visa-stat-label">' + label + '</div><div class="hm-visa-stat-value">' + escapeHtml(value) + '</div></div>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function truncate(str, max) {
    return str && str.length > max ? str.slice(0, max) + '...' : str;
  }
})();
