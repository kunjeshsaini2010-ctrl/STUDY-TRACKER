// --- STATE MANAGEMENT ---
const defaultState = {
    examName: "IIT-JEE",
    examDate: "2027-01-15",
    dailyGoal: 50,
    streak: 0,
    lastActiveDate: null,
    subjects: [
        { id: 's1', name: 'Physics', chapters: [] },
        { id: 's2', name: 'Chemistry', chapters: [] },
        { id: 's3', name: 'Mathematics', chapters: [] }
    ],
    logs: {}, // Format: "YYYY-MM-DD": solved_count
    notes: [],
    planner: []
};

let appState = JSON.parse(localStorage.getItem('studyTrackerState')) || defaultState;

function saveState() {
    localStorage.setItem('studyTrackerState', JSON.stringify(appState));
    updateUI();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupNavigation();
    checkStreak();
    updateUI();
    initChart();
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js');
    }

    // Delete Confirmation Logic
    document.getElementById('confirm-delete-btn').addEventListener('click', executeChapterDeletion);
});

// --- UI UPDATES & ROUTING ---
function updateUI() {
    document.getElementById('exam-name-display').innerText = appState.examName;
    document.getElementById('streak-count').innerText = appState.streak;
    
    // Exam Countdown
    const today = new Date();
    const examDate = new Date(appState.examDate);
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('exam-countdown').innerText = diffDays > 0 ? `${diffDays} Days` : 'Exam Passed!';

    // Daily Goal
    const dateStr = today.toISOString().split('T')[0];
    const solvedToday = appState.logs[dateStr] || 0;
    const percent = Math.min((solvedToday / appState.dailyGoal) * 100, 100);
    document.getElementById('daily-goal-bar').style.width = `${percent}%`;
    document.getElementById('daily-goal-text').innerText = `${solvedToday} / ${appState.dailyGoal} Questions`;

    // Settings
    document.getElementById('setting-exam-name').value = appState.examName;
    document.getElementById('setting-exam-date').value = appState.examDate;
    document.getElementById('setting-daily-goal').value = appState.dailyGoal;

    renderSubjects();
    renderNotes();
    renderPlanner();
}

function setupNavigation() {
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
            if(e.target.dataset.target === 'dashboard') initChart();
        });
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const body = document.body;
        const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        initChart();
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
}

// --- LOGIC: SUBJECTS & CHAPTERS ---
function renderSubjects() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '';
    appState.subjects.forEach(sub => {
        let totalQ = 0, solvedQ = 0;
        sub.chapters.forEach(ch => { totalQ += ch.total; solvedQ += ch.solved; });
        const percent = totalQ === 0 ? 0 : Math.round((solvedQ / totalQ) * 100);

        let html = `
            <div class="card">
                <h3>${sub.name}</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>
                <p>${solvedQ} / ${totalQ} Questions (${percent}%)</p>
                <div style="margin-top:15px;">
                    ${sub.chapters.map((ch, idx) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding: 10px; background: rgba(128, 128, 128, 0.1); border-radius: 8px; font-size:14px;">
                            <span style="font-weight: 500; flex:1;">${ch.name}</span>
                            <span style="display:flex; align-items:center; gap:12px;">
                                <span>
                                    <input type="number" style="width:50px; padding:4px; text-align:center; border-radius:4px; border:1px solid #ccc; background: transparent; color: inherit;" value="${ch.solved}" onchange="updateChapterQ('${sub.id}', ${idx}, this.value)"> / ${ch.total}
                                </span>
                                <button onclick="confirmDeleteChapter('${sub.id}', ${idx})" style="background:none; border:none; cursor:pointer; color: #ff3b30; display:flex; align-items:center; padding: 4px; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">
                                    <span class="material-symbols-rounded" style="font-size: 20px;">delete</span>
                                </button>
                            </span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn secondary-btn" style="margin-top:10px; width:100%; border-radius: 8px;" onclick="openChapterModal('${sub.id}')">+ Add Chapter</button>
            </div>
        `;
        container.innerHTML += html;
    });
}

// --- CHAPTER DELETION LOGIC ---
let targetDeleteSubId = null;
let targetDeleteIdx = null;

