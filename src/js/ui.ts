import gsap from 'gsap';
import type { Task } from './types';
import { saveTask, tasks } from './api';

/** Formats an ISO date string into the value expected by `<input type="datetime-local">`. */
export const formatDateForInput = (isoDate: string | null): string => {
    if (!isoDate) return '';
    return new Date(isoDate).toISOString().slice(0, 16);
};

/** Formats a Date object into a local datetime-local string without UTC conversion. */
const toLocalInputValue = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Wires drag-and-drop behaviour for all four Kanban columns.
 * Dropping a card onto a column immediately updates status locally and persists it.
 */
export function setupDragAndDrop(renderCallback: () => void) {
    const columns = ['todo', 'in_progress', 'done', 'overdue'];

    columns.forEach(status => {
        const col = document.getElementById(`drop-${status}`);
        if (!col) return;

        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('bg-slate-800/30', 'shadow-inner');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('bg-slate-800/30', 'shadow-inner');
        });

        col.addEventListener('drop', e => {
            e.preventDefault();
            col.classList.remove('bg-slate-800/30', 'shadow-inner');
            const taskId = (e as DragEvent).dataTransfer?.getData('taskId');
            if (!taskId) return;

            const id = parseInt(taskId);
            const task = tasks.find(t => t.id === id);
            if (task && task.status !== status) {
                task.status = status as Task['status'];
                renderCallback();
                saveTask({ status: task.status }, id);
            }
        });
    });
}

/**
 * Opens the task create/edit modal, pre-populating fields from an existing task
 * when provided. For new tasks, defaults start time to now and due time to +24h.
 * Checkboxes are cloned on each open to prevent stale event listeners.
 */
