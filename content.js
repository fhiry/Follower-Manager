// content.js — Full Rewrite v3 (Toast System + Unfollow Queue)
(function () {
  if (window.instaCheckerInjected) return;
  window.instaCheckerInjected = true;

  // ─── Inject interceptor into Main World ───────────────────────────────────
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();

  // ─── State ────────────────────────────────────────────────────────────────
  let followers    = new Set();
  let following    = new Set();
  let recordingType = null;
  let domObserver  = null;
  let shadow       = null;

  // ─── Load persisted data ──────────────────────────────────────────────────
  chrome.storage.local.get(['followers', 'following'], (res) => {
    if (res.followers) followers = new Set(res.followers);
    if (res.following) following = new Set(res.following);
    updateHudCounter();
  });

  // ─── Network interception: list data ─────────────────────────────────────
  window.addEventListener('IG_CHECKER_DATA', (e) => {
    const { listType, users } = e.detail;
    if (!recordingType || recordingType !== listType) return;

    const activeSet = listType === 'followers' ? followers : following;
    let added = 0;
    users.forEach(u => { if (!activeSet.has(u)) { activeSet.add(u); added++; } });

    if (added > 0) {
      updateHudCounter();
      saveCurrentState();
      chrome.runtime.sendMessage({ action: 'updateCount', type: listType, count: activeSet.size }).catch(() => {});
    }
  });

  // ─── Network interception: (no longer used for queue, kept for future) ───
  window.addEventListener('IG_CHECKER_UNFOLLOW', () => {
    // We rely on manual 'Enter' key for batch skipping now.
  });


  // ─── DOM Fallback Parser ──────────────────────────────────────────────────
  const manuallyRemoved = new Set(); // Track explicitly removed users so they aren't auto-added back

  function extractUsersFromDom() {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return;

    let countChanged = false;

    // Infer list type if not recording, do this once per function call, NOT in the loop
    let currentListType = recordingType;
    if (!currentListType) {
      const titleEl = dialog.querySelector('h1, h2, h3, div[dir="auto"]');
      const t = titleEl ? titleEl.textContent.toLowerCase() : '';
      if (t.includes('follower') || t.includes('pengikut')) currentListType = 'followers';
      else if (t.includes('following') || t.includes('mengikuti')) currentListType = 'following';
    }

    dialog.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      const clean = href.split('?')[0].split('#')[0];
      const parts = clean.split('/').filter(p => p.length > 0);
      if (parts.length !== 1) return;
      
      const username = parts[0];
      const excluded = ['explore','reels','stories','direct','p','developer','about','blog','help','privacy','terms'];
      if (excluded.includes(username)) return;

      // Ensure this is the text link, not the avatar picture link
      if (!link.textContent || !link.textContent.trim().startsWith(username)) return;

      // Determine which set this user likely belongs to
      let targetSet = null;
      if (currentListType === 'followers') targetSet = followers;
      else if (currentListType === 'following') targetSet = following;

      // Check if user is in any database
      let inDatabase = followers.has(username) || following.has(username);

      // Auto-add if currently recording and not removed manually
      if (recordingType && targetSet && !targetSet.has(username) && !manuallyRemoved.has(username)) { 
        targetSet.add(username); 
        inDatabase = true;
        countChanged = true; 
      }

      // Inject UI Checkbox if not present
      if (!link.hasAttribute('data-ig-checker-handled')) {
        link.setAttribute('data-ig-checker-handled', 'true');
        link.style.display = 'inline-flex';
        link.style.alignItems = 'center';

        const btn = document.createElement('span');
        btn.className = 'ig-checker-toggle-btn';
        btn.style.marginLeft = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        btn.style.userSelect = 'none';
        btn.title = 'Click to toggle record status';
        
        // Sync visual state
        const updateVisuals = () => {
          if (inDatabase) {
            btn.textContent = '✅';
            btn.style.opacity = '1';
          } else {
            btn.textContent = '⬜'; // Empty box
            btn.style.opacity = '0.5';
          }
        };

        updateVisuals();

        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!targetSet) {
            showToast('Cannot determine if this is Followers or Following list. Start recording first!', 'warning');
            return;
          }

          if (inDatabase) {
            // Remove from both sets entirely
            followers.delete(username);
            following.delete(username);
            manuallyRemoved.add(username);
            inDatabase = false;
          } else {
            // Add to current target set
            targetSet.add(username);
            manuallyRemoved.delete(username);
            inDatabase = true;
          }
          
          updateVisuals();
          updateHudCounter();
          saveCurrentState();
          chrome.runtime.sendMessage({ action: 'updateCount', type: 'followers', count: followers.size }).catch(() => {});
          chrome.runtime.sendMessage({ action: 'updateCount', type: 'following', count: following.size }).catch(() => {});
        };

        link.appendChild(btn);
      } else {
        // Just sync visual state in case it changed
        const btn = link.querySelector('.ig-checker-toggle-btn');
        if (btn) {
          if (inDatabase) {
            btn.textContent = '✅';
            btn.style.opacity = '1';
          } else {
            btn.textContent = '⬜';
            btn.style.opacity = '0.5';
          }
        }
      }
    });

    if (countChanged) {
      updateHudCounter();
      saveCurrentState();
      if (recordingType) {
        chrome.runtime.sendMessage({ action: 'updateCount', type: recordingType, count: (recordingType === 'followers' ? followers.size : following.size) }).catch(() => {});
      }
    }
  }

  let domObserverTimeout = null;

  function startDomObserver() {
    if (domObserver) domObserver.disconnect();
    extractUsersFromDom();
    domObserver = new MutationObserver(() => {
      if (domObserverTimeout) clearTimeout(domObserverTimeout);
      domObserverTimeout = setTimeout(extractUsersFromDom, 100);
    });
    
    // Ensure body exists before observing
    if (document.body) {
      domObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        domObserver.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
  function stopDomObserver() {
    // We don't stop the observer when recording stops, to keep visual annotations active
  }

  function saveCurrentState() {
    const data = { lastScan: new Date().toISOString() };
    if (recordingType === 'followers') data.followers = Array.from(followers);
    if (recordingType === 'following') data.following = Array.from(following);
    chrome.storage.local.set(data);
  }

  // ─── Shadow DOM Setup ─────────────────────────────────────────────────────
  function mountHud() {
    if (document.getElementById('insta-checker-hud-root')) return;
    if (!document.body) return;

    const root = document.createElement('div');
    root.id = 'insta-checker-hud-root';
    document.body.appendChild(root);
    shadow = root.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

      /* ── Wrapper stacks toasts above HUD ── */
      .wrapper {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        width: 300px;
      }

      /* ── Toast Stack ── */
      .toast-stack {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 11px 14px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,0.07);
        box-shadow: 0 4px 24px rgba(0,0,0,0.35);
        font-size: 13px;
        color: #e2e8f0;
        line-height: 1.4;
        animation: toast-in 0.25s cubic-bezier(0.4,0,0.2,1);
        transition: opacity 0.2s, transform 0.2s;
        cursor: default;
      }
      .toast.info    { border-color: rgba(59,130,246,0.35); }
      .toast.success { border-color: rgba(16,185,129,0.35); }
      .toast.warning { border-color: rgba(245,158,11,0.35); }
      .toast.error   { border-color: rgba(239,68,68,0.35);  }

      .toast-icon { font-size: 14px; line-height: 1.4; flex-shrink: 0; }
      .toast-msg  { flex: 1; }
      .toast-close {
        background: none; border: none; color: #64748b;
        cursor: pointer; font-size: 16px; line-height: 1;
        padding: 0; flex-shrink: 0; transition: color 0.15s;
      }
      .toast-close:hover { color: #f8fafc; }

      /* Progress bar */
      .toast-progress {
        height: 2px;
        background: rgba(255,255,255,0.12);
        border-radius: 0 0 11px 11px;
        overflow: hidden;
        margin: 0 -14px -11px -14px;
      }
      .toast-progress-bar {
        height: 100%;
        border-radius: 2px;
        transition: none;
      }
      .toast.info    .toast-progress-bar { background: #3b82f6; }
      .toast.success .toast-progress-bar { background: #10b981; }
      .toast.warning .toast-progress-bar { background: #f59e0b; }
      .toast.error   .toast-progress-bar { background: #ef4444; }

      @keyframes toast-in {
        from { opacity: 0; transform: translateX(20px) scale(0.96); }
        to   { opacity: 1; transform: translateX(0)    scale(1); }
      }

      /* ── HUD Container ── */
      .hud {
        width: 100%;
        background: rgba(15, 23, 42, 0.82);
        backdrop-filter: blur(18px) saturate(180%);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        color: #f8fafc;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
      }
      .hud.recording {
        box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.1);
      }
      .hud.minimized {
        width: 52px; height: 52px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      }
      .hud.minimized:hover { transform: scale(1.05); }
      .hud.minimized .hud-body { display: none; }
      .hud.minimized .min-badge { display: flex; }

      .min-badge {
        display: none; flex-direction: column;
        align-items: center; justify-content: center;
        font-size: 10px; font-weight: 700; gap: 1px; width: 100%;
      }
      .min-badge-icon { font-size: 18px; }
      .min-badge-count { color: #3b82f6; }
      .min-badge-count.rec { color: #ef4444; }

      .hud-body { padding: 14px; }
      .hud-header {
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 10px;
      }
      .hud-title {
        font-size: 15px; font-weight: 800; letter-spacing: -0.02em;
        background: linear-gradient(to right, #f09433,#e6683c,#dc2743,#cc2366,#bc1888);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .hud-min-btn {
        background: none; border: none; color: #64748b;
        cursor: pointer; font-size: 20px; padding: 0;
        line-height: 1; transition: color 0.15s;
      }
      .hud-min-btn:hover { color: #f8fafc; }

      .status-row {
        display: flex; align-items: center;
        gap: 8px; margin-bottom: 12px;
        font-size: 12px; color: #94a3b8;
      }
      .dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #22c55e; flex-shrink: 0;
      }
      .dot.rec {
        background: #ef4444;
        animation: pulse 1.8s infinite ease-in-out;
      }
      @keyframes pulse {
        0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,.7); }
        50%      { transform: scale(1.2); box-shadow: 0 0 0 5px rgba(239,68,68,0); }
      }

      .counter-box {
        background: rgba(30,41,59,0.5);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 10px; padding: 12px;
        text-align: center; margin-bottom: 12px;
      }
      .counter-num {
        font-size: 34px; font-weight: 700;
        color: #f8fafc; line-height: 1;
        letter-spacing: -0.03em;
      }
      .counter-lbl {
        font-size: 10px; color: #64748b;
        text-transform: uppercase; letter-spacing: 0.06em;
        margin-top: 3px;
      }

      .btn {
        width: 100%; border: none; border-radius: 8px;
        padding: 10px; font-size: 13px; font-weight: 600;
        cursor: pointer; color: #fff;
        transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
      }
      .btn.start  { background: #3b82f6; }
      .btn.start:hover  { background: #2563eb; transform: translateY(-1px); }
      .btn.stop   { background: #ef4444; }
      .btn.stop:hover   { background: #dc2626; transform: translateY(-1px); }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    // Toast stack (renders above HUD)
    const toastStack = document.createElement('div');
    toastStack.className = 'toast-stack';
    toastStack.id = 'toast-stack';

    // HUD
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.id = 'hud';
    hud.innerHTML = `
      <div class="min-badge">
        <span class="min-badge-icon">📊</span>
        <span class="min-badge-count" id="min-count">0</span>
      </div>
      <div class="hud-body">
        <div class="hud-header">
          <span class="hud-title">Insta Checker</span>
          <button class="hud-min-btn" id="hud-min-btn">×</button>
        </div>
        <div class="status-row">
          <div class="dot" id="status-dot"></div>
          <span id="status-txt">Idle</span>
        </div>
        <div class="counter-box">
          <div class="counter-num" id="counter-num">0</div>
          <div class="counter-lbl" id="counter-lbl">Users Collected</div>
        </div>
        <button class="btn start" id="action-btn">Start Recording</button>
      </div>
    `;

    wrapper.appendChild(toastStack);
    wrapper.appendChild(hud);
    shadow.appendChild(style);
    shadow.appendChild(wrapper);

    // ── HUD Events ──
    shadow.getElementById('hud-min-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      hud.classList.add('minimized');
    });
    hud.addEventListener('click', () => {
      if (hud.classList.contains('minimized')) hud.classList.remove('minimized');
    });
    shadow.getElementById('action-btn').addEventListener('click', () => {
      if (!recordingType) startRecording();
      else stopRecording();
    });

    // ── Check if queue mode on page load ──
    checkQueueMode();
  }

  // ─── Toast System ─────────────────────────────────────────────────────────
  function showToast(msg, type = 'info', duration = 4000) {
    if (!shadow) return;
    const stack = shadow.getElementById('toast-stack');
    if (!stack) return;

    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🔴' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" title="Dismiss">×</button>
      ${duration > 0 ? '<div class="toast-progress"><div class="toast-progress-bar" id="tpb-' + Date.now() + '"></div></div>' : ''}
    `;

    // X dismiss
    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));

    // Prepend → newest appears at top of stack
    stack.prepend(toast);

    // Auto-dismiss with progress bar
    if (duration > 0) {
      const bar = toast.querySelector('.toast-progress-bar');
      if (bar) {
        bar.style.width = '100%';
        bar.style.transition = `width ${duration}ms linear`;
        requestAnimationFrame(() => { bar.style.width = '0%'; });
      }
      setTimeout(() => dismissToast(toast), duration);
    }

    return toast;
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 220);
  }

  // ─── Recording Controls ───────────────────────────────────────────────────
  function startRecording() {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) {
      showToast('Open your Followers or Following list on Instagram first!', 'warning', 5000);
      return;
    }

    // Try to auto-detect list type from dialog header
    let detected = null;
    dialog.querySelectorAll('span, h1, h2, h3').forEach(el => {
      const t = el.textContent.toLowerCase();
      if (t.includes('follower') && !t.includes('following') && !detected) detected = 'followers';
      if (t.includes('following') && !detected) detected = 'following';
    });

    if (detected) {
      // Auto-detected — start immediately
      _beginRecording(detected);
    } else {
      // Can't auto-detect — show a toast with inline choice buttons
      const pickToast = showToast('Which list are you recording?', 'info', 0);
      if (pickToast) {
        const btnsDiv = document.createElement('div');
        btnsDiv.style.cssText = 'display:flex; gap:6px; margin-top:8px;';

        ['Followers', 'Following'].forEach(label => {
          const btn = document.createElement('button');
          btn.textContent = label;
          btn.style.cssText = `
            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
            border-radius: 6px; color: #f8fafc; font-size: 11px; font-weight: 600;
            padding: 4px 10px; cursor: pointer; transition: all 0.15s;
          `;
          btn.addEventListener('click', () => {
            dismissToast(pickToast);
            _beginRecording(label.toLowerCase());
          });
          btnsDiv.appendChild(btn);
        });

        pickToast.querySelector('.toast-msg').appendChild(btnsDiv);
      }
    }
  }

  function _beginRecording(type) {
    recordingType = type;
    if (recordingType === 'followers') followers.clear();
    else following.clear();

    const dot    = shadow.getElementById('status-dot');
    const txt    = shadow.getElementById('status-txt');
    const btn    = shadow.getElementById('action-btn');
    const lbl    = shadow.getElementById('counter-lbl');
    const hud    = shadow.getElementById('hud');
    const minCnt = shadow.getElementById('min-count');

    dot.classList.add('rec');
    txt.textContent = `Recording ${recordingType}...`;
    btn.textContent = 'Stop & Save';
    btn.className = 'btn stop';
    lbl.textContent = `${recordingType} collected`;
    hud.classList.add('recording');
    minCnt.classList.add('rec');

    updateHudCounter();
    startDomObserver();

    showToast(`🔴 Recording ${recordingType}… scroll the list!`, 'info', 0);
  }

  function stopRecording() {
    stopDomObserver();
    saveCurrentState();

    const dot    = shadow.getElementById('status-dot');
    const txt    = shadow.getElementById('status-txt');
    const btn    = shadow.getElementById('action-btn');
    const lbl    = shadow.getElementById('counter-lbl');
    const hud    = shadow.getElementById('hud');
    const minCnt = shadow.getElementById('min-count');

    const savedCount = recordingType === 'followers' ? followers.size : following.size;

    dot?.classList.remove('rec');
    if (txt) txt.textContent = 'Idle';
    if (btn) {
      btn.textContent = 'Start Recording';
      btn.className = 'btn start';
    }
    if (lbl) lbl.textContent = 'Users Collected';
    hud?.classList.remove('recording');
    minCnt?.classList.remove('rec');

    // Dismiss all persistent toasts
    shadow.querySelectorAll('.toast').forEach(t => dismissToast(t));
    showToast(`✅ Saved ${savedCount} ${recordingType}!`, 'success');

    recordingType = null;
    updateHudCounter();
  }

  function updateHudCounter() {
    if (!shadow) return;
    const el  = shadow.getElementById('counter-num');
    const min = shadow.getElementById('min-count');
    let count = 0;
    if (recordingType === 'followers') count = followers.size;
    else if (recordingType === 'following') count = following.size;
    else count = Math.max(followers.size, following.size);
    if (el)  el.textContent  = count;
    if (min) min.textContent = count;
  }

  // ─── Synchronized Batch Queue Mode ───────────────────────────────────────
  
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'BATCH_COMPLETE') {
      showToast('✅ Queue complete! All batches done.', 'success');
    }
  });

  function checkQueueMode() {
    chrome.runtime.sendMessage({ action: 'CHECK_BATCH_STATUS' }, (res) => {
      if (!res || !res.isBatchTab) return;
      
      const currentUser = res.currentUser;
      const pathUser    = window.location.pathname.split('/').filter(p => p)[0];
      
      if (pathUser === currentUser) {
        // Show batch toast
        const toast = showToast(
          `🎯 Batch | Queue ${res.currentIndex + 1}/${res.total}: @${currentUser}`,
          'warning',
          0
        );

        if (toast) {
          const nextBtn = document.createElement('button');
          nextBtn.textContent = 'Next Batch (Enter)';
          nextBtn.style.cssText = `
            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px; color: #f8fafc; font-size: 11px; font-weight: 600;
            padding: 4px 10px; cursor: pointer; margin-top: 8px; transition: all 0.15s;
            display: inline-block;
          `;
          nextBtn.addEventListener('mouseenter', () => { nextBtn.style.background = 'rgba(255,255,255,0.15)'; });
          nextBtn.addEventListener('mouseleave', () => { nextBtn.style.background = 'rgba(255,255,255,0.08)'; });
          
          let skipTriggered = false;
          const handleNextBatch = () => {
            if (skipTriggered) return;
            skipTriggered = true;
            document.removeEventListener('keydown', handleEnterSkip);
            dismissToast(toast);
            showToast('⏩ Loading next batch across all windows...', 'info', 3000);
            chrome.runtime.sendMessage({ action: 'NEXT_BATCH' });
          };
          
          nextBtn.addEventListener('click', handleNextBatch);
          
          const handleEnterSkip = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleNextBatch();
            }
          };
          document.addEventListener('keydown', handleEnterSkip);
          
          toast.querySelector('.toast-msg').appendChild(document.createElement('br'));
          toast.querySelector('.toast-msg').appendChild(nextBtn);
        }
      }
    });
  }

  // ─── Message handlers from popup ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'getStatus') {
      sendResponse({
        isRecording: recordingType !== null,
        recordingType,
        count: recordingType === 'followers' ? followers.size : following.size,
        followersCount: followers.size,
        followingCount: following.size
      });
    }
    if (req.action === 'showToast') {
      showToast(req.msg, req.type || 'info', req.duration ?? 4000);
    }
    if (req.action === 'toggleExtension') {
      window.location.reload();
    }
    return true;
  });

  // ─── Initialization ───────────────────────────────────────────────────────
  let extensionEnabled = true;
  chrome.storage.local.get(['extensionEnabled'], (res) => {
    if (res.extensionEnabled !== undefined) extensionEnabled = res.extensionEnabled;
    
    if (extensionEnabled) {
      mountHud();
    }
  });

  // SPA navigation guard — remount if Instagram nukes our element
  setInterval(() => {
    if (extensionEnabled && !document.getElementById('insta-checker-hud-root')) {
      mountHud();
    }
  }, 2500);
})();