window.confirmDeleteChapter = (subId, chapterIdx) => {
    targetDeleteSubId = subId;
    targetDeleteIdx = chapterIdx;
    document.getElementById('delete-confirm-modal').classList.add('active');
};

function executeChapterDeletion() {
    if(targetDeleteSubId !== null && targetDeleteIdx !== null) {
        const subject = appState.subjects.find(s => s.id === targetDeleteSubId);
        if(subject) {
            subject.chapters.splice(targetDeleteIdx, 1);
            saveState();
        }
        closeModal('delete-confirm-modal');
        targetDeleteSubId = null;
        targetDeleteIdx = null;
    }
}

window.openChapterModal = (subId) => {
    document.getElementById('modal-subject-id').value = subId;
    document.getElementById('add-chapter-modal').classList.add('active');
};
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

window.saveChapter = () => {
    const subId = document.getElementById('modal-subject-id').value;
    const name = document.getElementById('modal-chapter-name').value;
    const total = parseInt(document.getElementById('modal-total-q').value) || 0;
    
    if(!name || total <= 0) return;

    const subject = appState.subjects.find(s => s.id === subId);
    subject.chapters.push({ name, total, solved: 0 });
    
    document.getElementById('modal-chapter-name').value = '';
    document.getElementById('modal-total-q').value = '';
    closeModal('add-chapter-modal');
    saveState();
};

window.updateChapterQ = (subId, chapterIdx, newSolvedStr) => {
    const newSolved = parseInt(newSolvedStr) || 0;
    const subject = appState.subjects.find(s => s.id === subId);
    if(!subject) return;
    const chapter = subject.chapters[chapterIdx];
    
    const diff = newSolved - chapter.solved;
    if(diff > 0) logQuestions(diff);

    chapter.solved = Math.min(Math.max(newSolved, 0), chapter.total);
    saveState();
};

// --- LOGIC: STREAK & LOGS ---
function checkStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    if(appState.lastActiveDate !== todayStr) {
        if(appState.lastActiveDate) {
            const lastDate = new Date(appState.lastActiveDate);
            const today = new Date();
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            if(diffDays > 1) appState.streak = 0; // Reset streak if missed a day
        }
        appState.lastActiveDate = todayStr;
        saveState();
    }
}

function logQuestions(count) {
    const todayStr = new Date().toISOString().split('T')[0];
    appState.logs[todayStr] = (appState.logs[todayStr] || 0) + count;
    appState.streak = appState.streak === 0 ? 1 : appState.streak;
    saveState();
}

// --- LOGIC: POMODORO ---
let pomoTimer = null;
let pomoTime = 25 * 60;
let isPomoRunning = false;
let isBreak = false;

function updateTimerDisplay() {
    const m = Math.floor(pomoTime / 60).toString().padStart(2, '0');
    const s = (pomoTime % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
}

document.getElementById('start-timer').addEventListener('click', () => {
    if(isPomoRunning) return;
    isPomoRunning = true;
    pomoTimer = setInterval(() => {
        if(pomoTime > 0) {
            pomoTime--;
            updateTimerDisplay();
        } else {
            clearInterval(pomoTimer);
            isPomoRunning = false;
            isBreak = !isBreak;
            pomoTime = isBreak ? 5 * 60 : 25 * 60;
            document.getElementById('timer-mode').innerText = isBreak ? "Break Time" : "Focus Time";
            updateTimerDisplay();
            if(Notification.permission === "granted") new Notification("Pomodoro Complete!");
        }
    }, 1000);
});

document.getElementById('pause-timer').addEventListener('click', () => {
    clearInterval(pomoTimer);
    isPomoRunning = false;
});

document.getElementById('reset-timer').addEventListener('click', () => {
    clearInterval(pomoTimer);
    isPomoRunning = false;
    isBreak = false;
    pomoTime = 25 * 60;
    document.getElementById('timer-mode').innerText = "Focus Time";
    updateTimerDisplay();
});

if ("Notification" in window) Notification.requestPermission();

// --- LOGIC: CHARTS ---
let myChart = null;
window.updateChart = (range) => initChart(range);

function initChart(range = 'daily') {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if(myChart) myChart.destroy();

    const labels = [];
    const data = [];
    const today = new Date();

    let days = range === 'weekly' ? 7 : range === 'monthly' ? 30 : 1; 
    if(range === 'daily') days = 7;

    for(let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', {weekday:'short'}));
        data.push(appState.logs[dStr] || 0);
    }

    const textColor = document.body.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#333';

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Questions Solved', data: data, backgroundColor: '#4a90e2', borderRadius: 4 }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { color: textColor } }, x: { ticks: { color: textColor } } },
            plugins: { legend: { labels: { color: textColor } } }
        }
    });
}

