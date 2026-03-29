import gsap from 'gsap';
import type { Task } from './types';
import { tasks, fetchTasks, saveTask, deleteTask, updateTasksArray } from './api';
import { attachUndoHandler } from './toast';
import {
    setupDragAndDrop,
    openModal, closeModal,
    openViewModal, closeViewModal,
    openProfileModal, closeProfileModal,
    currentViewingTask,
} from './ui';
import { initFocusTimer } from './focus';

declare const io: any;
const socket = io();

// ─── Date Helpers ────────────────────────────────────────────────────────────

/** Formats a Date to a local `datetime-local` input value without UTC drift. */
function toLocalInputValue(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Returns true if the given ISO date string falls on today's calendar date. */
function isToday(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/** Returns true if a non-done task has a due date that has already passed. */
function isOverdue(task: { status: string; due_date: string | null }): boolean {
    if (task.status === 'done' || !task.due_date) return false;
    return new Date(task.due_date) < new Date();
}

// ─── Board Column Logic ───────────────────────────────────────────────────────

/**
 * Determines which of the four Kanban columns a task should appear in.
 * Tasks starting today are auto-promoted to 'in_progress' and persisted.
 */
function resolveDisplayColumn(task: Task): string {
    if (task.status === 'done') return 'done';
    if (isOverdue(task)) return 'overdue';
    if (task.status === 'in_progress') return 'in_progress';

    if (task.status === 'todo' && isToday(task.start_date)) {
        saveTask({ status: 'in_progress' }, task.id);
        task.status = 'in_progress';
        return 'in_progress';
    }

    return 'todo';
}

/**
 * Clears and re-renders the entire Kanban board from the in-memory task list.
 * Applies the active search query and updates all column + sidebar counters.
 */
function renderBoard() {
    const cols = {
        todo:        document.getElementById('col-todo'),
        in_progress: document.getElementById('col-in_progress'),
        done:        document.getElementById('col-done'),
        overdue:     document.getElementById('col-overdue'),
    };

    if (!cols.todo || !cols.in_progress || !cols.done || !cols.overdue) return;
    cols.todo.innerHTML = '';
    cols.in_progress.innerHTML = '';
    cols.done.innerHTML = '';
    cols.overdue.innerHTML = '';

    const searchQuery = (document.getElementById('global-search') as HTMLInputElement)?.value.toLowerCase() || '';

    const visibleTasks = tasks.filter(task => {
        if (!searchQuery) return true;
        const sd = task.start_date ? new Date(task.start_date).toLocaleDateString().toLowerCase() : '';
        const dd = task.due_date   ? new Date(task.due_date).toLocaleDateString().toLowerCase()   : '';
        return `${task.title} ${task.description || ''} ${task.status.replace('_', ' ')} ${task.priority} ${sd} ${dd}`
            .toLowerCase()
            .includes(searchQuery);
    });

    const counts = { todo: 0, in_progress: 0, done: 0, overdue: 0 };

    visibleTasks.forEach(task => {
        const colKey = resolveDisplayColumn(task) as keyof typeof cols;
        counts[colKey as keyof typeof counts]++;

        const priorityColor = task.priority === 'high' ? 'text-red-400' : task.priority === 'low' ? 'text-slate-500' : 'text-cyan-400';
        const statusDot     = colKey === 'overdue' ? 'bg-red-500' : colKey === 'done' ? 'bg-green-500' : colKey === 'in_progress' ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]' : 'bg-slate-500';
        const overdueBadge  = colKey === 'overdue' ? `<span class="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Overdue</span>` : '';

        const card = document.createElement('div');
        card.draggable = true;
        card.className = `p-4 bg-slate-800/60 backdrop-blur-sm border ${colKey === 'overdue' ? 'border-red-500/30 hover:border-red-400/60' : 'border-slate-700/50 hover:border-cyan-500/40'} rounded-xl hover:bg-slate-800/90 transition-all cursor-pointer group shadow-md`;
        card.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full shrink-0 ${statusDot}"></div>
                    <span class="text-xs font-bold uppercase tracking-wider ${priorityColor}">${task.priority}</span>
                    ${overdueBadge}
                </div>
                <button onclick="event.stopPropagation(); window.delTask(${task.id})" class="pointer-events-auto opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 rounded">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
            <h4 class="font-bold text-slate-100 text-sm mb-2 leading-snug">${task.title}</h4>
            ${task.description ? `<p class="text-xs text-slate-500 mb-2 line-clamp-2">${task.description}</p>` : ''}
            <div class="flex items-center gap-3 text-xs text-slate-600">
                ${task.due_date ? `<div class="flex items-center gap-1 ${colKey === 'overdue' ? 'text-red-400 font-bold' : ''}"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>${new Date(task.due_date).toLocaleDateString()}</div>` : ''}
            </div>`;

        card.addEventListener('dragstart', e => {
            e.dataTransfer?.setData('taskId', task.id.toString());
            setTimeout(() => card.classList.add('opacity-40', 'scale-95'), 0);
        });
        card.addEventListener('dragend', () => card.classList.remove('opacity-40', 'scale-95'));
        card.addEventListener('click', () => openViewModal(task));
        cols[colKey]?.appendChild(card);
    });

    // Update column header counters
    document.getElementById('todo-count')!.innerText       = counts.todo.toString();
    document.getElementById('inprogress-count')!.innerText = counts.in_progress.toString();
    document.getElementById('done-count')!.innerText       = counts.done.toString();
    document.getElementById('overdue-count')!.innerText    = counts.overdue.toString();

    // Update sidebar live counters
    const total = counts.todo + counts.in_progress + counts.done + counts.overdue;
    const sbEl  = (id: string) => document.getElementById(id);
    sbEl('sb-all-count')?.innerText      !== undefined && (sbEl('sb-all-count')!.innerText      = total.toString());
    sbEl('sb-todo-count')?.innerText     !== undefined && (sbEl('sb-todo-count')!.innerText     = counts.todo.toString());
    sbEl('sb-inprogress-count')?.innerText !== undefined && (sbEl('sb-inprogress-count')!.innerText = counts.in_progress.toString());
    sbEl('sb-done-count')?.innerText     !== undefined && (sbEl('sb-done-count')!.innerText     = counts.done.toString());
    sbEl('sb-overdue-count')?.innerText  !== undefined && (sbEl('sb-overdue-count')!.innerText  = counts.overdue.toString());
}

// ─── Sidebar Accordion ────────────────────────────────────────────────────────

let tasksNavOpen = false;

/** Toggles the "All Tasks" sidebar accordion open and closed. */
(window as any).toggleTasksNav = () => {
    tasksNavOpen = !tasksNavOpen;
    const sub     = document.getElementById('nav-tasks-sub');
    const chevron = document.getElementById('tasks-chevron');
    if (sub)     sub.style.maxHeight            = tasksNavOpen ? '300px' : '0';
    if (chevron) chevron.style.transform        = tasksNavOpen ? 'rotate(180deg)' : '';
};

// ─── Board Column Filter ──────────────────────────────────────────────────────

/**
 * Filters the Kanban board to show only tasks matching the given status.
 * Passing 'all' restores all four columns.
 */
(window as any).filterBoard = (filter: string) => {
    document.querySelectorAll<HTMLElement>('.nav-sub-item').forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle('bg-slate-800/80', isActive);
        btn.classList.toggle('text-white', isActive);
    });

    ['todo', 'in_progress', 'done', 'overdue'].forEach(status => {
        const col = document.getElementById(`drop-${status}`);
        if (col) col.style.display = filter === 'all' || filter === status ? '' : 'none';
    });
};

// ─── Global Task Helpers ──────────────────────────────────────────────────────

/** Exposed to inline HTML onclick handlers for deleting a task by ID. */
(window as any).delTask = (id: number) => deleteTask(id, renderBoard);

/** Deletes the currently open task from within the view modal. */
(window as any).delTaskFromView = () => {
    if (currentViewingTask) {
        (window as any).delTask(currentViewingTask.id);
        closeViewModal();
    }
};

// ─── Real-time WebSocket Sync ─────────────────────────────────────────────────

socket.on('task_created', (task: Task) => { updateTasksArray([...tasks, task]); renderBoard(); });
socket.on('task_updated', (task: Task) => {
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) { tasks[idx] = task; renderBoard(); }
});
socket.on('task_deleted', (data: { id: number }) => {
    updateTasksArray(tasks.filter(t => t.id !== data.id));
    renderBoard();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    attachUndoHandler(() => fetchTasks(renderBoard));
    setupDragAndDrop(renderBoard);
    initFocusTimer(renderBoard);

    // Task modal
    document.getElementById('close-modal-secondary')?.addEventListener('click', closeModal);
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
    document.getElementById('add-task-btn')?.addEventListener('click', () => openModal());
    document.getElementById('add-task-btn-mobile')?.addEventListener('click', () => openModal());

    // Mobile sidebar — driven via inline style to bypass Tailwind JIT limitations
    const isMobile = () => window.innerWidth < 768;

    const initSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.transform = isMobile() ? 'translateX(-100%)' : '';
    };

    const closeSidebar = () => {
        const sidebar   = document.getElementById('sidebar');
        const backdrop  = document.getElementById('mobile-sidebar-backdrop');
        if (sidebar) sidebar.style.transform = 'translateX(-100%)';
        backdrop?.classList.add('opacity-0', 'pointer-events-none');
    };

    const openSidebar = () => {
        const sidebar   = document.getElementById('sidebar');
        const backdrop  = document.getElementById('mobile-sidebar-backdrop');
        if (sidebar) sidebar.style.transform = 'translateX(0)';
        backdrop?.classList.remove('opacity-0', 'pointer-events-none');
    };

    initSidebar();
    window.addEventListener('resize', () => (isMobile() ? initSidebar() : (() => {
        const sidebar  = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobile-sidebar-backdrop');
        if (sidebar) sidebar.style.transform = '';
        backdrop?.classList.add('opacity-0', 'pointer-events-none');
    })()));

    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', openSidebar);
    document.getElementById('close-sidebar-btn')?.addEventListener('click', closeSidebar);
    document.getElementById('mobile-sidebar-backdrop')?.addEventListener('click', closeSidebar);

    // Task detail modal
    document.getElementById('close-view-btn')?.addEventListener('click', closeViewModal);
    document.getElementById('edit-task-btn')?.addEventListener('click', () => {
        const task = currentViewingTask;
        if (task) { closeViewModal(); setTimeout(() => openModal(task), 300); }
    });

    // Task form submit — reads checkboxes, auto-promotes status, and saves
    document.getElementById('task-form')?.addEventListener('submit', e => {
        e.preventDefault();

        const idVal      = (document.getElementById('task-id')    as HTMLInputElement).value;
        const startInput = document.getElementById('task-start')  as HTMLInputElement;
        const dueInput   = document.getElementById('task-due')    as HTMLInputElement;
        const now        = new Date();

        if ((document.getElementById('use-current-date') as HTMLInputElement)?.checked)
            startInput.value = toLocalInputValue(now);
        if ((document.getElementById('use-24h-due') as HTMLInputElement)?.checked)
            dueInput.value = toLocalInputValue(new Date(now.getTime() + 24 * 60 * 60 * 1000));

        const startVal = startInput.value;
        const dueVal   = dueInput.value;
        const startDt  = startVal ? new Date(startVal) : null;

        let status = (document.getElementById('task-status') as HTMLSelectElement).value;
        if (status === 'todo' && startDt && isToday(startDt.toISOString())) status = 'in_progress';

        saveTask({
            title:       (document.getElementById('task-title')    as HTMLInputElement).value,
            description: (document.getElementById('task-desc')     as HTMLTextAreaElement).value,
            status:      status as Task['status'],
            priority:    (document.getElementById('task-priority') as HTMLSelectElement).value as Task['priority'],
            start_date:  startVal ? new Date(startVal).toISOString() : null,
            due_date:    dueVal   ? new Date(dueVal).toISOString()   : null,
        }, idVal ? parseInt(idVal) : undefined);

        closeModal();
    });

    // Search input live-filters the board
    document.getElementById('global-search')?.addEventListener('input', renderBoard);

    // Profile modal
    document.getElementById('edit-profile-action')?.addEventListener('click', e => { e.preventDefault(); openProfileModal(); });
    document.getElementById('close-profile-btn')?.addEventListener('click', closeProfileModal);

    document.getElementById('profile-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const name       = (document.getElementById('profile-name')   as HTMLInputElement).value;
        const avatar_url = (document.getElementById('profile-avatar') as HTMLInputElement).value;
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, avatar_url }),
            });
            if (res.ok) window.location.reload();
        } catch (err) {
            console.error('Profile update failed:', err);
        }
    });

    // Dashboard entrance animations
    gsap.from('aside',            { x: -50, opacity: 0, duration: 0.8, ease: 'power3.out' });
    gsap.from('header',           { y: -30, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' });
    gsap.from('#kanban-board > div', { y: 30, opacity: 0, duration: 0.6, delay: 0.4, stagger: 0.15, ease: 'power2.out' });

    fetchTasks(renderBoard);
});
