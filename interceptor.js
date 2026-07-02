(function () {
  // ─── Fetch Interceptor ───────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await _fetch.apply(this, args);

    // Robustly extract URL and method regardless of how fetch was called
    let url = '', method = 'GET';

    if (typeof args[0] === 'string') {
      url    = args[0];
      method = (args[1]?.method || 'GET').toUpperCase();
    } else if (args[0] instanceof Request) {
      url    = args[0].url;
      method = (args[0].method || 'GET').toUpperCase();
    } else if (args[0] && args[0].url) {
      url    = args[0].url;
      method = (args[0].method || args[1]?.method || 'GET').toUpperCase();
    }

    // Detect UNFOLLOW — POST to any friendships destroy endpoint
    if (
      method === 'POST' &&
      (url.includes('friendships') || url.includes('friendship')) &&
      (url.includes('destroy') || url.includes('unfollow'))
    ) {
      window.dispatchEvent(new CustomEvent('IG_CHECKER_UNFOLLOW'));
    }

    // Detect FOLLOWERS / FOLLOWING list data (GET only)
    if (
      method === 'GET' &&
      (url.includes('/api/v1/friendships/') || url.includes('/graphql/query'))
    ) {
      try {
        response.clone().json().then(json => handleListData(url, json)).catch(() => {});
      } catch (e) {}
    }

    return response;
  };

  // ─── XHR Interceptor (fallback for older IG code paths) ──────────────────
  const _XHROpen = XMLHttpRequest.prototype.open;
  const _XHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._igMethod = (method || 'GET').toUpperCase();
    this._igUrl    = url || '';
    return _XHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      if (
        this._igMethod === 'POST' &&
        (this._igUrl.includes('friendships') || this._igUrl.includes('friendship')) &&
        (this._igUrl.includes('destroy') || this._igUrl.includes('unfollow'))
      ) {
        window.dispatchEvent(new CustomEvent('IG_CHECKER_UNFOLLOW'));
      }
    });
    return _XHRSend.apply(this, args);
  };

  // ─── List Data Parser ─────────────────────────────────────────────────────
  function handleListData(url, json) {
    let listType = null;
    let users    = [];

    if (url.includes('/api/v1/friendships/')) {
      if (url.includes('/followers/'))  listType = 'followers';
      else if (url.includes('/following/')) listType = 'following';
      if (listType && Array.isArray(json.users)) {
        users = json.users.map(u => u.username).filter(Boolean);
      }
    } else if (url.includes('/graphql/query')) {
      const user = json?.data?.user || {};
      if (user.edge_followed_by) {
        listType = 'followers';
        users = (user.edge_followed_by.edges || []).map(e => e?.node?.username).filter(Boolean);
      } else if (user.edge_follow) {
        listType = 'following';
        users = (user.edge_follow.edges || []).map(e => e?.node?.username).filter(Boolean);
      }
    }

    if (listType && users.length > 0) {
      window.dispatchEvent(new CustomEvent('IG_CHECKER_DATA', { detail: { listType, users } }));
    }
  }
})();