// --- LOGIC: NOTES & PLANNER ---
window.addNote = () => {
    const title = prompt("Note Title:");
    if(!title) return;
    const content = prompt("Note Content:");
    appState.notes.push({ id: Date.now(), title, content });
    saveState();
};

function renderNotes() {
    const container = document.getElementById('notes-container');
    container.innerHTML = appState.notes.map(n => `
        <div class="card">
            <h3>${n.title}</h3>
            <p>${n.content}</p>
            <button class="btn danger-btn small" style="margin-top:10px; border-radius: 6px;" onclick="deleteNote(${n.id})">Delete</button>
        </div>
    `).join('');
}
window.deleteNote = (id) => { appState.notes = appState.notes.filter(n => n.id !== id); saveState(); };

window.addRevisionTask = () => {
    const task = prompt("Revision Task (e.g., Revise Kinematics):");
    if(!task) return;
    appState.planner.push({ id: Date.now(), task, done: false });
    saveState();
};

function renderPlanner() {
    const list = document.getElementById('revision-list');
    list.innerHTML = appState.planner.map(t => `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:12px; background: rgba(128, 128, 128, 0.1); margin-bottom:8px; border-radius:8px;">
            <span style="text-decoration: ${t.done ? 'line-through' : 'none'}; opacity: ${t.done ? '0.6' : '1'}">${t.task}</span>
            <div style="display:flex; gap: 10px; align-items:center;">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="togglePlanner(${t.id})" style="transform: scale(1.2); cursor:pointer;">
                <button class="icon-btn" onclick="deletePlanner(${t.id})" style="background:none; border:none; cursor:pointer; color:#ff3b30; display:flex;">
                   <span class="material-symbols-rounded" style="font-size: 20px;">delete</span>
                </button>
            </div>
        </li>
    `).join('');
}
window.togglePlanner = (id) => {
    const t = appState.planner.find(x => x.id === id);
    t.done = !t.done;
    saveState();
};
window.deletePlanner = (id) => { appState.planner = appState.planner.filter(x => x.id !== id); saveState(); };

// --- SETTINGS & EXPORT/IMPORT ---
window.saveSettings = () => {
    appState.examName = document.getElementById('setting-exam-name').value;
    appState.examDate = document.getElementById('setting-exam-date').value;
    appState.dailyGoal = parseInt(document.getElementById('setting-daily-goal').value) || 50;
    saveState();
    alert("Settings saved!");
};

window.exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "study_tracker_backup.json");
    a.click();
};

window.importData = (event) => {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            appState = JSON.parse(e.target.result);
            saveState();
            alert("Data imported successfully!");
        } catch(err) { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
};

// Global search basic implementation
document.getElementById('global-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    // Implementation can filter cards dynamically.
});

// App State Global access for firebase.js
window.appState = appState;
window.saveState = saveState;
});

// --- UI UPDATES & ROUTING ---
function updateUI() {
    document.getElementById('exam-name-display').innerText = appState.examName;
    document.getElementById('streak-count').innerText = appState.streak;
    
    // Exam Countdown
    const today = new Date();
    const examDate = new Date(appState.examDate);
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('exam-countdown').innerText = diffDays > 0 ? `${diffDays} Days` : 'Exam Passed!';

    // Daily Goal
    const dateStr = today.toISOString().split('T')[0];
    const solvedToday = appState.logs[dateStr] || 0;
    const percent = Math.min((solvedToday / appState.dailyGoal) * 100, 100);
    document.getElementById('daily-goal-bar').style.width = `${percent}%`;
    document.getElementById('daily-goal-text').innerText = `${solvedToday} / ${appState.dailyGoal} Questions`;

    // Settings
    document.getElementById('setting-exam-name').value = appState.examName;
    document.getElementById('setting-exam-date').value = appState.examDate;
    document.getElementById('setting-daily-goal').value = appState.dailyGoal;

    renderSubjects();
    renderNotes();
    renderPlanner();
}

