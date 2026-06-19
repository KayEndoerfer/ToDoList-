// Task Manager Application
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const appGrid = document.querySelector('.app-grid');
const detailEmpty = document.getElementById('detailEmpty');
const detailCard = document.getElementById('detailCard');
const detailTitle = document.getElementById('detailTitle');
const detailCreated = document.getElementById('detailCreated');
const detailStatus = document.getElementById('detailStatus');
const priorityButtonsGroup = document.getElementById('priorityButtonsGroup');
const descriptionInput = document.getElementById('descriptionInput');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const subtaskInput = document.getElementById('subtaskInput');
const subtaskAddBtn = document.getElementById('subtaskAddBtn');
const subtaskList = document.getElementById('subtaskList');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const clearSubtasksBtn = document.getElementById('clearSubtasksBtn');
const deleteConfirmation = document.getElementById('deleteConfirmation');
const deleteConfirmationText = document.getElementById('deleteConfirmationText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const archiveToggleBtn = document.getElementById('archiveToggleBtn');
const restoreBtn = document.getElementById('restoreBtn');
const permanentDeleteBtn = document.getElementById('permanentDeleteBtn');
const inputSection = document.getElementById('inputSection');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let activeTaskId = null;
let pendingDeleteId = null;
let viewMode = 'active'; // 'active' or 'archived'
let isArchiveDelete = false; // true if confirming permanent delete from archive

// Ensure all tasks have the archived field (for backward compatibility)
tasks = tasks.map(t => ({...t, archived: t.archived || false}));

function init() {
    // Ensure tasks array only contains valid, non-deleted items
    tasks = tasks.filter(t => t && t.id);
    saveTasks();
    renderTasks();
    updateStats();
    bindEvents();
}

function bindEvents() {
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    closeDetailBtn.addEventListener('click', closeDetailPanel);
    
    // Priority button listeners
    const priorityBtns = document.querySelectorAll('.priority-btn');
    priorityBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const priority = e.target.getAttribute('data-priority');
            changePriority(priority);
        });
    });
    
    descriptionInput.addEventListener('input', saveActiveTaskDetails);
    subtaskAddBtn.addEventListener('click', addSubtaskToActiveTask);
    subtaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSubtaskToActiveTask();
    });
    clearSubtasksBtn.addEventListener('click', clearSubtasks);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    cancelDeleteBtn.addEventListener('click', cancelDelete);
    archiveToggleBtn.addEventListener('click', toggleViewMode);
    restoreBtn.addEventListener('click', restoreActiveTask);
    permanentDeleteBtn.addEventListener('click', permanentlyDeleteActive);
}

function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        archived: false,
        description: '',
        priority: 'Medium',
        subtasks: [],
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    updateStats();
    taskInput.value = '';
    taskInput.focus();
    openTaskDetail(newTask.id);
}

function renderTasks() {
    taskList.innerHTML = '';
    
    // Filter tasks based on viewMode
    const visibleTasks = tasks.filter(t => t.archived === (viewMode === 'archived'));

    if (visibleTasks.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = viewMode === 'active' ? 'No active tasks. Add one to get started!' : 'No archived tasks.';
        taskList.appendChild(emptyMsg);
        return;
    }

    visibleTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) li.classList.add('completed');
        if (task.id === activeTaskId) li.classList.add('selected');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', (event) => {
            event.stopPropagation();
            toggleTask(task.id);
        });
        checkbox.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;

        const priorityBadge = document.createElement('span');
        priorityBadge.className = `task-priority-badge priority-${(task.priority || 'Medium').toLowerCase()}`;
        priorityBadge.textContent = task.priority || 'Medium';

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete';
        deleteButton.textContent = '🗑';
        deleteButton.title = viewMode === 'active' ? 'Archive task' : 'Delete task';
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteTask(task.id);
        });

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(priorityBadge);
        li.appendChild(deleteButton);
        li.addEventListener('click', (e) => {
            if (e.target === checkbox || e.target === deleteButton) return;
            openTaskDetail(task.id);
        });

        taskList.appendChild(li);
    });
}

