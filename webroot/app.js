let pkgState = {
  system: [],
  user: [],
  frozen: new Set(),
  removed: new Set()
};

function hasKsuBridge() {
  return typeof window.ksu !== 'undefined' && typeof window.ksu.exec === 'function';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    t.style.display = 'none';
  }, 4000);
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
      return {
        status: 'ok',
        mem: mem.trim() || 'N/A',
        users: users.trim() || '0:Owner',
        service: pid.trim() ? 'Running (PID: ' + pid.trim() + ')' : 'Stopped'
      };
    }
    if (action === 'flush') {
      const out = await runShell(`/system/bin/raff-flush ${params.mode || 'safe'}`);
      return { status: 'ok', output: out.trim() };
    }
    if (action === 'clean') {
      const out = await runShell(`/system/bin/cleaner`);
      return { status: 'ok', output: out.trim() };
    }
    if (action === 'service_toggle') {
      const out = await runShell(`/data/adb/raffoptimizer/cleaner/cleaner.service ${params.mode || 'start'}`);
      return { status: 'ok', output: out.trim() };
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
      return { status: 'ok', output: out.trim() };
    }
    if (action === 'remove') {
      const flag = params.mode === 'systemless' ? '--systemless' : '';
      const out = await runShell(`/system/bin/raff-debloat remove "${params.pkg}" --user "${params.user || 'all'}" ${flag}`);
      return { status: 'ok', output: out.trim() };
    }
    if (action === 'restore') {
      const out = await runShell(`/system/bin/raff-debloat restore "${params.pkg}" --user "${params.user || 'all'}"`);
      return { status: 'ok', output: out.trim() };
    }
    if (action === 'logs') {
      const c = await runShell(`cat /data/adb/raffoptimizer/run/cleaner.log 2>/dev/null | tail -n 30`);
      const f = await runShell(`cat /data/adb/raffoptimizer/run/flush.log 2>/dev/null | tail -n 20`);
      const d = await runShell(`cat /data/adb/raffoptimizer/run/debloat.log /data/adb/raffoptimizer/run/freeze.log 2>/dev/null | tail -n 30`);
      return { status: 'ok', cleaner_log: c, flush_log: f, apk_log: d };
    }
  } else {
    const qs = new URLSearchParams({ action, ...params }).toString();
    try {
      const res = await fetch(`/cgi-bin/api.sh?${qs}`);
      return await res.json();
    } catch (e) {
      return { status: 'error', output: 'Failed to reach CGI server. Run su -c raff-webui open in Termux or open via KernelSU/APatch/MMRL WebUI.' };
    }
  }
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');
  if (tabId === 'freeze' || tabId === 'debloat') {
    if (pkgState.system.length === 0 && pkgState.user.length === 0) {
      loadPackages();
    }
  } else if (tabId === 'logs') {
    loadLogs();
  }
}

async function loadStats() {
  document.getElementById('bridge-mode').textContent = hasKsuBridge() ? 'Native Root Bridge' : 'HTTP CGI Bridge';
  const data = await apiCall('stats');
  if (data && data.status === 'ok') {
    document.getElementById('stat-ram').textContent = data.mem || 'N/A';
    document.getElementById('stat-service').textContent = data.service || 'Unknown';
    document.getElementById('stat-users').textContent = data.users ? data.users.replace(/,/g, ', ') : '0:Owner';
    populateUserDropdowns(data.users || '0:Owner');
  }
}

function populateUserDropdowns(usersStr) {
  const entries = usersStr.split(',').filter(Boolean);
  ['freeze-user-select', 'debloat-user-select'].forEach(selId => {
    const sel = document.getElementById(selId);
    const current = sel.value || 'all';
    sel.innerHTML = `<option value="all">Target: All Users (${entries.map(e => e.split(':')[0]).join(', ')})</option>`;
    entries.forEach(item => {
      const [id, name] = item.split(':');
      if (id) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `Target: User ${id} (${name || 'Profile'})`;
        sel.appendChild(opt);
      }
    });
    if (!entries.some(e => e.startsWith('10:'))) {
      const opt10 = document.createElement('option');
      opt10.value = '10';
      opt10.textContent = 'Target: User 10 (Work / Clone)';
      sel.appendChild(opt10);
    }
    sel.value = current;
  });
}

async function runFlush(mode) {
  showToast(`Running RAM Flush (${mode})...`);
  const res = await apiCall('flush', { mode });
  showToast(res.output || 'RAM Flush completed!');
  loadStats();
}

async function runCleanCache() {
  showToast('Cleaning application caches...');
  const res = await apiCall('clean');
  showToast(res.output || 'Caches cleaned successfully!');
  loadStats();
}

async function toggleCleanerService(mode) {
  showToast(`${mode === 'start' ? 'Starting' : 'Stopping'} Auto Cache Cleaner service...`);
  const res = await apiCall('service_toggle', { mode });
  showToast(res.output || 'Service status updated!');
  loadStats();
}

async function loadPackages() {
  const user = document.getElementById('freeze-user-select').value || '0';
  showToast('Loading APK list...');
  const res = await apiCall('packages', { user });
  if (res && res.status === 'ok') {
    pkgState.system = (res.system || '').split(',').filter(Boolean);
    pkgState.user = (res.user || '').split(',').filter(Boolean);
    pkgState.frozen = new Set((res.frozen || '').split(',').filter(Boolean));
    pkgState.removed = new Set((res.removed || '').split(',').filter(Boolean));
    renderFreezeList();
    renderDebloatList();
    showToast(`Loaded ${pkgState.system.length + pkgState.user.length} APK packages.`);
  }
}

