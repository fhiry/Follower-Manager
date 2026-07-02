<div align="center">
  <img src="icon.png" alt="Insta Checker Logo" width="100" height="100">

  # Insta Unfollow Checker

  A privacy-first, locally-hosted Chrome Extension to analyze your Instagram connections.

  [![Version](https://img.shields.io/badge/version-2.0-blue)](#)
  [![Privacy](https://img.shields.io/badge/privacy-100%25_local-success)](#)
  [![Manifest](https://img.shields.io/badge/manifest-v3-orange)](#)
  [![Platform](https://img.shields.io/badge/platform-chrome_extension-4285F4)](#)

  [Features](#features) •
  [Installation](#installation) •
  [Usage](#how-to-use) •
  [Batch Queue](#batch-unfollow-queue) •
  [Privacy](#privacy--permissions) •
  [FAQ](#faq)
</div>

---

## About

<table>
<tr><td>

**Insta Unfollow Checker** is a free, open-source tool that helps you find out who isn't following you back on Instagram, who your biggest fans are, and who your mutual connections are — all without ever touching your password.

Instead of asking for your login credentials or hitting unofficial APIs, this extension uses **network interception**. It passively watches the data Instagram's own web app already loads into your browser as you scroll — followers, following, and list data — and reconstructs the picture locally. Nothing is sent anywhere.

Built with vanilla HTML, CSS, and JavaScript on Manifest V3 — no frameworks, no build step.

</td></tr>
</table>

## Features

<table>
<tr><td>

### 🔒 100% Local & Private

<table>
<tr><td>

Everything lives in `chrome.storage.local`. No backend, no telemetry, no account required — your data never leaves your machine.

</td></tr>
</table>

### 📡 Network Interception

<table>
<tr><td>

Hooks `fetch` and `XMLHttpRequest` to read follower/following data straight from Instagram's own API responses (`/api/v1/friendships/...` and GraphQL) as you browse. Zero third-party API calls.

</td></tr>
</table>

### 🧩 DOM Fallback Parser

<table>
<tr><td>

A `MutationObserver` also scans the followers/following modal directly, so data is still captured even if the network layer misses something.

</td></tr>
</table>

### ✅ Visual DOM Checklists

<table>
<tr><td>

Adds `✅ / ⬜` toggles next to every username inside the Instagram modal itself, so you can see — and manually correct — exactly who's been recorded in real time.

</td></tr>
</table>

### 🖥️ Floating HUD

<table>
<tr><td>

A minimizable heads-up display shows recording status and a live counter while you scroll, with toast notifications for feedback along the way.

</td></tr>
</table>

### 📊 Three-Way Breakdown

<table>
<tr><td>

The popup dashboard sorts everyone into:

- `Unfollowers` — you follow them, they don't follow you back
- `Fans` — they follow you, you don't follow them
- `Mutuals` — you follow each other

</td></tr>
</table>

### 📋 One-Click Copy

<table>
<tr><td>

Copy any list straight to your clipboard for backup or sharing — no file exports, no clutter.

</td></tr>
</table>

### ⚡ Batch Unfollow Queue

<table>
<tr><td>

Speeds up manual cleanup by auto-navigating multiple tabs to the next profiles in your Unfollowers list. See [Batch Unfollow Queue](#batch-unfollow-queue) below for exactly what it does (and doesn't do).

</td></tr>
</table>

### 🔌 On/Off Toggle

<table>
<tr><td>

Disable the extension per-tab without uninstalling; the Instagram page reloads clean.

</td></tr>
</table>

</td></tr>
</table>

## Installation

<table>
<tr><td>

Since this extension prioritizes your privacy, it's designed to be run locally in Chrome's Developer Mode rather than distributed through the Web Store.

1. **Download the repository**
   ```bash
   git clone https://github.com/yourusername/insta-unfollowers-checker.git
   ```
2. **Open the extension manager**
   ```
   chrome://extensions/
   ```
3. **Enable Developer Mode** — toggle the switch in the top-right corner.
4. **Load the extension** — click **Load unpacked** and select the project folder.
5. **Pin it** — click the puzzle-piece icon in Chrome's toolbar and pin **Insta Checker** for quick access.

</td></tr>
</table>

## How To Use

<table>
<tr><td>

1. Go to [Instagram.com](https://www.instagram.com/) and open your profile.
2. Click your **Followers** count to open the list modal. A HUD will appear in the bottom-right corner — click **Start Recording**.
3. Scroll slowly through the list. Instagram loads users in pages as you scroll, and each one gets a `✅` badge as it's captured.
4. Click **Stop & Save**, close the modal, then repeat the same process for your **Following** list.
5. Open the extension icon in your toolbar to see your dashboard — **Unfollowers**, **Fans**, and **Mutuals**, fully computed locally.

Want to exclude someone from a list (say, a verified account you don't mind not following back)? Click the `✅` next to their name inside the Instagram modal to flip it to `⬜`. They're removed from that list instantly and won't be re-added automatically.

</td></tr>
</table>

## Batch Unfollow Queue

<table>
<tr><td>

The **Unfollowers** tab includes an optional **Start Queue** control to make cleaning up a long list less tedious.

**What it actually does:**
- Opens up to 4 of your existing Instagram tabs and navigates each one to a profile from your Unfollowers list.
- Once you're ready to move on, click **Next Batch** (or press **Enter**) — all 4 tabs advance together to the next batch of profiles.
- Your progress is checkpointed, so you can pick up later at #47 instead of starting over from #1.

**What it does *not* do:**
- It does **not** click the Unfollow button for you. You still review and unfollow each profile yourself, one click at a time — the extension only handles the tedious tab-switching and navigating.

This keeps a real person in the loop for every unfollow action. That said, working through a large list quickly is still a lot of profile visits and account actions in a short window — pace yourself, and keep an eye out for any rate-limit warnings from Instagram.

</td></tr>
</table>

## Privacy & Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab`, `tabs` | Detect the active Instagram tab and drive the batch queue navigation |
| `storage` | Save your followers/following data locally via `chrome.storage.local` |
| `host_permissions: *.instagram.com` | Run the content script and read network responses only on Instagram |

There are no other host permissions, no remote scripts, and no analytics — you can verify this yourself by reading `manifest.json` and the three source files (`content.js`, `interceptor.js`, `background.js`).

## FAQ

<table>
<tr><td>

**Is it safe for my Instagram account?**
The extension never logs in, auto-scrolls, or uses Instagram's private API on your behalf — it only reads data your own browser already receives while you scroll and click normally. The Batch Queue still requires you to manually click Unfollow on each profile, so no account action ever happens without you doing it. As with any tool that speeds up repetitive actions on Instagram, avoid rushing through very large lists in one sitting.

**Where is my data stored?**
Entirely in your browser's local storage (`chrome.storage.local`). Nothing is ever transmitted to a remote server — there isn't one.

**What happens if I uninstall the extension?**
Your saved connection history is wiped along with it. Use **Copy to Clipboard** on each tab beforehand if you want to keep a record.

**Why didn't a user show up in my list?**
Make sure you scrolled all the way through the modal — Instagram lazy-loads the list in pages, and the extension can only record what's actually been loaded into the page.

</td></tr>
</table>

---

<div align="center">
  Built with ❤️ for privacy-conscious users.
</div>
