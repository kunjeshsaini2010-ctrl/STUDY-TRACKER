document.addEventListener('DOMContentLoaded', () => {
    let appData = StorageManager.getData();
    let currentSubject = 'physics';
    let editMode = false;

    // Elements
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-links li');
    const themeBtn = document.getElementById('theme-toggle');
    const toastEl = document.getElementById('toast');

    // Init Application
    function init() {
        applyTheme(appData.theme);
        updateDashboard();
        switchView('dashboard');
    }

    // -- UI Routing & Theming --
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const viewId = e.currentTarget.getAttribute('data-view');
            switchView(viewId);
        });
    });

    function switchView(viewId) {
        views.forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        document.getElementById('page-title').innerText = viewId.charAt(0).toUpperCase() + viewId.slice(1);
        
        if(viewId === 'dashboard') updateDashboard();
        if(viewId === 'subjects') renderSubjects();
        if(viewId === 'analytics') Analytics.init(appData);
        if(viewId === 'history') renderHistory();
    }

    themeBtn.addEventListener('click', () => {
        const newTheme = appData.theme === 'light' ? 'dark' : 'light';
        appData.theme = newTheme;
        StorageManager.setTheme(newTheme);
        applyTheme(newTheme);
        if(!document.getElementById('view-analytics').classList.contains('hidden')) Analytics.init(appData);
    });

    function applyTheme(theme) {
        if (theme === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }

    // -- Toast Notifications --
    function showToast(message, isError = false) {
        toastEl.innerText = message;
        toastEl.className = `toast ${isError ? 'error' : ''}`;
        setTimeout(() => toastEl.classList.add('hidden'), 3000);
    }

    // -- Dashboard Logic --
    function updateDashboard() {
        let total = 0, attempted = 0;
        Object.values(appData.subjects).forEach(sub => {
            sub.chapters.forEach(ch => {
                total += ch.totalQuestions;
                attempted += ch.completedQuestions;
            });
        });
        const remaining = total - attempted;
        const progress = total === 0 ? 0 : Math.round((attempted / total) * 100);

        const todayStr = new Date().toDateString();
        const todayQs = appData.sessions
            .filter(s => new Date(s.timestamp).toDateString() === todayStr)
            .reduce((sum, s) => sum + s.questions, 0);

        document.getElementById('dash-total-q').innerText = total;
        document.getElementById('dash-attempted-q').innerText = attempted;
        document.getElementById('dash-remaining-q').innerText = remaining;
        document.getElementById('dash-today-q').innerText = todayQs;
        
        document.getElementById('dash-progress-bar').style.width = `${progress}%`;
        document.getElementById('dash-progress-text').innerText = `${progress}%`;
    }

    // -- Subjects & Chapters Logic --
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSubject = e.currentTarget.getAttribute('data-subject');
            renderSubjects();
        });
    });

    document.getElementById('search-chapters').addEventListener('input', renderSubjects);
    document.getElementById('sort-chapters').addEventListener('change', renderSubjects);

    function renderSubjects() {
        const container = document.getElementById('chapters-container');
        container.innerHTML = '';
        const searchQ = document.getElementById('search-chapters').value.toLowerCase();
        const sortMode = document.getElementById('sort-chapters').value;

        let chapters = [...appData.subjects[currentSubject].chapters];

        // Filter
        if(searchQ) chapters = chapters.filter(c => c.name.toLowerCase().includes(searchQ));

        // Sort
        chapters.sort((a, b) => {
            if(sortMode === 'name') return a.name.localeCompare(b.name);
            if(sortMode === 'progress') return (b.completedQuestions/b.totalQuestions) - (a.completedQuestions/a.totalQuestions);
            if(sortMode === 'remaining') return (b.totalQuestions - b.completedQuestions) - (a.totalQuestions - a.completedQuestions);
        });

        if(chapters.length === 0) {
            container.innerHTML = `<p class="text-muted">No chapters found. Add one to get started.</p>`;
            return;
        }

        chapters.forEach(ch => {
            const remaining = ch.totalQuestions - ch.completedQuestions;
            const percent = Math.round((ch.completedQuestions / ch.totalQuestions) * 100);
            
            const card = document.createElement('div');
            card.className = 'card chapter-card';
            card.innerHTML = `
                <div class="header">
                    <h3>${ch.name}</h3>
                    <div>
                        <button class="btn-icon edit-chapter" data-id="${ch.id}"><span class="material-symbols-outlined">edit</span></button>
                        <button class="btn-icon delete-chapter" data-id="${ch.id}"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
                <div class="chapter-stats">
                    <span>Comp: ${ch.completedQuestions}</span>
                    <span>Rem: ${remaining}</span>
                    <span>Total: ${ch.totalQuestions}</span>
                </div>
                <div class="progress-container"><div class="progress-bar" style="width:${percent}%"></div></div>
                <div class="quick-actions">
                    <button class="btn-secondary add-q" data-id="${ch.id}" data-val="1">+1</button>
                    <button class="btn-secondary add-q" data-id="${ch.id}" data-val="5">+5</button>
                    <button class="btn-secondary add-q" data-id="${ch.id}" data-val="10">+10</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Chapter Event Delegation
    document.getElementById('chapters-container').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if(!btn) return;
        const id = btn.getAttribute('data-id');

        if(btn.classList.contains('delete-chapter')) {
            if(confirm('Delete this chapter and its sessions?')) {
                appData.subjects[currentSubject].chapters = appData.subjects[currentSubject].chapters.filter(c => c.id !== id);
                appData.sessions = appData.sessions.filter(s => s.chapterId !== id);
                saveAndRefresh();
                showToast('Chapter deleted');
            }
        } 
        else if(btn.classList.contains('edit-chapter')) {
            const ch = appData.subjects[currentSubject].chapters.find(c => c.id === id);
            document.getElementById('chapter-id').value = ch.id;
            document.getElementById('chapter-name').value = ch.name;
            document.getElementById('chapter-total').value = ch.totalQuestions;
            document.getElementById('modal-chapter-title').innerText = 'Edit Chapter';
            editMode = true;
            document.getElementById('modal-chapter').classList.remove('hidden');
        }
        else if(btn.classList.contains('add-q')) {
            const val = parseInt(btn.getAttribute('data-val'));
            const ch = appData.subjects[currentSubject].chapters.find(c => c.id === id);
            
            if(ch.completedQuestions + val > ch.totalQuestions) {
                showToast('Cannot exceed total questions!', true);
                return;
            }
            
            ch.completedQuestions += val;
            appData.sessions.push({
                id: Date.now().toString(), timestamp: new Date().toISOString(),
                subjectId: currentSubject, chapterId: id, questions: val
            });
            saveAndRefresh();
            showToast(`Added ${val} questions`);
        }
    });

    // Add Chapter Modal
    document.getElementById('btn-add-chapter').addEventListener('click', () => {
        editMode = false;
        document.getElementById('form-chapter').reset();
        document.getElementById('chapter-id').value = '';
        document.getElementById('modal-chapter-title').innerText = 'Add Chapter';
        document.getElementById('modal-chapter').classList.remove('hidden');
    });

    document.getElementById('form-chapter').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('chapter-id').value || Date.now().toString();
        const name = document.getElementById('chapter-name').value.trim();
        const total = parseInt(document.getElementById('chapter-total').value);

        if(total <= 0) return showToast('Total must be positive', true);

        const targetSubjectArr = appData.subjects[currentSubject].chapters;

        if(editMode) {
            const ch = targetSubjectArr.find(c => c.id === id);
            if(total < ch.completedQuestions) return showToast('Total cannot be less than completed', true);
            ch.name = name;
            ch.totalQuestions = total;
            showToast('Chapter updated');
        } else {
            targetSubjectArr.push({ id, name, totalQuestions: total, completedQuestions: 0 });
            showToast('Chapter added');
        }

        document.getElementById('modal-chapter').classList.add('hidden');
        saveAndRefresh();
    });

    // -- Study Session Logic --
    const sessionSubjSelect = document.getElementById('session-subject');
    const sessionChapSelect = document.getElementById('session-chapter');

    document.getElementById('btn-add-session').addEventListener('click', () => {
        document.getElementById('form-session').reset();
        populateSessionChapters();
        document.getElementById('modal-session').classList.remove('hidden');
    });

    sessionSubjSelect.addEventListener('change', populateSessionChapters);

    function populateSessionChapters() {
        const sub = sessionSubjSelect.value;
        sessionChapSelect.innerHTML = '';
        const chapters = appData.subjects[sub].chapters;
        if(chapters.length === 0) {
            sessionChapSelect.innerHTML = '<option value="" disabled selected>No chapters available</option>';
            return;
        }
        chapters.forEach(c => {
            sessionChapSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    document.getElementById('form-session').addEventListener('submit', (e) => {
        e.preventDefault();
        const subId = sessionSubjSelect.value;
        const chapId = sessionChapSelect.value;
        const qs = parseInt(document.getElementById('session-qs').value);

        if(!chapId) return showToast('Select a chapter', true);
        if(qs <= 0) return showToast('Questions must be positive', true);

        const ch = appData.subjects[subId].chapters.find(c => c.id === chapId);
        if(ch.completedQuestions + qs > ch.totalQuestions) {
            return showToast(`Exceeds limit! Only ${ch.totalQuestions - ch.completedQuestions} remaining.`, true);
        }

        ch.completedQuestions += qs;
        appData.sessions.push({
            id: Date.now().toString(), timestamp: new Date().toISOString(),
            subjectId: subId, chapterId: chapId, questions: qs
        });

        document.getElementById('modal-session').classList.add('hidden');
        saveAndRefresh();
        showToast('Session logged successfully');
    });

    // -- History Logic --
    function renderHistory() {
        const tbody = document.getElementById('history-container');
        tbody.innerHTML = '';
        
        // Sort newest first
        const sorted = [...appData.sessions].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sorted.forEach(s => {
            const date = new Date(s.timestamp).toLocaleString();
            const subName = appData.subjects[s.subjectId].name;
            const ch = appData.subjects[s.subjectId].chapters.find(c => c.id === s.chapterId);
            const chName = ch ? ch.name : '<span style="color:var(--error-color)">Deleted Chapter</span>';
            
            tbody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${subName}</td>
                    <td>${chName}</td>
                    <td>${s.questions}</td>
                    <td><button class="btn-icon delete-session" data-id="${s.id}"><span class="material-symbols-outlined">delete</span></button></td>
                </tr>
            `;
        });
    }

    document.getElementById('history-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-session');
        if(!btn) return;
        if(confirm('Delete this session? (Will reverse completed questions)')) {
            const sid = btn.getAttribute('data-id');
            const session = appData.sessions.find(s => s.id === sid);
            if(session) {
                const ch = appData.subjects[session.subjectId].chapters.find(c => c.id === session.chapterId);
                if(ch) ch.completedQuestions = Math.max(0, ch.completedQuestions - session.questions);
                appData.sessions = appData.sessions.filter(s => s.id !== sid);
                saveAndRefresh();
                showToast('Session deleted');
            }
        }
    });

    // -- Utility & Data Actions --
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('.modal').classList.add('hidden'));
    });

    function saveAndRefresh() {
        StorageManager.saveData(appData);
        if(!document.getElementById('view-dashboard').classList.contains('hidden')) updateDashboard();
        if(!document.getElementById('view-subjects').classList.contains('hidden')) renderSubjects();
        if(!document.getElementById('view-analytics').classList.contains('hidden')) Analytics.init(appData);
        if(!document.getElementById('view-history').classList.contains('hidden')) renderHistory();
    }

    document.getElementById('btn-export').addEventListener('click', () => StorageManager.exportData());
    document.getElementById('btn-reset').addEventListener('click', () => {
        if(confirm('WARNING: This will delete ALL data. Are you sure?')) {
            StorageManager.resetData();
            location.reload();
        }
    });

    document.getElementById('btn-import-trigger').addEventListener('click', () => {
        document.getElementById('file-import').click();
    });

    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            if(StorageManager.importData(evt.target.result)) {
                alert('Data imported successfully!');
                location.reload();
            } else {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    });

    // Start App
    init();
});
