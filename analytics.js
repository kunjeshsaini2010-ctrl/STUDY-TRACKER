const Analytics = {
    charts: {},

    init: function(data) {
        this.renderStats(data);
        this.renderDailyChart(data);
        this.renderSubjectChart(data);
        this.renderChapterChart(data);
    },

    clearCharts: function() {
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    },

    renderStats: function(data) {
        const sessions = data.sessions;
        if(sessions.length === 0) {
            document.getElementById('stat-streak').innerText = '0 Days';
            document.getElementById('stat-avg').innerText = '0';
            return;
        }

        // Calculate Streak
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0,0,0,0);
        
        // group by date string
        const datesSet = new Set(sessions.map(s => new Date(s.timestamp).toDateString()));
        
        while(true) {
            if(datesSet.has(currentDate.toDateString())) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (streak === 0 && datesSet.has(new Date(currentDate.getTime() - 86400000).toDateString())) {
                // Allows maintaining streak if user hasn't studied *yet* today but studied yesterday
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        document.getElementById('stat-streak').innerText = `${streak} Days`;

        // Calculate Avg per day
        const firstDate = new Date(Math.min(...sessions.map(s => new Date(s.timestamp))));
        const daysDiff = Math.max(1, Math.ceil((new Date() - firstDate) / (1000 * 60 * 60 * 24)));
        const totalQs = sessions.reduce((sum, s) => sum + s.questions, 0);
        document.getElementById('stat-avg').innerText = (totalQs / daysDiff).toFixed(1);
    },

    renderDailyChart: function(data) {
        const ctx = document.getElementById('chart-daily').getContext('2d');
        const labels = [];
        const chartData = [];
        const themeColor = StorageManager.getTheme() === 'dark' ? '#bb86fc' : '#6200ea';
        const textColor = StorageManager.getTheme() === 'dark' ? '#fff' : '#333';

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
            
            const qs = data.sessions
                .filter(s => new Date(s.timestamp).toDateString() === d.toDateString())
                .reduce((sum, s) => sum + s.questions, 0);
            chartData.push(qs);
        }

        if(this.charts.daily) this.charts.daily.destroy();
        this.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Questions Solved', data: chartData, backgroundColor: themeColor }] },
            options: { responsive: true, maintainAspectRatio: false, color: textColor, scales: { y: { beginAtZero: true, ticks: { color: textColor } }, x: { ticks: { color: textColor } } } }
        });
    },

    renderSubjectChart: function(data) {
        const ctx = document.getElementById('chart-subjects').getContext('2d');
        const subjects = Object.values(data.subjects);
        const labels = subjects.map(s => s.name);
        const chartData = subjects.map(s => s.chapters.reduce((sum, c) => sum + c.completedQuestions, 0));
        const textColor = StorageManager.getTheme() === 'dark' ? '#fff' : '#333';

        if(this.charts.subjects) this.charts.subjects.destroy();
        this.charts.subjects = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: chartData, backgroundColor: ['#6200ea', '#03dac6', '#cf6679'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, color: textColor, plugins: { legend: { labels: { color: textColor } } } }
        });
    },

    renderChapterChart: function(data) {
        const ctx = document.getElementById('chart-chapters').getContext('2d');
        let chapters = [];
        Object.values(data.subjects).forEach(sub => {
            chapters = chapters.concat(sub.chapters.map(c => ({ name: c.name, completed: c.completedQuestions })));
        });
        
        // Top 10 chapters by completion
        chapters.sort((a,b) => b.completed - a.completed);
        const top10 = chapters.slice(0, 10);
        
        const labels = top10.map(c => c.name);
        const chartData = top10.map(c => c.completed);
        const themeColor = StorageManager.getTheme() === 'dark' ? '#03dac6' : '#03dac6';
        const textColor = StorageManager.getTheme() === 'dark' ? '#fff' : '#333';

        if(this.charts.chapters) this.charts.chapters.destroy();
        this.charts.chapters = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Top 10 Chapters (Completed)', data: chartData, borderColor: themeColor, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, color: textColor, scales: { y: { beginAtZero: true, ticks: { color: textColor } }, x: { ticks: { color: textColor } } } }
        });
    }
};
