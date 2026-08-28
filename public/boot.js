(function () {
  var finished = false;
  var lastFailure = '';
  var sent = {};

  function text(value, limit) {
    return String(value == null ? '' : value).slice(0, limit || 1000);
  }

  function report(type, detail, source) {
    var key = text(type, 40) + ':' + text(detail, 240);
    if (sent[key]) return;
    sent[key] = true;
    lastFailure = text(detail, 1000) || lastFailure;

    try {
      fetch('/api/client-boot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: text(type, 40),
          detail: text(detail, 1000),
          source: text(source, 500),
          href: text(location.href, 1000),
          userAgent: text(navigator.userAgent, 1000),
          online: navigator.onLine
        }),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  window.__memoraReportBoot = report;

  window.addEventListener('error', function (event) {
    var target = event.target;
    var source = event.filename || (target && (target.src || target.href)) || '';
    var detail = event.message || (source ? 'resource_load_failed' : 'unknown_error');
    report('error', detail, source);
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    report('unhandledrejection', reason && (reason.stack || reason.message) || reason || 'unknown_rejection', '');
  });

  window.__memoraBootDone = function () {
    finished = true;
    clearTimeout(window.__memoraBootTimer);
  };

  window.__memoraBootTimer = setTimeout(function () {
    if (finished) return;
    report('timeout', lastFailure || 'application_module_not_started', '');

    var loader = document.getElementById('global-loader');
    if (!loader) return;
    loader.innerHTML = '';

    var panel = document.createElement('div');
    panel.className = 'global-loader__failure';
    var title = document.createElement('strong');
    title.textContent = 'Загрузка приложения остановилась';
    var message = document.createElement('div');
    message.textContent = 'Диагностика отправлена на сервер. Повторите загрузку страницы.';
    var button = document.createElement('button');
    button.className = 'global-loader__retry';
    button.type = 'button';
    button.textContent = 'Повторить загрузку';
    button.onclick = function () {
      var next = new URL(location.href);
      next.searchParams.set('recovery', Date.now());
      location.replace(next.href);
    };
    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(button);
    loader.appendChild(panel);
  }, 12000);
})();