function renderFreezeList() {
  const filter = document.getElementById('freeze-filter-select').value;
  const q = (document.getElementById('freeze-search').value || '').toLowerCase();
  const container = document.getElementById('freeze-pkg-list');

  let items = [];
  if (filter === 'all' || filter === 'user' || filter === 'frozen') {
    pkgState.user.forEach(p => items.push({ pkg: p, type: 'user', frozen: pkgState.frozen.has(p) }));
  }
  if (filter === 'all' || filter === 'system' || filter === 'frozen') {
    pkgState.system.forEach(p => items.push({ pkg: p, type: 'system', frozen: pkgState.frozen.has(p) }));
  }
  if (filter === 'frozen') {
    items = items.filter(i => i.frozen);
  }
  if (q) {
    items = items.filter(i => i.pkg.toLowerCase().includes(q));
  }

  if (items.length === 0) {
    container.innerHTML = `<div class="pkg-item"><span class="pkg-name">No matching packages found.</span></div>`;
    return;
  }

  container.innerHTML = items.slice(0, 250).map(item => `
    <div class="pkg-item">
      <div>
        <span class="pkg-name">${item.pkg}</span>
        <span class="pkg-tag ${item.type === 'system' ? 'tag-sys' : 'tag-user'}">${item.type === 'system' ? 'System' : 'User'}</span>
        ${item.frozen ? '<span class="pkg-tag tag-frozen">Frozen ❄️</span>' : ''}
      </div>
      <div>
        ${item.frozen
          ? `<button class="btn btn-success" onclick="doFreezeAction('unfreeze', '${item.pkg}')">🔥 Unfreeze</button>`
          : `<button class="btn" onclick="doFreezeAction('freeze', '${item.pkg}')">❄️ Freeze</button>`
        }
      </div>
    </div>
  `).join('');
}

async function doFreezeAction(action, pkg) {
  const user = document.getElementById('freeze-user-select').value || 'all';
  showToast(`${action === 'freeze' ? 'Freezing' : 'Unfreezing'} ${pkg} (User: ${user})...`);
  const res = await apiCall(action, { pkg, user });
  showToast(res.output || 'Done!');
  if (action === 'freeze') pkgState.frozen.add(pkg);
  else pkgState.frozen.delete(pkg);
  renderFreezeList();
}

function freezeManual(action) {
  const pkg = (document.getElementById('freeze-manual-pkg').value || '').trim();
  if (!pkg) return showToast('Please enter a package name first!');
  doFreezeAction(action, pkg);
}

function renderDebloatList() {
  const filter = document.getElementById('debloat-filter-select').value;
  const q = (document.getElementById('debloat-search').value || '').toLowerCase();
  const container = document.getElementById('debloat-pkg-list');

  let items = [];
  if (filter === 'removed') {
    pkgState.removed.forEach(p => items.push({ pkg: p, type: 'removed' }));
  } else {
    if (filter === 'all' || filter === 'system') {
      pkgState.system.forEach(p => items.push({ pkg: p, type: 'system' }));
    }
    if (filter === 'all' || filter === 'user') {
      pkgState.user.forEach(p => items.push({ pkg: p, type: 'user' }));
    }
  }

  if (q) {
    items = items.filter(i => i.pkg.toLowerCase().includes(q));
  }

  if (items.length === 0) {
    container.innerHTML = `<div class="pkg-item"><span class="pkg-name">No packages to display.</span></div>`;
    return;
  }

  container.innerHTML = items.slice(0, 250).map(item => `
    <div class="pkg-item">
      <div>
        <span class="pkg-name">${item.pkg}</span>
        <span class="pkg-tag ${item.type === 'system' ? 'tag-sys' : 'tag-user'}">${item.type === 'system' ? 'System' : item.type === 'removed' ? 'Removed' : 'User'}</span>
      </div>
      <div>
        ${item.type === 'removed'
          ? `<button class="btn btn-success" onclick="doDebloatAction('restore', '${item.pkg}')">♻️ Restore</button>`
          : `<button class="btn btn-danger" onclick="doDebloatAction('remove', '${item.pkg}')">🗑️ Remove</button>`
        }
      </div>
    </div>
  `).join('');
}

async function doDebloatAction(action, pkg) {
  const user = document.getElementById('debloat-user-select').value || 'all';
  const mode = document.getElementById('debloat-mode-select').value || 'systemless';
  showToast(`${action === 'remove' ? 'Removing' : 'Restoring'} ${pkg} (User: ${user})...`);
  const res = await apiCall(action, { pkg, user, mode });
  showToast(res.output || 'Done!');
  if (action === 'remove') pkgState.removed.add(pkg);
  else pkgState.removed.delete(pkg);
  loadPackages();
}

function debloatManual(action) {
  const pkg = (document.getElementById('debloat-manual-pkg').value || '').trim();
  if (!pkg) return showToast('Please enter a package name first!');
  doDebloatAction(action, pkg);
}

async function loadLogs() {
  const res = await apiCall('logs');
  if (res && res.status === 'ok') {
    document.getElementById('log-cleaner').textContent = res.cleaner_log || 'No logs yet.';
    document.getElementById('log-flush').textContent = res.flush_log || 'No logs yet.';
    document.getElementById('log-apk').textContent = res.apk_log || 'No logs yet.';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadStats();
});