export function openModal(task?: Task) {
    const modal = document.getElementById('focus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const content = document.getElementById('task-form');
    const modeLabel = document.getElementById('form-mode-label');

    if (modeLabel) modeLabel.innerText = task ? 'Edit Task' : 'New Task';

    (document.getElementById('task-id') as HTMLInputElement).value = task ? task.id.toString() : '';
    (document.getElementById('task-title') as HTMLInputElement).value = task ? task.title : '';
    (document.getElementById('task-desc') as HTMLTextAreaElement).value = task ? task.description || '' : '';
    (document.getElementById('task-status') as HTMLSelectElement).value = task ? task.status : 'todo';
    (document.getElementById('task-priority') as HTMLSelectElement).value = task ? task.priority : 'medium';

    const now = new Date();
    const tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    (document.getElementById('task-start') as HTMLInputElement).value = task ? formatDateForInput(task.start_date) : toLocalInputValue(now);
    (document.getElementById('task-due') as HTMLInputElement).value = task ? formatDateForInput(task.due_date) : toLocalInputValue(tmr);

    const startInput = document.getElementById('task-start') as HTMLInputElement;
    const dueInput  = document.getElementById('task-due')   as HTMLInputElement;

    // Clone checkboxes to prevent accumulating duplicate event listeners
    const useNowCb = document.getElementById('use-current-date') as HTMLInputElement;
    const use24hCb = document.getElementById('use-24h-due')      as HTMLInputElement;
    useNowCb.checked = false;
    use24hCb.checked = false;

    const newUseNow = useNowCb.cloneNode(true) as HTMLInputElement;
    useNowCb.parentNode?.replaceChild(newUseNow, useNowCb);
    newUseNow.addEventListener('change', () => {
        if (newUseNow.checked) startInput.value = toLocalInputValue(new Date());
    });

    const newUse24h = use24hCb.cloneNode(true) as HTMLInputElement;
    use24hCb.parentNode?.replaceChild(newUse24h, use24hCb);
    newUse24h.addEventListener('change', () => {
        if (newUse24h.checked) {
            const base = startInput.value ? new Date(startInput.value) : new Date();
            dueInput.value = toLocalInputValue(new Date(base.getTime() + 24 * 60 * 60 * 1000));
        }
    });

    if (!modal || !backdrop || !content) return;
    modal.classList.remove('pointer-events-none');

    gsap.to(modal,   { opacity: 1, duration: 0.3 });
    gsap.to(backdrop, { opacity: 1, duration: 0.4 });
    gsap.to(content,  { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
    gsap.to('#kanban-board', { opacity: 0.3, filter: 'blur(4px)', duration: 0.4 });
}

/** Animates the task modal closed and re-enables the board. */
export function closeModal() {
    const modal   = document.getElementById('focus-modal');
    const content = document.getElementById('task-form');
    if (!modal || !content) return;

    gsap.to('#kanban-board', { opacity: 1, filter: 'blur(0px)', duration: 0.4 });
    gsap.to(content, { y: 20, scale: 0.95, opacity: 0, duration: 0.3 });
    gsap.to(modal,   { opacity: 0, duration: 0.4, delay: 0.1, onComplete: () => modal.classList.add('pointer-events-none') });
}

/** Tracks the task currently open in the read-only view modal. */
export let currentViewingTask: Task | null = null;

/** Opens the task detail modal and populates it with the given task's data. */
export function openViewModal(task: Task) {
    currentViewingTask = task;

    const modal    = document.getElementById('view-modal');
    const backdrop = document.getElementById('view-backdrop');
    const content  = document.getElementById('view-content');

    document.getElementById('view-title')!.innerText    = task.title;
    document.getElementById('view-status')!.innerText   = task.status.replace('_', ' ');
    document.getElementById('view-priority')!.innerText = task.priority;
    document.getElementById('view-start')!.innerText    = task.start_date ? new Date(task.start_date).toLocaleString() : '--';
    document.getElementById('view-due')!.innerText      = task.due_date   ? new Date(task.due_date).toLocaleString()   : '--';
    document.getElementById('view-desc')!.innerText     = task.description || 'No description provided.';

    if (!modal || !backdrop || !content) return;
    modal.classList.remove('pointer-events-none');

    gsap.to(modal,   { opacity: 1, duration: 0.3 });
    gsap.to(backdrop, { opacity: 1, duration: 0.4 });
    gsap.to(content,  { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
    gsap.to('#kanban-board', { opacity: 0.3, filter: 'blur(4px)', duration: 0.4 });
}

/** Animates the task detail modal closed and clears the tracked task reference. */
export function closeViewModal() {
    currentViewingTask = null;

    const modal   = document.getElementById('view-modal');
    const content = document.getElementById('view-content');
    if (!modal || !content) return;

    gsap.to('#kanban-board', { opacity: 1, filter: 'blur(0px)', duration: 0.4 });
    gsap.to(content, { y: 20, scale: 0.95, opacity: 0, duration: 0.3 });
    gsap.to(modal,   { opacity: 0, duration: 0.4, delay: 0.1, onComplete: () => modal.classList.add('pointer-events-none') });
}

/** Opens the profile edit modal, blurring the dashboard behind it. */
export function openProfileModal() {
    const modal    = document.getElementById('profile-modal');
    const backdrop = document.getElementById('profile-backdrop');
    const form     = document.getElementById('profile-form');

    document.getElementById('user-menu')?.classList.add('hidden');
    if (!modal || !backdrop || !form) return;

    modal.classList.remove('pointer-events-none');
    gsap.to(modal,   { opacity: 1, duration: 0.3 });
    gsap.to(backdrop, { opacity: 1, duration: 0.4 });
    gsap.to(form,    { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
    gsap.to('#kanban-board, aside, header', { opacity: 0.3, filter: 'blur(4px)', duration: 0.4 });
}

/** Animates the profile modal closed and restores the dashboard. */
export function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    const form  = document.getElementById('profile-form');
    if (!modal || !form) return;

    gsap.to('#kanban-board, aside, header', { opacity: 1, filter: 'blur(0px)', duration: 0.4 });
    gsap.to(form,  { y: 20, opacity: 0, duration: 0.3 });
    gsap.to(modal, { opacity: 0, duration: 0.4, delay: 0.1, onComplete: () => modal.classList.add('pointer-events-none') });
}
