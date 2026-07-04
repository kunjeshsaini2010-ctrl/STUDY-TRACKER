document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('study-form');
    const tableBody = document.querySelector('#study-table tbody');

    const loadData = () => {
        const entries = JSON.parse(localStorage.getItem('studyTrackerEntries')) || [];
        tableBody.innerHTML = '';
        entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.subject}</td>
                <td>${entry.chapter}</td>
                <td>${entry.totalQuestions}</td>
                <td><button class="delete-btn" onclick="deleteEntry(${index})">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });
    };

    const saveData = (entries) => {
        localStorage.setItem('studyTrackerEntries', JSON.stringify(entries));
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('subject').value;
        const chapter = document.getElementById('chapter').value;
        const totalQuestions = document.getElementById('total-questions').value;

        const entries = JSON.parse(localStorage.getItem('studyTrackerEntries')) || [];
        entries.push({ subject, chapter, totalQuestions });
        
        saveData(entries);
        loadData();
        form.reset();
    });

    window.deleteEntry = (index) => {
        const entries = JSON.parse(localStorage.getItem('studyTrackerEntries')) || [];
        entries.splice(index, 1);
        saveData(entries);
        loadData();
    };

    loadData();
});
