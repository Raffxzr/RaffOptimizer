(() => {
  const M3_ACCENTS = ['#e5988e', '#8ab4f8', '#81c995', '#cfbcff', '#f6aea9', '#fdd663'];
  let accentIndex = 0;

  let pkgState = {
    system: [],
    user: [],
    frozen: new Set(),
    removed: new Set()
  };

  function hasKsuBridge() {
    return typeof window.ksu !== 'undefined' && typeof window.ksu.exec === 'function';
  }

  function stripAnsi(str) {
    return (str || '').replace(/\x1b\[[0-9;]*m/g, '');
  }

  function nowTime() {
    return new Date().toLocaleTimeString('en-GB', { hour12: false });
  }

  function writeTerm(termId, dotId, message, isBusy = false) {
    const term = document.getElementById(termId);
    const dot = document.getElementById(dotId);
    if (dot) dot.classList.toggle('busy', isBusy);
    if (!term) return;
    const cleanMsg = stripAnsi(message).trim();
    if (cleanMsg) {
      term.textContent += `\n[${nowTime()}] ${cleanMsg}`;
      term.scrollTop = term.scrollHeight;
    }
  }

  function applyAccentColor(hexOrColor) {
    if (!hexOrColor) return;
    const formatted = /^[0-9a-fA-F]{6}$/.test(hexOrColor) ? `#${hexOrColor}` : hexOrColor;
    document.documentElement.style.setProperty('--active-accent', formatted);
  }

  function runShell(cmd) {
    return new Promise((resolve) => {
      if (hasKsuBridge()) {
        const cbName = 'ksu_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        window[cbName] = (errno, stdout, stderr) => {
          delete window[cbName];
          resolve((stdout || '') + (stderr ? '\n' + stderr : ''));
        };
        try {
          window.ksu.exec(cmd, '{}', cbName);
        } catch (e) {
          resolve('Error: ' + e.message);
        }
      } else {
        resolve(null);
      }
    });
  }

  async function apiCall(action, params = {}) {
    if (hasKsuBridge()) {
      if (action === 'stats') {
        const mem = await runShell("awk '/MemTotal/ {t=$2} /MemAvailable/ {a=$2} END {if(t>0) printf \"%d / %d MB (%d%%)\", (t-a)/1024, t/1024, ((t-a)*100)/t}' /proc/meminfo");
        const users = await runShell("pm list users 2>/dev/null | grep 'UserInfo{' | sed -E 's/.*UserInfo\\{([0-9]+):([^:]+):.*/\\1:\\2/' | tr '\\n' ',' | sed 's/,$//'");
        const pid = await runShell("ps -ef 2>/dev/null | grep 'crond -c /data/adb/raffoptimizer/run' | grep -v grep | awk '{print $2}' | head -n 1");
        const accentRaw = await runShell("settings get secure theme_customization_overlay_packages 2>/dev/null");
        const match = accentRaw && accentRaw.match(/"android\.theme\.customization\.system_palette"\s*:\s*"#?([0-9a-fA-F]{6})"/);
        return {
          status: 'ok',
          mem: mem.trim() || 'N/A',
          users: users.trim() || '0:Owner',
          service: pid.trim() ? 'Running (PID: ' + pid.trim() + ')' : 'Stopped',
          accent: match ? match[1] : ''
        };
      }
      if (action === 'flush') {
        const out = await runShell(`/system/bin/raff-flush ${params.mode || 'safe'}`);
        return { status: 'ok', output: stripAnsi(out).trim() };
      }
      if (action === 'clean') {
        const out = await runShell(`/system/bin/cleaner`);
        return { status: 'ok', output: stripAnsi(out).trim() };
      }
      if (action === 'service_toggle') {
        const out = await runShell(`/data/adb/raffoptimizer/cleaner/cleaner.service ${params.mode || 'start'}`);
        return { status: 'ok', output: stripAnsi(out).trim() };
      }
      if (action === 'packages') {
        const u = (!params.user || params.user === 'all') ? '0' : params.user;
        const sys = await runShell(`pm list packages -s --user ${u} 2>/dev/null | cut -d: -f2 | sort | tr '\n' ','`);
        const usr = await runShell(`pm list packages -3 --user ${u} 2>/dev/null | cut -d: -f2 | sort | tr '\n' ','`);
        const frz = await runShell(`pm list packages -d --user ${u} 2>/dev/null | cut -d: -f2 | sort | tr '\n' ','`);
        const rem = await runShell(`cat /data/adb/raffoptimizer/config/debloated_apps.list 2>/dev/null | cut -d'|' -f1 | tr '\n' ','`);
        return {
          status: 'ok',
          system: sys.trim(),
          user: usr.trim(),
          frozen: frz.trim(),
          removed: rem.trim()
        };
      }
      if (action === 'freeze' || action === 'unfreeze') {
        const out = await runShell(`/system/bin/raff-freeze ${action} "${params.pkg}" --user "${params.user || 'all'}"`);
        return { status: 'ok', output: stripAnsi(out).trim() };
      }
      if (action === 'remove') {
        const flag = params.mode === 'systemless' ? '--systemless' : '';
        const out = await runShell(`/system/bin/raff-debloat remove "${params.pkg}" --user "${params.user || 'all'}" ${flag}`);
        return { status: 'ok', output: stripAnsi(out).trim() };
      }
      if (action === 'restore') {
        const out = await runShell(`/system/bin/raff-debloat restore "${params.pkg}" --user "${params.user || 'all'}"`);
        return { status: 'ok', output: stripAnsi(out).trim() };
      }
      if (action === 'logs') {
        const c = await runShell(`cat /data/adb/raffoptimizer/run/cleaner.log 2>/dev/null | tail -n 30`);
        const f = await runShell(`cat /data/adb/raffoptimizer/run/flush.log 2>/dev/null | tail -n 20`);
        const d = await runShell(`cat /data/adb/raffoptimizer/run/debloat.log /data/adb/raffoptimizer/run/freeze.log 2>/dev/null | tail -n 30`);
        return { status: 'ok', cleaner_log: stripAnsi(c), flush_log: stripAnsi(f), apk_log: stripAnsi(d) };
      }
      if (action === 'clear_logs') {
        await runShell(`> /data/adb/raffoptimizer/run/cleaner.log; > /data/adb/raffoptimizer/run/flush.log; > /data/adb/raffoptimizer/run/debloat.log; > /data/adb/raffoptimizer/run/freeze.log`);
        return { status: 'ok', output: 'All module logs cleared.' };
      }
    } else {
      const qs = new URLSearchParams({ action, ...params }).toString();
      try {
        const res = await fetch(`/cgi-bin/api.sh?${qs}`);
        return await res.json();
      } catch (e) {
        return {
          status: 'error',
          output: 'Failed to reach CGI server. Run "su -c raff-webui" or open via KernelSU/APatch/MMRL WebUI.'
        };
      }
    }
  }

  // Navigasi Tab
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById('tab-' + tabId).classList.add('active');

      if ((tabId === 'freeze' || tabId === 'debloat') && pkgState.system.length === 0 && pkgState.user.length === 0) {
        loadPackages();
      } else if (tabId === 'logs') {
        loadLogs();
      }
    });
  });

  // Tombol ganti palet warna aksen Material You
  document.getElementById('accent-cycle-btn').addEventListener('click', () => {
    accentIndex = (accentIndex + 1) % M3_ACCENTS.length;
    applyAccentColor(M3_ACCENTS[accentIndex]);
  });

  // Tombol Clear di masing-masing Terminal
  document.querySelectorAll('.term-clear-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.textContent = `[${nowTime()}] Console cleared.`;
    });
  });

  function populateUserDropdowns(usersStr) {
    const entries = usersStr.split(',').filter(Boolean);
    ['freeze-user-select', 'debloat-user-select'].forEach((selId) => {
      const sel = document.getElementById(selId);
      const current = sel.value || 'all';
      sel.innerHTML = `<option value="all">Target: All Users (${entries.map((e) => e.split(':')[0]).join(', ')})</option>`;
      entries.forEach((item) => {
        const [id, name] = item.split(':');
        if (id) {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = `Target: User ${id} (${name || 'Profile'})`;
          sel.appendChild(opt);
        }
      });
      if (!entries.some((e) => e.startsWith('10:'))) {
        const opt10 = document.createElement('option');
        opt10.value = '10';
        opt10.textContent = 'Target: User 10 (Work / Clone)';
        sel.appendChild(opt10);
      }
      sel.value = current;
    });
  }

  async function loadStats() {
    document.getElementById('bridge-mode').textContent = hasKsuBridge() ? 'Native Root Bridge' : 'HTTP CGI Bridge';
    const data = await apiCall('stats');
    if (data && data.status === 'ok') {
      document.getElementById('stat-ram').textContent = data.mem || 'N/A';
      document.getElementById('stat-service').textContent = data.service || 'Unknown';
      document.getElementById('stat-users').textContent = data.users ? data.users.replace(/,/g, ', ') : '0:Owner';
      populateUserDropdowns(data.users || '0:Owner');

      if (data.accent) {
        applyAccentColor(data.accent);
      } else if (CSS.supports('color', 'AccentColor')) {
        applyAccentColor('AccentColor');
      }
    }
  }

  document.getElementById('btn-refresh-status').addEventListener('click', () => {
    writeTerm('opt-terminal-body', 'opt-term-dot', 'Refreshing system status...', false);
    loadStats();
  });

  // Flush RAM Actions -> Log ke Optimizer Terminal
  document.querySelectorAll('.action-flush').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      writeTerm('opt-terminal-body', 'opt-term-dot', `$ raff-flush ${mode}\nRunning RAM Flush (${mode} profile)...`, true);
      const res = await apiCall('flush', { mode });
      writeTerm('opt-terminal-body', 'opt-term-dot', res.output || 'RAM Flush completed!', false);
      loadStats();
    });
  });

  // Cache Cleaner Actions -> Log ke Optimizer Terminal
  document.getElementById('btn-clean-now').addEventListener('click', async () => {
    writeTerm('opt-terminal-body', 'opt-term-dot', '$ /system/bin/cleaner\nCleaning application caches...', true);
    const res = await apiCall('clean');
    writeTerm('opt-terminal-body', 'opt-term-dot', res.output || 'Caches cleaned successfully!', false);
    loadStats();
  });

  document.getElementById('btn-start-cleaner').addEventListener('click', async () => {
    writeTerm('opt-terminal-body', 'opt-term-dot', '$ cleaner.service start\nStarting Auto Cache Cleaner service...', true);
    const res = await apiCall('service_toggle', { mode: 'start' });
    writeTerm('opt-terminal-body', 'opt-term-dot', res.output || 'Auto-Cleaner service started.', false);
    loadStats();
  });

  document.getElementById('btn-stop-cleaner').addEventListener('click', async () => {
    writeTerm('opt-terminal-body', 'opt-term-dot', '$ cleaner.service stop\nStopping Auto Cache Cleaner service...', true);
    const res = await apiCall('service_toggle', { mode: 'stop' });
    writeTerm('opt-terminal-body', 'opt-term-dot', res.output || 'Auto-Cleaner service stopped.', false);
    loadStats();
  });

  // Load Daftar Paket
  async function loadPackages(selectedUser) {
    const user = (typeof selectedUser === 'string' && selectedUser)
      ? selectedUser
      : (document.getElementById('freeze-user-select').value || '0');
    const res = await apiCall('packages', { user });
    if (res && res.status === 'ok') {
      pkgState.system = (res.system || '').split(',').filter(Boolean);
      pkgState.user = (res.user || '').split(',').filter(Boolean);
      pkgState.frozen = new Set((res.frozen || '').split(',').filter(Boolean));
      pkgState.removed = new Set((res.removed || '').split(',').filter(Boolean));
      renderFreezeList();
      renderDebloatList();
    }
  }

  // Render Daftar Freeze APK (Tombol Seragam)
  function renderFreezeList() {
    const filter = document.getElementById('freeze-filter-select').value;
    const q = (document.getElementById('freeze-search').value || '').toLowerCase().trim();
    const container = document.getElementById('freeze-pkg-list');

    let items = [];
    if (filter === 'all' || filter === 'user' || filter === 'frozen') {
      pkgState.user.forEach((p) => items.push({ pkg: p, type: 'user', frozen: pkgState.frozen.has(p) }));
    }
    if (filter === 'all' || filter === 'system' || filter === 'frozen') {
      pkgState.system.forEach((p) => items.push({ pkg: p, type: 'system', frozen: pkgState.frozen.has(p) }));
    }
    if (filter === 'frozen') {
      items = items.filter((i) => i.frozen);
    }
    if (q) {
      items = items.filter((i) => i.pkg.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      container.innerHTML = `<div class="pkg-item"><span class="pkg-name">No matching packages found.</span></div>`;
      return;
    }

    container.innerHTML = '';
    items.slice(0, 250).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'pkg-item';
      const btnClass = item.frozen ? 'tonal' : 'tonal-primary';
      const btnText = item.frozen ? 'Unfreeze' : 'Freeze';

      row.innerHTML = `
        <div class="pkg-info">
          <span class="pkg-name">${item.pkg}</span>
          <div class="pkg-badges">
            <span class="pkg-tag">${item.type === 'system' ? 'System' : 'User'}</span>
            ${item.frozen ? '<span class="pkg-tag frozen">Frozen</span>' : ''}
          </div>
        </div>
        <button class="m3-btn pkg-action-btn ${btnClass}">
          <span>${btnText}</span>
        </button>
      `;

      row.querySelector('button').addEventListener('click', () => {
        doFreezeAction(item.frozen ? 'unfreeze' : 'freeze', item.pkg);
      });
      container.appendChild(row);
    });
  }

  async function doFreezeAction(action, pkg) {
    const user = document.getElementById('freeze-user-select').value || 'all';
    writeTerm('freeze-terminal-body', 'freeze-term-dot', `$ raff-freeze ${action} ${pkg} --user ${user}`, true);
    const res = await apiCall(action, { pkg, user });
    writeTerm('freeze-terminal-body', 'freeze-term-dot', res.output || 'Done!', false);
    if (action === 'freeze') pkgState.frozen.add(pkg);
    else pkgState.frozen.delete(pkg);
    renderFreezeList();
  }

  document.getElementById('btn-manual-freeze').addEventListener('click', () => {
    const pkg = (document.getElementById('freeze-manual-pkg').value || '').trim();
    if (!pkg) return writeTerm('freeze-terminal-body', 'freeze-term-dot', 'Error: Please enter a package name first!');
    doFreezeAction('freeze', pkg);
  });

  document.getElementById('btn-manual-unfreeze').addEventListener('click', () => {
    const pkg = (document.getElementById('freeze-manual-pkg').value || '').trim();
    if (!pkg) return writeTerm('freeze-terminal-body', 'freeze-term-dot', 'Error: Please enter a package name first!');
    doFreezeAction('unfreeze', pkg);
  });

  // Render Daftar Debloat APK (Tombol Seragam)
  function renderDebloatList() {
    const filter = document.getElementById('debloat-filter-select').value;
    const q = (document.getElementById('debloat-search').value || '').toLowerCase().trim();
    const container = document.getElementById('debloat-pkg-list');

    let items = [];
    if (filter === 'removed') {
      pkgState.removed.forEach((p) => items.push({ pkg: p, type: 'removed' }));
    } else {
      if (filter === 'all' || filter === 'system') {
        pkgState.system.forEach((p) => items.push({ pkg: p, type: 'system' }));
      }
      if (filter === 'all' || filter === 'user') {
        pkgState.user.forEach((p) => items.push({ pkg: p, type: 'user' }));
      }
    }
    if (q) {
      items = items.filter((i) => i.pkg.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      container.innerHTML = `<div class="pkg-item"><span class="pkg-name">No packages to display.</span></div>`;
      return;
    }

    container.innerHTML = '';
    items.slice(0, 250).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'pkg-item';
      const isRemoved = item.type === 'removed';
      const btnClass = isRemoved ? 'tonal' : 'filled-danger';
      const btnText = isRemoved ? 'Restore' : 'Remove';

      row.innerHTML = `
        <div class="pkg-info">
          <span class="pkg-name">${item.pkg}</span>
          <div class="pkg-badges">
            <span class="pkg-tag ${isRemoved ? 'frozen' : ''}">${item.type === 'system' ? 'System' : isRemoved ? 'Removed' : 'User'}</span>
          </div>
        </div>
        <button class="m3-btn pkg-action-btn ${btnClass}">
          <span>${btnText}</span>
        </button>
      `;

      row.querySelector('button').addEventListener('click', () => {
        doDebloatAction(isRemoved ? 'restore' : 'remove', item.pkg);
      });
      container.appendChild(row);
    });
  }

  async function doDebloatAction(action, pkg) {
    const user = document.getElementById('debloat-user-select').value || 'all';
    const mode = document.getElementById('debloat-mode-select').value || 'systemless';
    const flagStr = action === 'remove' && mode === 'systemless' ? ' --systemless' : '';
    writeTerm('debloat-terminal-body', 'debloat-term-dot', `$ raff-debloat ${action} ${pkg} --user ${user}${flagStr}`, true);
    const res = await apiCall(action, { pkg, user, mode });
    writeTerm('debloat-terminal-body', 'debloat-term-dot', res.output || 'Done!', false);
    if (action === 'remove') pkgState.removed.add(pkg);
    else pkgState.removed.delete(pkg);
    loadPackages();
  }

  document.getElementById('btn-manual-remove').addEventListener('click', () => {
    const pkg = (document.getElementById('debloat-manual-pkg').value || '').trim();
    if (!pkg) return writeTerm('debloat-terminal-body', 'debloat-term-dot', 'Error: Please enter a package name first!');
    doDebloatAction('remove', pkg);
  });

  document.getElementById('btn-manual-restore').addEventListener('click', () => {
    const pkg = (document.getElementById('debloat-manual-pkg').value || '').trim();
    if (!pkg) return writeTerm('debloat-terminal-body', 'debloat-term-dot', 'Error: Please enter a package name first!');
    doDebloatAction('restore', pkg);
  });

  // Filter & Search Listeners
  document.getElementById('freeze-user-select').addEventListener('change', (e) => loadPackages(e.target.value));
  document.getElementById('freeze-filter-select').addEventListener('change', renderFreezeList);
  document.getElementById('freeze-search').addEventListener('input', renderFreezeList);
  document.getElementById('btn-reload-freeze').addEventListener('click', () => {
    writeTerm('freeze-terminal-body', 'freeze-term-dot', 'Reloading package list...', false);
    loadPackages(document.getElementById('freeze-user-select').value);
  });

  document.getElementById('debloat-user-select').addEventListener('change', (e) => loadPackages(e.target.value));
  document.getElementById('debloat-filter-select').addEventListener('change', renderDebloatList);
  document.getElementById('debloat-search').addEventListener('input', renderDebloatList);
  document.getElementById('btn-reload-debloat').addEventListener('click', () => {
    writeTerm('debloat-terminal-body', 'debloat-term-dot', 'Reloading package list...', false);
    loadPackages(document.getElementById('debloat-user-select').value);
  });

  // Logs Tab
  async function loadLogs() {
    const res = await apiCall('logs');
    if (res && res.status === 'ok') {
      document.getElementById('log-cleaner').textContent = res.cleaner_log || 'No logs yet.';
      document.getElementById('log-flush').textContent = res.flush_log || 'No logs yet.';
      document.getElementById('log-apk').textContent = res.apk_log || 'No logs yet.';
    }
  }

  document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);
  document.getElementById('btn-clear-logs').addEventListener('click', async () => {
    await apiCall('clear_logs');
    loadLogs();
  });

  window.addEventListener('DOMContentLoaded', () => {
    loadStats();
  });
})();