function openTaskDetail(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isSwitch = !detailCard.classList.contains('hidden') && activeTaskId !== id;
    activeTaskId = id;
    appGrid.classList.add('open');
    detailEmpty.classList.add('hidden');
    detailCard.classList.remove('hidden');

    detailTitle.textContent = task.text;
    detailCreated.textContent = `Created: ${new Date(task.createdAt).toLocaleString()}`;
    descriptionInput.value = task.description;
    
    // Update priority buttons state
    updatePriorityButtons(task.priority);
    
    // Show/hide restore and delete buttons based on archive status
    if (task.archived) {
        restoreBtn.classList.remove('hidden');
        permanentDeleteBtn.classList.remove('hidden');
        descriptionInput.disabled = true;
        subtaskInput.disabled = true;
        subtaskAddBtn.disabled = true;
        clearSubtasksBtn.disabled = true;
        priorityButtonsGroup.style.pointerEvents = 'none';
        priorityButtonsGroup.style.opacity = '0.5';
    } else {
        restoreBtn.classList.add('hidden');
        permanentDeleteBtn.classList.add('hidden');
        descriptionInput.disabled = false;
        subtaskInput.disabled = false;
        subtaskAddBtn.disabled = false;
        clearSubtasksBtn.disabled = false;
        priorityButtonsGroup.style.pointerEvents = 'auto';
        priorityButtonsGroup.style.opacity = '1';
    }
    
    updateProgressDisplay(task);
    updateDetailHeader(task);
    renderSubtasks(task);
    renderTasks();

    if (isSwitch) {
        animateDetailRefresh();
    }
}

