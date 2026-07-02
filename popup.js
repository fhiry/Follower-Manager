// popup.js - Full Rewrite
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statFollowers = document.getElementById('stat-followers');
  const statFollowing = document.getElementById('stat-following');
  const lastScanTxt = document.getElementById('last-scan-txt');
  
  const badgeNotFollowing = document.getElementById('badge-not-following');
  const badgeFans = document.getElementById('badge-fans');
  const badgeMutuals = document.getElementById('badge-mutuals');
  
  const recordingBanner = document.getElementById('recording-banner');
  const recordingText = document.getElementById('recording-text');
  
  const userList = document.getElementById('user-list');
  const emptyState = document.getElementById('empty-state');
  
  const exportBtn       = document.getElementById('export-btn');
  const resetBtn        = document.getElementById('reset-btn');
  const tabButtons      = document.querySelectorAll('.tab-btn');
  const queueBar        = document.getElementById('queue-bar');
  const queueInfo       = document.getElementById('queue-info');
  const startQueueBtn   = document.getElementById('start-queue-btn');
  const startIndexInput = document.getElementById('start-index-input');
  const confirmPanel    = document.getElementById('confirm-panel');
  const confirmMsg      = document.getElementById('confirm-msg');
  const confirmOk       = document.getElementById('confirm-ok');
  const confirmCancel   = document.getElementById('confirm-cancel');
  const toastStack      = document.getElementById('popup-toast-stack');
  const extensionToggle = document.getElementById('extension-toggle');

  let state = {
    followers: [],
    following: [],
    lastScan: null,
    isRecording: false,
    recordingType: null,
    extensionEnabled: true
  };


  // Initialize Toggle
  chrome.storage.local.get(['extensionEnabled'], (res) => {
    if (res.extensionEnabled !== undefined) {
      state.extensionEnabled = res.extensionEnabled;
      extensionToggle.checked = state.extensionEnabled;
    }
  });

  extensionToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    state.extensionEnabled = isEnabled;
    chrome.storage.local.set({ extensionEnabled: isEnabled });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension', enabled: isEnabled }).catch(() => {});
      }
    });
  });

  // ── Custom dialog helpers (no native confirm/alert) ──
  function showPopupToast(msg, type = 'info', duration = 4000) {
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🔴' };
    const t = document.createElement('div');
    t.className = `popup-toast ${type}`;
    t.innerHTML = `
      <span class="popup-toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="popup-toast-msg">${msg}</span>
      <button class="popup-toast-close" title="Dismiss">×</button>
    `;
    t.querySelector('.popup-toast-close').addEventListener('click', () => dismissPopupToast(t));
    toastStack.prepend(t);
    if (duration > 0) setTimeout(() => dismissPopupToast(t), duration);
    return t;
  }
  function dismissPopupToast(el) {
    if (!el || !el.parentNode) return;
    el.style.opacity = '0'; el.style.transform = 'translateY(4px)';
    setTimeout(() => el.remove(), 200);
  }

  // Returns a Promise<boolean>
  function showConfirm(message, okLabel = 'Confirm', okClass = 'danger') {
    return new Promise((resolve) => {
      confirmMsg.textContent = message;
      confirmOk.textContent  = okLabel;
      confirmOk.className    = `btn ${okClass}`;
      confirmPanel.classList.remove('hidden');
      confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      function cleanup(result) {
        confirmPanel.classList.add('hidden');
        confirmOk.replaceWith(confirmOk.cloneNode(true));     // remove old listeners
        confirmCancel.replaceWith(confirmCancel.cloneNode(true));
        resolve(result);
      }
      // Re-query after cloneNode
      confirmPanel.querySelector('#confirm-ok').addEventListener('click', () => cleanup(true),  { once: true });
      confirmPanel.querySelector('#confirm-cancel').addEventListener('click', () => cleanup(false), { once: true });
    });
  }

  // State
  let followers = [];
  let following = [];
  let currentTab = 'not-following'; // 'not-following', 'fans', 'mutuals'
  
  let notFollowingList = [];
  let fansList = [];
  let mutualsList = [];

  // 1. Initial status query to content script
  queryContentScriptStatus();

  // 2. Load stored data
  loadStoredData();

  // Listen for live counts from content script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateCount') {
      loadStoredData();
    }
  });

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-tab');
      renderList();
      updateQueueBar();
    });
  });

  // Export handler
  exportBtn.addEventListener('click', () => {
    let listToCopy = [];
    if (currentTab === 'not-following') listToCopy = notFollowingList;
    else if (currentTab === 'fans') listToCopy = fansList;
    else if (currentTab === 'mutuals') listToCopy = mutualsList;

    if (listToCopy.length === 0) {
      showPopupToast('Nothing to copy in this tab!', 'warning');
      return;
    }

    const textToCopy = listToCopy.join('\n');
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Copied!';
        exportBtn.style.background = 'var(--success)';
        setTimeout(() => {
          exportBtn.textContent = originalText;
          exportBtn.style.background = '';
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  });

  // Reset handler
  resetBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm('Clear all followers & following data? This cannot be undone.', 'Clear Data', 'danger');
    if (!confirmed) return;

    chrome.storage.local.clear(() => {
      followers = [];
      following = [];
      notFollowingList = [];
      fansList = [];
      mutualsList = [];
      
      statFollowers.textContent = '0';
      statFollowing.textContent = '0';
      lastScanTxt.textContent = 'Last scan: Never';
      
      badgeNotFollowing.textContent = '0';
      badgeFans.textContent = '0';
      badgeMutuals.textContent = '0';
      
      renderList();
      updateQueueBar();
    });
  });

  startQueueBtn.addEventListener('click', async () => {
    if (notFollowingList.length === 0) return;

    let startIndex = 0;
    
    // Check manual input first
    const manualStart = parseInt(startIndexInput.value, 10);
    if (!isNaN(manualStart) && manualStart > 0 && manualStart <= notFollowingList.length) {
      startIndex = manualStart - 1; // 0-indexed internally
    } else {
      // Check for checkpoint
      const res = await chrome.storage.local.get(['batchQueue', 'batchQueueIndex']);
      if (res.batchQueue && res.batchQueue.length === notFollowingList.length && res.batchQueueIndex > 0 && res.batchQueueIndex < notFollowingList.length) {
        const resume = await showConfirm(
          `📌 Checkpoint found at user #${res.batchQueueIndex + 1}.\nDo you want to resume from here?\n\n(Click 'Cancel' to restart from 0)`,
          'Resume Queue',
          'info'
        );
        if (resume) {
          startIndex = res.batchQueueIndex;
        }
      }
    }

    const confirmed = await showConfirm(
      `Start 4-Window Batch Queue for ${notFollowingList.length} accounts${startIndex > 0 ? ` (Starting from #${startIndex + 1})` : ''}?\nMake sure you have exactly 4 Instagram tabs open and arranged.`,
      '⚡ Start Queue',
      'danger'
    );
    if (!confirmed) return;

    chrome.runtime.sendMessage({
      action: 'START_BATCH_QUEUE',
      queue: [...notFollowingList],
      startIndex: startIndex
    }, (res) => {
      if (res && res.success) {
        showPopupToast(`Queue started in ${res.count} tabs!`, 'success');
        setTimeout(() => window.close(), 1500);
      } else {
        showPopupToast(`Error: ${res ? res.error : 'Failed to start queue'}`, 'error');
      }
    });
  });

  // Functions
  async function queryContentScriptStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url.includes("instagram.com")) return;

      chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
        if (chrome.runtime.lastError || !response) return;

        if (response.isRecording) {
          recordingBanner.classList.remove('hidden');
          recordingText.textContent = `Scanning ${response.recordingType}... (${response.count} loaded)`;
        } else {
          recordingBanner.classList.add('hidden');
        }
      });
    } catch (e) {
      // Content script not ready or not on Instagram
    }
  }

  function loadStoredData() {
    chrome.storage.local.get(['followers', 'following', 'lastScan'], (res) => {
      followers = res.followers || [];
      following = res.following || [];
      
      statFollowers.textContent = followers.length.toLocaleString();
      statFollowing.textContent = following.length.toLocaleString();
      
      if (res.lastScan) {
        const scanDate = new Date(res.lastScan);
        lastScanTxt.textContent = `Last scan: ${scanDate.toLocaleString()}`;
      } else {
        lastScanTxt.textContent = 'Last scan: Never';
      }

      calculateRelationships();
      renderList();
      updateQueueBar();
    });
  }

  function calculateRelationships() {
    const followersSet = new Set(followers);
    const followingSet = new Set(following);

    // 1. Not following me back: I follow them, but they don't follow me
    notFollowingList = following.filter(user => !followersSet.has(user));

    // 2. Fans: They follow me, but I don't follow them
    fansList = followers.filter(user => !followingSet.has(user));

    // 3. Mutuals: We both follow each other
    mutualsList = following.filter(user => followersSet.has(user));

    // Update badges
    badgeNotFollowing.textContent = notFollowingList.length;
    badgeFans.textContent = fansList.length;
    badgeMutuals.textContent = mutualsList.length;
  }


  function updateQueueBar() {
    if (currentTab === 'not-following' && notFollowingList.length > 0) {
      queueBar.classList.remove('hidden');
      queueInfo.textContent = `${notFollowingList.length} unfollowers in queue`;
    } else {
      queueBar.classList.add('hidden');
    }
  }

  function renderList() {
    userList.innerHTML = '';
    let activeList = [];

    if (currentTab === 'not-following') activeList = notFollowingList;
    else if (currentTab === 'fans') activeList = fansList;
    else if (currentTab === 'mutuals') activeList = mutualsList;

    if (activeList.length === 0) {
      emptyState.classList.remove('hidden');
      userList.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    userList.classList.remove('hidden');

    activeList.forEach(username => {
      const li = document.createElement('li');
      li.className = 'user-item';
      
      li.innerHTML = `
        <a href="https://instagram.com/${username}" target="_blank" class="user-link">@${username}</a>
        <a href="https://instagram.com/${username}" target="_blank" class="action-arrow" title="Visit profile">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      `;
      userList.appendChild(li);
    });
  }
});
