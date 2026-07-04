import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// REPLACE WITH YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let app, auth, provider;

// Initialize Firebase only if API key is provided
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    // Crucial: Request Drive AppData scope for backup
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');
}

let googleAccessToken = null;

// Auth UI Logic
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const userInfo = document.getElementById('user-info');
const skipBtn = document.getElementById('skip-auth-btn');
const signinBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const syncBtn = document.getElementById('sync-drive-btn');

function showApp() {
    authScreen.classList.remove('active');
    appScreen.classList.add('active');
}

skipBtn.addEventListener('click', showApp);

if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userInfo.innerText = user.email;
            showApp();
        }
    });

    signinBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).then((result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            googleAccessToken = credential.accessToken;
            userInfo.innerText = result.user.email;
            showApp();
            // Automatically try to restore data on login
            restoreFromDrive();
        }).catch((error) => alert(error.message));
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            location.reload();
        });
    });

    syncBtn.addEventListener('click', () => {
        if (!googleAccessToken) {
            alert("Please sign in with Google to sync.");
            return;
        }
        backupToDrive();
    });
} else {
    // Hide auth dependent buttons if Firebase is not configured
    signinBtn.style.display = 'none';
    syncBtn.style.display = 'none';
}

// --- Google Drive App Data Sync ---
const FILE_NAME = 'study_tracker_backup.json';

async function backupToDrive() {
    if (!googleAccessToken) return;
    syncBtn.innerText = "Syncing...";
    
    try {
        // 1. Find if file exists
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
            headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        const searchData = await searchRes.json();
        let fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

        const fileContent = JSON.stringify(window.appState);
        const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const url = fileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` 
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const method = fileId ? 'PATCH' : 'POST';

        await fetch(url, {
            method: method,
            headers: { Authorization: `Bearer ${googleAccessToken}` },
            body: form
        });
        
        syncBtn.innerText = "Sync Complete!";
        setTimeout(() => syncBtn.innerText = "Sync to Google Drive", 2000);
    } catch (err) {
        console.error("Backup failed", err);
        syncBtn.innerText = "Sync Failed";
    }
}

async function restoreFromDrive() {
    if (!googleAccessToken) return;
    try {
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
            headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        const searchData = await searchRes.json();
        
        if (searchData.files && searchData.files.length > 0) {
            const fileId = searchData.files[0].id;
            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${googleAccessToken}` }
            });
            const remoteData = await fileRes.json();
            
            // Basic conflict resolution: only restore if remote has more questions logged or newer date
            if (confirm("Found cloud backup. Do you want to restore it? This will overwrite local data.")) {
                window.appState = remoteData;
                window.saveState();
                alert("Data restored from Cloud!");
                location.reload();
            }
        }
    } catch (err) {
        console.error("Restore failed", err);
    }
}
