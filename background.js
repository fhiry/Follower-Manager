chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_BATCH_QUEUE') {
    const unfollowQueue = request.queue;
    const queueIndex = request.startIndex || 0;
    
    chrome.tabs.query({ url: "*://*.instagram.com/*" }, (tabs) => {
      // Pick up to 4 tabs
      const batchTabs = tabs.slice(0, 4).map(t => t.id);
      if (batchTabs.length === 0) {
        chrome.storage.local.set({ batchActive: false });
        sendResponse({ success: false, error: 'No Instagram tabs found.' });
        return;
      }
      
      chrome.storage.local.set({
        batchActive: true,
        batchTabs: batchTabs,
        batchQueue: unfollowQueue,
        batchQueueIndex: queueIndex
      }, () => {
        loadCurrentBatch(batchTabs, unfollowQueue, queueIndex);
        sendResponse({ success: true, count: batchTabs.length });
      });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'NEXT_BATCH') {
    chrome.storage.local.get(['batchActive', 'batchTabs', 'batchQueue', 'batchQueueIndex'], (res) => {
      if (!res.batchActive) {
        sendResponse({ success: false });
        return;
      }
      
      const batchTabs = res.batchTabs || [];
      const unfollowQueue = res.batchQueue || [];
      let queueIndex = (res.batchQueueIndex || 0) + batchTabs.length;
      
      if (queueIndex >= unfollowQueue.length) {
        chrome.storage.local.set({ batchActive: false }, () => {
          batchTabs.forEach(id => {
            chrome.tabs.sendMessage(id, { action: 'BATCH_COMPLETE' }).catch(() => {});
          });
          sendResponse({ success: true });
        });
      } else {
        chrome.storage.local.set({ batchQueueIndex: queueIndex }, () => {
          loadCurrentBatch(batchTabs, unfollowQueue, queueIndex);
          sendResponse({ success: true });
        });
      }
    });
    return true;
  }
  
  if (request.action === 'CHECK_BATCH_STATUS') {
    chrome.storage.local.get(['batchActive', 'batchTabs', 'batchQueue', 'batchQueueIndex'], (res) => {
      if (!res.batchActive || !sender.tab || !res.batchTabs || !res.batchTabs.includes(sender.tab.id)) {
        sendResponse({ isBatchTab: false });
        return;
      }
      
      const tabOffset = res.batchTabs.indexOf(sender.tab.id);
      const userIdx = res.batchQueueIndex + tabOffset;
      const unfollowQueue = res.batchQueue || [];
      
      if (userIdx >= unfollowQueue.length) {
        sendResponse({ isBatchTab: false });
        return;
      }
      
      sendResponse({
        isBatchTab: true,
        currentUser: unfollowQueue[userIdx],
        currentIndex: userIdx,
        total: unfollowQueue.length,
        batchSize: res.batchTabs.length
      });
    });
    return true;
  }
});

function loadCurrentBatch(batchTabs, unfollowQueue, queueIndex) {
  batchTabs.forEach((tabId, i) => {
    const userIdx = queueIndex + i;
    if (userIdx < unfollowQueue.length) {
      const username = unfollowQueue[userIdx];
      chrome.tabs.update(tabId, { url: `https://www.instagram.com/${username}/` });
    }
  });
}