function setupNavigation() {
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
            if(e.target.dataset.target === 'dashboard') initChart();
        });
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const body = document.body;
        const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        initChart();
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
}

// --- LOGIC: SUBJECTS & CHAPTERS ---
function renderSubjects() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '';
    appState.subjects.forEach(sub => {
        let totalQ = 0, solvedQ = 0;
        sub.chapters.forEach(ch => { totalQ += ch.total; solvedQ += ch.solved; });
        const percent = totalQ === 0 ? 0 : Math.round((solvedQ / totalQ) * 100);

        let html = `
            <div class="card">
                <h3>${sub.name}</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>
                <p>${solvedQ} / ${totalQ} Questions (${percent}%)</p>
                <div style="margin-top:15px;">
                    ${sub.chapters.map((ch, idx) => `
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                            <span>${ch.name}</span>
                            <span>
                                <input type="number" style="width:50px; padding:2px;" value="${ch.solved}" onchange="updateChapterQ('${sub.id}', ${idx}, this.value)"> / ${ch.total}
                            </span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn secondary-btn" style="margin-top:10px; width:100%;" onclick="openChapterModal('${sub.id}')">+ Add Chapter</button>
            </div>
        `;
        container.innerHTML += html;
    });
}

window.openChapterModal = (subId) => {
    document.getElementById('modal-subject-id').value = subId;
    document.getElementById('add-chapter-modal').classList.add('active');
};
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

window.saveChapter = () => {
    const subId = document.getElementById('modal-subject-id').value;
    const name = document.getElementById('modal-chapter-name').value;
    const total = parseInt(document.getElementById('modal-total-q').value) || 0;
    
    if(!name || total <= 0) return;

    const subject = appState.subjects.find(s => s.id === subId);
    subject.chapters.push({ name, total, solved: 0 });
    
    document.getElementById('modal-chapter-name').value = '';
    document.getElementById('modal-total-q').value = '';
    closeModal('add-chapter-modal');
    saveState();
};

window.updateChapterQ = (subId, chapterIdx, newSolvedStr) => {
    const newSolved = parseInt(newSolvedStr) || 0;
    const chapter = appState.subjects.find(s => s.id === subId).chapters[chapterIdx];
    
    const diff = newSolved - chapter.solved;
    if(diff > 0) logQuestions(diff);

    chapter.solved = Math.min(newSolved, chapter.total);
    saveState();
};

// --- LOGIC: STREAK & LOGS ---
function checkStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    if(appState.lastActiveDate !== todayStr) {
        if(appState.lastActiveDate) {
            const lastDate = new Date(appState.lastActiveDate);
            const today = new Date();
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            if(diffDays > 1) appState.streak = 0; // Reset streak if missed a day
        }
        appState.lastActiveDate = todayStr;
        saveState();
    }
}

function logQuestions(count) {
    const todayStr = new Date().toISOString().split('T')[0];
    appState.logs[todayStr] = (appState.logs[todayStr] || 0) + count;
    appState.streak = appState.streak === 0 ? 1 : appState.streak;
    saveState();
}

// --- LOGIC: POMODORO ---
let pomoTimer = null;
let pomoTime = 25 * 60;
let isPomoRunning = false;
let isBreak = false;

function updateTimerDisplay() {
    const m = Math.floor(pomoTime / 60).toString().padStart(2, '0');
    const s = (pomoTime % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
}

document.getElementById('start-timer').addEventListener('click', () => {
    if(isPomoRunning) return;
    isPomoRunning = true;
    pomoTimer = setInterval(() => {
        if(pomoTime > 0) {
            pomoTime--;
            updateTimerDisplay();
        } else {
            clearInterval(pomoTimer);
            isPomoRunning = false;
            isBreak = !isBreak;
            pomoTime = isBreak ? 5 * 60 : 25 * 60;
            document.getElementById('timer-mode').innerText = isBreak ? "Break Time" : "Focus Time";
            updateTimerDisplay();
            if(Notification.permission === "granted") new Notification("Pomodoro Complete!");
        }
    }, 1000);
});

document.getElementById('pause-timer').addEventListener('click', () => {
    clearInterval(pomoTimer);
    isPomoRunning = false;
});

document.getElementById('reset-timer').addEventListener('click', () => {
    clearInterval(pomoTimer);
    isPomoRunning = false;
    isBreak = false;
    pomoTime = 25 * 60;
    document.getElementById('timer-mode').innerText = "Focus Time";
    updateTimerDisplay();
});

if ("Notification" in window) Notification.requestPermission();

// --- LOGIC: CHARTS ---
let myChart = null;
window.updateChart = (range) => initChart(range);

function initChart(range = 'daily') {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if(myChart) myChart.destroy();

    const labels = [];
    const data = [];
    const today = new Date();

    let days = range === 'weekly' ? 7 : range === 'monthly' ? 30 : 1; // Simplification: 'daily' just shows last 7 days too for visual
    if(range === 'daily') days = 7;

    for(let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', {weekday:'short'}));
        data.push(appState.logs[dStr] || 0);
    }

    const textColor = document.body.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#333';

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Questions Solved', data: data, backgroundColor: '#4a90e2', borderRadius: 4 }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { color: textColor } }, x: { ticks: { color: textColor } } },
            plugins: { legend: { labels: { color: textColor } } }
        }
    });
}

// --- LOGIC: NOTES & PLANNER ---
window.addNote = () => {
    const title = prompt("Note Title:");
    if(!title) return;
    const content = prompt("Note Content:");
    appState.notes.push({ id: Date.now(), title, content });
    saveState();
};

function renderNotes() {
    const container = document.getElementById('notes-container');
    container.innerHTML = appState.notes.map(n => `
        <div class="card">
            <h3>${n.title}</h3>
            <p>${n.content}</p>
            <button class="btn danger-btn small" style="margin-top:10px;" onclick="deleteNote(${n.id})">Delete</button>
        </div>
    `).join('');
}
window.deleteNote = (id) => { appState.notes = appState.notes.filter(n => n.id !== id); saveState(); };

window.addRevisionTask = () => {
    const task = prompt("Revision Task (e.g., Revise Kinematics):");
    if(!task) return;
    appState.planner.push({ id: Date.now(), task, done: false });
    saveState();
};

function renderPlanner() {
    const list = document.getElementById('revision-list');
    list.innerHTML = appState.planner.map(t => `
        <li style="display:flex; justify-content:space-between; padding:10px; background:var(--surface-color); margin-bottom:5px; border-radius:5px;">
            <span style="text-decoration: ${t.done ? 'line-through' : 'none'}">${t.task}</span>
            <div>
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="togglePlanner(${t.id})">
                <button class="btn danger-btn icon-btn" onclick="deletePlanner(${t.id})">🗑</button>
            </div>
        </li>
    `).join('');
}
window.togglePlanner = (id) => {
    const t = appState.planner.find(x => x.id === id);
    t.done = !t.done;
    saveState();
};
window.deletePlanner = (id) => { appState.planner = appState.planner.filter(x => x.id !== id); saveState(); };

// --- SETTINGS & EXPORT/IMPORT ---
window.saveSettings = () => {
    appState.examName = document.getElementById('setting-exam-name').value;
    appState.examDate = document.getElementById('setting-exam-date').value;
    appState.dailyGoal = parseInt(document.getElementById('setting-daily-goal').value) || 50;
    saveState();
    alert("Settings saved!");
};

window.exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "study_tracker_backup.json");
    a.click();
};

window.importData = (event) => {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            appState = JSON.parse(e.target.result);
            saveState();
            alert("Data imported successfully!");
        } catch(err) { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
};

// Global search basic implementation
document.getElementById('global-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    // Implementation can filter cards dynamically.
});

// App State Global access for firebase.js
window.appState = appState;
window.saveState = saveState;