function animateDetailRefresh() {
    if (!detailCard.animate) return;
    detailCard.animate([
        { opacity: 0.8, transform: 'translateY(-12px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], {
        duration: 260,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
}

function closeDetailPanel() {
    activeTaskId = null;
    appGrid.classList.remove('open');
    detailEmpty.classList.remove('hidden');
    detailCard.classList.add('hidden');
    renderTasks();
}

function saveActiveTaskDetails() {
    if (!activeTaskId) return;
    const task = tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    task.description = descriptionInput.value;
    saveTasks();
    updateDetailHeader(task);
}

function changePriority(priority) {
    if (!activeTaskId) return;
    const task = tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    task.priority = priority;
    updatePriorityButtons(priority);
    updateDetailHeader(task);
    saveTasks();
    renderTasks();
}

function updatePriorityButtons(currentPriority) {
    const priorityBtns = document.querySelectorAll('.priority-btn');
    priorityBtns.forEach(btn => {
        if (btn.getAttribute('data-priority') === currentPriority) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function renderSubtasks(task) {
    subtaskList.innerHTML = '';

    if (task.subtasks.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'task-item';
        emptyItem.textContent = 'No subtasks yet. Add one to track progress.';
        subtaskList.appendChild(emptyItem);
        return;
    }

    task.subtasks.forEach(subtask => {
        const li = document.createElement('li');
        li.className = 'subtask-item';

        const label = document.createElement('label');
        label.className = 'subtask-label';
        if (subtask.completed) label.classList.add('completed');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = subtask.completed;
        checkbox.addEventListener('change', () => {
            toggleSubtask(task.id, subtask.id);
        });

        const text = document.createElement('span');
        text.textContent = subtask.text;

        label.appendChild(checkbox);
        label.appendChild(text);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'subtask-delete';
        deleteButton.textContent = '✕';
        deleteButton.addEventListener('click', () => {
            removeSubtask(task.id, subtask.id);
        });

        li.appendChild(label);
        li.appendChild(deleteButton);
        subtaskList.appendChild(li);
    });
}

function addSubtaskToActiveTask() {
    if (!activeTaskId) return;
    const subtaskText = subtaskInput.value.trim();
    if (!subtaskText) return;

    const task = tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    task.subtasks.push({
        id: Date.now(),
        text: subtaskText,
        completed: false
    });

    subtaskInput.value = '';
    saveTasks();
    renderSubtasks(task);
    updateProgressDisplay(task);
}

function toggleSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    subtask.completed = !subtask.completed;
    saveTasks();
    renderSubtasks(task);
    updateProgressDisplay(task);
}

function removeSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    saveTasks();
    renderSubtasks(task);
    updateProgressDisplay(task);
}

function clearSubtasks() {
    if (!activeTaskId) return;

    const task = tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    task.subtasks = [];
    saveTasks();
    renderSubtasks(task);
    updateProgressDisplay(task);
}

function updateProgressDisplay(task) {
    const total = task.subtasks.length;
    const completed = task.subtasks.filter(st => st.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    detailStatus.textContent = task.completed ? 'Completed' : 'In progress';
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateStats();
        if (activeTaskId === id) {
            updateDetailHeader(task);
        }
    }
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    pendingDeleteId = id;
    isArchiveDelete = task.archived; // true if deleting from archive
    
    if (task.archived) {
        deleteConfirmationText.textContent = `Permanently delete "${task.text}"? This cannot be undone.`;
        confirmDeleteBtn.textContent = 'Permanently Delete';
        confirmDeleteBtn.style.backgroundColor = '#dc2626';
    } else {
        deleteConfirmationText.textContent = `Archive "${task.text}"?`;
        confirmDeleteBtn.textContent = 'Archive';
        confirmDeleteBtn.style.backgroundColor = '';
    }
    
    deleteConfirmation.classList.remove('hidden');
}

function confirmDelete() {
    if (!pendingDeleteId) return;

    const task = tasks.find(t => t.id === pendingDeleteId);
    if (!task) return;

    if (isArchiveDelete) {
        // Permanently delete from archive
        tasks = tasks.filter(t => t.id !== pendingDeleteId);
    } else {
        // Archive the task (active view)
        task.archived = true;
    }

    if (activeTaskId === pendingDeleteId) {
        closeDetailPanel();
    }
    
    saveTasks();
    renderTasks();
    updateStats();
    cancelDelete();
}

function cancelDelete() {
    pendingDeleteId = null;
    isArchiveDelete = false;
    deleteConfirmation.classList.add('hidden');
    confirmDeleteBtn.textContent = 'Archive';
    confirmDeleteBtn.style.backgroundColor = '';
}

function toggleViewMode() {
    viewMode = viewMode === 'active' ? 'archived' : 'active';
    archiveToggleBtn.textContent = viewMode === 'active' ? '📦 Archive' : '← Active Tasks';
    archiveToggleBtn.classList.toggle('active-mode', viewMode === 'active');
    
    // Hide input section in archive view
    if (viewMode === 'archived') {
        inputSection.style.display = 'none';
    } else {
        inputSection.style.display = '';
    }
    
    closeDetailPanel();
    renderTasks();
    updateStats();
}

function restoreActiveTask() {
    if (!activeTaskId) return;
    const task = tasks.find(t => t.id === activeTaskId);
    if (!task || !task.archived) return;
    
    task.archived = false;
    saveTasks();
    closeDetailPanel();
    renderTasks();
    updateStats();
}

function permanentlyDeleteActive() {
    if (!activeTaskId) return;
    deleteTask(activeTaskId);
}

function updateStats() {
    if (viewMode === 'archived') {
        const archivedCount = tasks.filter(t => t.archived).length;
        totalTasksSpan.textContent = archivedCount;
        completedTasksSpan.textContent = tasks.filter(t => t.archived && t.completed).length;
    } else {
        const activeTasks = tasks.filter(t => !t.archived);
        const total = activeTasks.length;
        const completed = activeTasks.filter(t => t.completed).length;
        totalTasksSpan.textContent = total;
        completedTasksSpan.textContent = completed;
    }
}

function updateDetailHeader(task) {
    detailStatus.textContent = task.completed ? 'Completed' : 'In progress';
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Reset all data (for testing)
function resetAllData() {
    tasks = [];
    activeTaskId = null;
    pendingDeleteId = null;
    viewMode = 'active';
    localStorage.removeItem('tasks');
    location.reload();
}

// Make resetAllData available in console
window.resetAllData = resetAllData;

init();