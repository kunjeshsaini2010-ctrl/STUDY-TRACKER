const defaultState = {
    theme: 'light',
    subjects: {
        physics: { id: 'physics', name: 'Physics', chapters: [] },
        chemistry: { id: 'chemistry', name: 'Chemistry', chapters: [] },
        mathematics: { id: 'mathematics', name: 'Mathematics', chapters: [] }
    },
    sessions: [] // { id, timestamp, subjectId, chapterId, questions }
};

const StorageManager = {
    getKey: () => 'studyTrackerData',

    getData: function() {
        const data = localStorage.getItem(this.getKey());
        if (!data) {
            this.saveData(defaultState);
            return defaultState;
        }
        return JSON.parse(data);
    },

    saveData: function(data) {
        localStorage.setItem(this.getKey(), JSON.stringify(data));
    },

    getTheme: function() {
        return this.getData().theme;
    },

    setTheme: function(theme) {
        const data = this.getData();
        data.theme = theme;
        this.saveData(data);
    },

    exportData: function() {
        const data = this.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData: function(jsonData) {
        try {
            const parsed = JSON.parse(jsonData);
            if(parsed.subjects && parsed.sessions) {
                this.saveData(parsed);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    },

    resetData: function() {
        this.saveData(defaultState);
    }
};
