# Study Tracker

A completely client-side, offline-capable Progressive Web App (PWA) designed for tracking study sessions, questions solved, and exam countdowns. Built strictly with HTML, CSS, and Vanilla JavaScript. Ready to deploy instantly on GitHub Pages.

## Features
* **Completely Browser-Based**: No Node.js, no npm, no backend server required.
* **Offline Capable PWA**: Install it on your phone or PC and use it without internet.
* **Google Drive Sync**: Sign in with Google to securely backup and restore your study data to your personal Google Drive (AppData folder).
* **Pomodoro Timer**: Built-in focus timer.
* **Analytics**: Daily, weekly, and monthly charts using Chart.js.
* **Default Setup**: Tailored with default PCM (Physics, Chemistry, Mathematics) subjects and an IIT-JEE target date, ready for heavy preparation.

## How to Deploy on GitHub Pages

1. **Create a Repository**: Create a new empty repository on GitHub.
2. **Upload Files**: Upload all 7 files (`index.html`, `style.css`, `script.js`, `firebase.js`, `manifest.json`, `service-worker.js`, `README.md`) directly to the root of the repository. Do not put them in any folders.
3. **Enable GitHub Pages**:
   - Go to your repository **Settings**.
   - Navigate to **Pages** on the left sidebar.
   - Under **Build and deployment**, set the Source to `Deploy from a branch`.
   - Select the `main` (or `master`) branch and click **Save**.
4. **Access App**: Within a few minutes, your Study Tracker will be live at `https://[your-username].github.io/[repo-name]/`.

## Firebase & Google Drive Setup (Optional but recommended for Sync)

To enable Cloud Sync, you must update `firebase.js` with your own credentials:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a Project and add a Web App.
3. Enable **Authentication** (Google Sign-in).
4. Copy your Firebase Config object and paste it into `firebase.js`.
5. In your [Google Cloud Console](https://console.cloud.google.com/), ensure the **Google Drive API** is enabled for your Firebase project to allow AppData syncing.
