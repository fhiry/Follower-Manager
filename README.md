<div align="center">
  <img src="icon.png" alt="Insta Checker Logo" width="120" height="120">
  <h1 align="center">Insta Unfollow Checker</h1>

  <p align="center">
    <strong>A privacy-first, locally-hosted Chrome Extension to analyze your Instagram connections.</strong>
    <br />
    <br />
    <a href="#-features">✨ Features</a>
    ·
    <a href="#-installation">🚀 Installation</a>
    ·
    <a href="#-how-to-use">📖 Usage</a>
    ·
    <a href="#-batch-unfollow-queue">⚡ Batch Queue</a>
    ·
    <a href="#-privacy--permissions">🔐 Privacy</a>
    ·
    <a href="#-faq">❓ FAQ</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Version-2.0-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Version 2.0" />
    <img src="https://img.shields.io/badge/Privacy-100%25_Local-success?style=for-the-badge&logo=shield&logoColor=white" alt="100% Local" />
    <img src="https://img.shields.io/badge/Manifest-V3-orange?style=for-the-badge" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/Platform-Chrome_Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Platform" />
  </p>
</div>

---

## 📝 About The Project

**Insta Unfollow Checker** is a free, open-source tool that helps you find out who isn't following you back on Instagram, who your biggest fans are, and who your mutual connections are — all without ever touching your password.

Instead of asking for your login credentials or hitting unofficial APIs (the kind of thing that gets accounts flagged), this extension uses **network interception**. It passively watches the data Instagram's own web app already loads into your browser as you scroll — followers, following, and list data — and reconstructs the picture locally. Nothing is sent anywhere.

**Keywords / Topics:** `instagram unfollowers`, `unfollow checker`, `instagram tracker`, `chrome extension`, `privacy-first`, `no password`, `social media analytics`, `dom parsing`, `network interception`, `manifest v3`.

### 🛠 Built With

* ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
* ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
* ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
* ![Chrome Extensions](https://img.shields.io/badge/Chrome_Extensions-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

---

## ✨ Features

- **🔒 100% Local & Private** — Everything lives in `chrome.storage.local`. No backend, no telemetry, no account required.
- **📡 Network Interception** — Hooks `fetch` and `XMLHttpRequest` to read follower/following data straight from Instagram's own API responses (`/api/v1/friendships/...` and GraphQL) as you browse. Zero third-party API calls.
- **🧩 DOM Fallback Parser** — A `MutationObserver` also scans the followers/following modal directly, so data is still captured even if the network layer misses something.
- **✅ Visual DOM Checklists** — Adds `✅ / ⬜` toggles next to every username inside the Instagram modal itself, so you can see — and manually correct — exactly who's been recorded in real time.
- **🖥️ Floating HUD** — A minimizable heads-up display shows recording status and a live counter while you scroll, with toast notifications for feedback along the way.
- **📊 Three-Way Breakdown** — The popup dashboard sorts everyone into:
  - **Unfollowers** — you follow them, they don't follow you back
  - **Fans** — they follow you, you don't follow them
  - **Mutuals** — you follow each other
- **📋 One-Click Copy** — Copy any list straight to your clipboard for backup or sharing.
- **⚡ Batch Unfollow Queue** — Speeds up manual cleanup by auto-navigating multiple tabs to the next profiles in your Unfollowers list. See [below](#-batch-unfollow-queue) for exactly what it does (and doesn't do).
- **🔌 On/Off Toggle** — Disable the extension per-tab without uninstalling; the Instagram page reloads clean.

---

## 🚀 Installation

Since this extension prioritizes your privacy, it's designed to be run locally in Chrome's Developer Mode rather than distributed through the Web Store.

1. **Download the repository**
   ```bash
   git clone https://github.com/yourusername/insta-unfollowers-checker.git
   ```
2. **Open the extension manager**
   ```text
   chrome://extensions/
   ```
3. **Enable Developer Mode** — toggle the switch in the top-right corner.
4. **Load the extension** — click **Load unpacked** and select the project folder.
5. **Pin it** — click the puzzle-piece icon in Chrome's toolbar and pin **Insta Checker** for quick access.

---

## 📖 How To Use

1. Go to [Instagram.com](https://www.instagram.com/) and open your profile.
2. Click your **Followers** count to open the list modal. A HUD will appear in the bottom-right corner — click **Start Recording**.
3. Scroll slowly through the list. Instagram loads users in pages as you scroll, and each one gets a `✅` badge as it's captured.
4. Click **Stop & Save**, close the modal, then repeat the same process for your **Following** list.
5. Open the extension icon in your toolbar to see your dashboard — **Unfollowers**, **Fans**, and **Mutuals**, fully computed locally.

> **💡 Pro tip:** Want to exclude someone from a list (say, a verified account you don't mind not following back)? Click the `✅` next to their name inside the Instagram modal to flip it to `⬜`. They're removed from that list instantly and won't be re-added automatically.

---

## ⚡ Batch Unfollow Queue

The **Unfollowers** tab includes an optional **Start Queue** control to make cleaning up a long list less tedious.

**What it actually does:**
- Opens up to 4 of your existing Instagram tabs and navigates each one to a profile from your Unfollowers list.
- Once you're ready to move on, click **Next Batch** (or press **Enter**) — all 4 tabs advance together to the next batch of profiles.
- Your progress is checkpointed, so you can pick up later at #47 instead of starting over from #1.

**What it does *not* do:**
- It does **not** click the Unfollow button for you. You still review and unfollow each profile yourself, one click at a time — the extension only handles the tedious tab-switching and navigating.

This keeps a real person in the loop for every unfollow action. That said, working through a large list quickly is still a lot of profile visits and account actions in a short window — pace yourself, and keep an eye out for any rate-limit warnings from Instagram.

---

## 🔐 Privacy & Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab`, `tabs` | Detect the active Instagram tab and drive the batch queue navigation |
| `storage` | Save your followers/following data locally via `chrome.storage.local` |
| `host_permissions: *.instagram.com` | Run the content script and read network responses only on Instagram |

There are no other host permissions, no remote scripts, and no analytics — you can verify this yourself by reading `manifest.json` and the three source files (`content.js`, `interceptor.js`, `background.js`).

---

## ❓ FAQ

<details>
  <summary><strong>Is it safe for my Instagram account?</strong></summary>
  <p>The extension never logs in, auto-scrolls, or uses Instagram's private API on your behalf — it only reads data your own browser already receives while you scroll and click normally. The Batch Queue still requires you to manually click Unfollow on each profile, so no account action ever happens without you doing it. As with any tool that speeds up repetitive actions on Instagram, avoid rushing through very large lists in one sitting.</p>
</details>

<details>
  <summary><strong>Where is my data stored?</strong></summary>
  <p>Entirely in your browser's local storage (<code>chrome.storage.local</code>). Nothing is ever transmitted to a remote server — there isn't one.</p>
</details>

<details>
  <summary><strong>What happens if I uninstall the extension?</strong></summary>
  <p>Your saved connection history is wiped along with it. Use <strong>Copy to Clipboard</strong> on each tab beforehand if you want to keep a record.</p>
</details>

<details>
  <summary><strong>Why didn't a user show up in my list?</strong></summary>
  <p>Make sure you scrolled all the way through the modal — Instagram lazy-loads the list in pages, and the extension can only record what's actually been loaded into the page.</p>
</details>

---

<div align="center">
  <p>Built with ❤️ for privacy-conscious users.</p>
</div>
