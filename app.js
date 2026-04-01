// ============================================
// Data Model and State
// ============================================

let appData = {
    habits: []
};

let editingHabitId = null;
let deletingHabitId = null;

const STORAGE_KEY = 'habitTrackerData';
const HABIT_COLOR_PALETTE = [
    '#22c55e',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#a855f7',
    '#06b6d4',
    '#84cc16',
    '#f97316'
];

// ============================================
// Utility Functions
// ============================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    const today = new Date();
    return formatDate(today);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get date string N days ago
 */
function getDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDate(date);
}

/**
 * Get array of last N days in YYYY-MM-DD format
 */
function getLastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        days.push(getDaysAgo(i));
    }
    return days;
}

/**
 * Format date for display (e.g., "March 6, 2026")
 */
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

/**
 * Get day of week (0 = Sunday, 1 = Monday, etc.)
 */
function getDayOfWeek(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDay();
}

/**
 * Generate a unique ID
 */
function generateId() {
    return `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a date is in the future
 */
function isFutureDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}

/**
 * Choose a default color that rotates across the palette.
 */
function getNextHabitColor() {
    const index = appData.habits.length % HABIT_COLOR_PALETTE.length;
    return HABIT_COLOR_PALETTE[index];
}

// ============================================
// LocalStorage Functions
// ============================================

/**
 * Load data from localStorage
 */
function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            appData = JSON.parse(stored);
        } else {
            // Initialize with seed data
            initializeSeedData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        initializeSeedData();
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

/**
 * Initialize with seed data
 */
function initializeSeedData() {
    const colors = ['#22c55e', '#3b82f6', '#a855f7'];
    const habitNames = ['Workout', 'Read', 'Meditate'];
    const today = new Date();
    
    appData.habits = habitNames.map((name, index) => {
        const habit = {
            id: generateId(),
            name: name,
            color: colors[index],
            createdAt: getTodayDate(),
            entries: {}
        };

        // Add some random completed days in the last 30 days
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            
            // 60% chance of completion
            if (Math.random() > 0.4) {
                habit.entries[dateStr] = 1;
            }
        }

        return habit;
    });

    saveData();
}

// ============================================
// Habit CRUD Operations
// ============================================

/**
 * Add a new habit
 */
function addHabit(name, color = getNextHabitColor()) {
    const habit = {
        id: generateId(),
        name: name.trim(),
        color: color,
        createdAt: getTodayDate(),
        entries: {}
    };

    appData.habits.push(habit);
    saveData();
    renderApp();
}

/**
 * Edit an existing habit
 */
function editHabit(id, newName, newColor) {
    const habit = appData.habits.find(h => h.id === id);
    if (habit) {
        habit.name = newName.trim();
        habit.color = newColor;
        saveData();
        renderApp();
    }
}

/**
 * Delete a habit
 */
function deleteHabit(id) {
    appData.habits = appData.habits.filter(h => h.id !== id);
    saveData();
    renderApp();
}

/**
 * Toggle habit entry for a specific date
 */
function toggleHabitEntry(habitId, date) {
    // Don't allow marking future dates
    if (isFutureDate(date)) {
        return;
    }

    const habit = appData.habits.find(h => h.id === habitId);
    if (habit) {
        if (habit.entries[date]) {
            delete habit.entries[date];
        } else {
            habit.entries[date] = 1;
        }
        saveData();
        renderApp();
    }
}

// ============================================
// Statistics Calculations
// ============================================

/**
 * Calculate current streak (consecutive days ending today)
 */
function calculateCurrentStreak(entries) {
    let streak = 0;
    let currentDate = new Date();

    while (true) {
        const dateStr = formatDate(currentDate);
        if (entries[dateStr]) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

/**
 * Calculate longest streak ever
 */
function calculateLongestStreak(entries) {
    const dates = Object.keys(entries)
        .filter(date => entries[date])
        .sort();

    if (dates.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1] + 'T00:00:00');
        const currDate = new Date(dates[i] + 'T00:00:00');
        const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return longestStreak;
}

/**
 * Calculate completion rate for last N days
 */
function calculateCompletionRate(entries, days = 30) {
    const lastNDays = getLastNDays(days);
    const completed = lastNDays.filter(date => entries[date]).length;
    return Math.round((completed / days) * 100);
}

/**
 * Check if habit is completed today
 */
function isCompletedToday(entries) {
    return !!entries[getTodayDate()];
}

// ============================================
// Heatmap Generation
// ============================================

/**
 * Generate heatmap data from January to January
 * Example: Jan 1, 2026 through Jan 1, 2027
 * Returns array of {date, dayOfWeek, week, month}
 */
function generateHeatmapDays() {
    const heatmapDays = [];

    const now = new Date();
    const startYear = now.getFullYear();
    const startDate = new Date(startYear, 0, 1); // Jan 1 of current year
    const endDate = new Date(startYear + 1, 0, 1); // Jan 1 of next year

    // Find the previous Monday so the first week aligns with a Monday-first grid
    const startDayOfWeek = startDate.getDay();
    const daysFromMonday = (startDayOfWeek + 6) % 7; // Mon=0 ... Sun=6
    if (daysFromMonday !== 0) {
        startDate.setDate(startDate.getDate() - daysFromMonday);
    }

    const currentDate = new Date(startDate);
    let weekIndex = 0;
    let lastMonth = -1;
    const monthPositions = [];

    // Generate all days through Jan 1 of next year so labels read Jan...Jan
    while (currentDate <= endDate) {
        const dateStr = formatDate(currentDate);
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday
        const month = currentDate.getMonth();

        // Track month changes for labels
        if (month !== lastMonth) {
            monthPositions.push({
                month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
                weekIndex: weekIndex
            });
            lastMonth = month;
        }

        heatmapDays.push({
            date: dateStr,
            dayOfWeek: dayOfWeek,
            weekIndex: weekIndex,
            month: month
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        // If we've completed a week (reached Monday), increment week index
        if (currentDate.getDay() === 1 && currentDate <= endDate) {
            weekIndex++;
        }
    }

    return { days: heatmapDays, monthPositions };
}

/**
 * Render a heatmap for a specific habit
 */
function renderHeatmap(habit) {
    const { days, monthPositions } = generateHeatmapDays();

    // Keep month labels readable by avoiding placements that are too close.
    const cellWidth = 12 + 3; // cell width + gap
    const minLabelSpacingPx = 32;
    const filteredMonthPositions = [];

    monthPositions.forEach(({ month, weekIndex }) => {
        const leftPosition = weekIndex * cellWidth;
        const lastLabel = filteredMonthPositions[filteredMonthPositions.length - 1];

        if (!lastLabel || leftPosition - lastLabel.leftPosition >= minLabelSpacingPx) {
            filteredMonthPositions.push({ month, weekIndex, leftPosition });
        } else {
            // Replace with the newer month when two labels would overlap.
            filteredMonthPositions[filteredMonthPositions.length - 1] = {
                month,
                weekIndex,
                leftPosition
            };
        }
    });
    
    // Create month labels
    let monthLabelsHTML = '<div class="month-labels">';
    filteredMonthPositions.forEach(({ month, leftPosition }) => {
        monthLabelsHTML += `<div class="month-label" style="position: absolute; left: ${leftPosition}px;">${month}</div>`;
    });
    monthLabelsHTML += '</div>';
    
    // Create day labels for all days of the week
    const dayLabelsHTML = `
        <div class="day-labels">
            <div class="day-label">Mon</div>
            <div class="day-label">Tue</div>
            <div class="day-label">Wed</div>
            <div class="day-label">Thu</div>
            <div class="day-label">Fri</div>
            <div class="day-label">Sat</div>
            <div class="day-label">Sun</div>
        </div>
    `;
    
    // Create grid cells (organized by week columns and day rows)
    let gridHTML = '<div class="heatmap-grid">';
    
    for (const day of days) {
        const isComplete = habit.entries[day.date] ? true : false;
        const isFuture = isFutureDate(day.date);
        const cellClasses = ['heat-cell'];
        
        if (isComplete) cellClasses.push('is-complete');
        if (isFuture) cellClasses.push('is-future');
        
        const displayDate = formatDateForDisplay(day.date);
        const status = isComplete ? 'Completed' : 'Not completed';
        const title = `${displayDate}: ${status}`;
        
        gridHTML += `
            <div 
                class="${cellClasses.join(' ')}"
                data-date="${day.date}"
                data-habit-id="${habit.id}"
                title="${title}"
                onclick="handleHeatmapClick('${habit.id}', '${day.date}')"
            ></div>
        `;
    }
    
    gridHTML += '</div>';
    
    return `
        <div class="heatmap-wrapper">
            <div class="heatmap-container">
                <div style="position: relative; height: 16px; margin-bottom: 4px;">
                    ${monthLabelsHTML}
                </div>
                <div class="heatmap-body">
                    ${dayLabelsHTML}
                    ${gridHTML}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Rendering Functions
// ============================================

/**
 * Render the entire app
 */
function renderApp() {
    renderSummary();
    renderHabits();
}

/**
 * Render summary cards
 */
function renderSummary() {
    const totalHabits = appData.habits.length;
    
    const completedToday = appData.habits.filter(habit => 
        isCompletedToday(habit.entries)
    ).length;
    
    const bestStreak = appData.habits.length > 0
        ? Math.max(...appData.habits.map(habit => 
            calculateCurrentStreak(habit.entries)
        ))
        : 0;
    
    const avgCompletionRate = appData.habits.length > 0
        ? Math.round(
            appData.habits.reduce((sum, habit) => 
                sum + calculateCompletionRate(habit.entries, 30), 0
            ) / appData.habits.length
        )
        : 0;
    
    document.getElementById('totalHabits').textContent = totalHabits;
    document.getElementById('completedToday').textContent = completedToday;
    document.getElementById('bestStreak').textContent = bestStreak;
    document.getElementById('completionRate').textContent = `${avgCompletionRate}%`;
}

/**
 * Render habits list
 */
function renderHabits() {
    const habitsSection = document.getElementById('habitsSection');
    const emptyState = document.getElementById('emptyState');
    
    if (appData.habits.length === 0) {
        habitsSection.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    habitsSection.innerHTML = appData.habits.map(habit => {
        const currentStreak = calculateCurrentStreak(habit.entries);
        const longestStreak = calculateLongestStreak(habit.entries);
        const completionRate = calculateCompletionRate(habit.entries, 30);
        const completedToday = isCompletedToday(habit.entries);
        
        return `
            <div class="habit-card">
                <div class="habit-header">
                    <div class="habit-title-group">
                        <div class="habit-color-dot" style="background: ${habit.color};"></div>
                        <h3 class="habit-name">${habit.name}</h3>
                    </div>
                    <div class="habit-actions">
                        <button 
                            class="btn-toggle-today ${completedToday ? 'completed' : ''}"
                            onclick="toggleHabitEntry('${habit.id}', '${getTodayDate()}')"
                        >
                            ${completedToday ? '✓ Done Today' : 'Mark as Done'}
                        </button>
                        <button class="btn-icon" onclick="openEditModal('${habit.id}')" title="Edit habit">
                            ✏️
                        </button>
                        <button class="btn-icon" onclick="openDeleteModal('${habit.id}')" title="Delete habit">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="habit-stats">
                    <div class="stat-item">
                        <span class="stat-label">Current Streak</span>
                        <span class="stat-value">${currentStreak} days</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Longest Streak</span>
                        <span class="stat-value">${longestStreak} days</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">30-Day Rate</span>
                        <span class="stat-value">${completionRate}%</span>
                    </div>
                </div>
                
                <div class="heatmap-section">
                    <div class="heatmap-title">Full Year (January to January)</div>
                    ${renderHeatmap(habit)}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Modal Functions
// ============================================

/**
 * Open add habit modal
 */
function openAddModal() {
    editingHabitId = null;
    document.getElementById('modalTitle').textContent = 'Add Habit';
    document.getElementById('habitName').value = '';
    document.getElementById('habitColor').value = getNextHabitColor();
    syncSelectedPaletteColor();
    document.getElementById('submitBtn').textContent = 'Add Habit';
    document.getElementById('habitModal').style.display = 'flex';
    document.getElementById('habitName').focus();
}

/**
 * Open edit habit modal
 */
function openEditModal(habitId) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    editingHabitId = habitId;
    document.getElementById('modalTitle').textContent = 'Edit Habit';
    document.getElementById('habitName').value = habit.name;
    document.getElementById('habitColor').value = habit.color;
    syncSelectedPaletteColor();
    document.getElementById('submitBtn').textContent = 'Save Changes';
    document.getElementById('habitModal').style.display = 'flex';
    document.getElementById('habitName').focus();
}

/**
 * Render selectable color swatches for quick selection.
 */
function renderColorPalette() {
    const paletteContainer = document.getElementById('colorPalette');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = HABIT_COLOR_PALETTE.map(color => `
        <button
            type="button"
            class="color-swatch"
            data-color="${color}"
            style="background-color: ${color};"
            aria-label="Choose color ${color}"
            title="${color}"
        ></button>
    `).join('');

    paletteContainer.querySelectorAll('.color-swatch').forEach(button => {
        button.addEventListener('click', () => {
            const selectedColor = button.dataset.color;
            document.getElementById('habitColor').value = selectedColor;
            syncSelectedPaletteColor();
        });
    });
}

/**
 * Keep swatch selection in sync with the current color input value.
 */
function syncSelectedPaletteColor() {
    const selectedColor = document.getElementById('habitColor').value.toLowerCase();
    document.querySelectorAll('.color-swatch').forEach(button => {
        const swatchColor = (button.dataset.color || '').toLowerCase();
        button.classList.toggle('selected', swatchColor === selectedColor);
    });
}

/**
 * Close habit modal
 */
function closeHabitModal() {
    document.getElementById('habitModal').style.display = 'none';
    editingHabitId = null;
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(habitId) {
    deletingHabitId = habitId;
    document.getElementById('confirmModal').style.display = 'flex';
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
    document.getElementById('confirmModal').style.display = 'none';
    deletingHabitId = null;
}

/**
 * Confirm delete habit
 */
function confirmDelete() {
    if (deletingHabitId) {
        deleteHabit(deletingHabitId);
        closeDeleteModal();
    }
}

/**
 * Handle habit form submission
 */
function handleHabitFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('habitName').value.trim();
    const color = document.getElementById('habitColor').value;
    
    if (!name) return;
    
    if (editingHabitId) {
        editHabit(editingHabitId, name, color);
    } else {
        addHabit(name, color);
    }
    
    closeHabitModal();
}

/**
 * Handle heatmap cell click
 */
function handleHeatmapClick(habitId, date) {
    toggleHabitEntry(habitId, date);
}

// ============================================
// Event Listeners
// ============================================

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Add habit buttons
    document.getElementById('addHabitBtn').addEventListener('click', openAddModal);
    document.getElementById('addHabitBtnEmpty').addEventListener('click', openAddModal);
    
    // Modal close buttons
    document.getElementById('modalClose').addEventListener('click', closeHabitModal);
    document.getElementById('cancelBtn').addEventListener('click', closeHabitModal);
    
    // Delete modal buttons
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // Form submission
    document.getElementById('habitForm').addEventListener('submit', handleHabitFormSubmit);

    // Keep palette highlight updated if user picks a custom color.
    document.getElementById('habitColor').addEventListener('input', syncSelectedPaletteColor);
    
    // Close modals on outside click
    document.getElementById('habitModal').addEventListener('click', (e) => {
        if (e.target.id === 'habitModal') {
            closeHabitModal();
        }
    });
    
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmModal') {
            closeDeleteModal();
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeHabitModal();
            closeDeleteModal();
        }
    });
}

/**
 * Update current date display
 */
function updateCurrentDate() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    document.getElementById('currentDate').textContent = dateStr;
}

// ============================================
// App Initialization
// ============================================

/**
 * Initialize the app
 */
function initApp() {
    loadData();
    updateCurrentDate();
    renderColorPalette();
    initializeEventListeners();
    renderApp();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
