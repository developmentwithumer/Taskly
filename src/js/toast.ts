import gsap from 'gsap';
import { API_URL, pendingDeletions, tasks, updateTasksArray } from './api';

/**
 * Renders a dismissible toast notification at the bottom-right of the screen.
 * When `taskId` is provided, an "Undo" button is included that cancels the
 * pending deletion for that task.
 */
export const Toast = {
    show(message: string, options: { taskId?: number } = {}) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className =
            'flex items-center gap-4 px-6 py-4 bg-slate-800/90 border border-slate-700/50 ' +
            'backdrop-blur-md rounded-2xl shadow-2xl shadow-cyan-900/20 text-sm font-bold ' +
            'opacity-0 translate-y-4 pointer-events-auto';

        toast.innerHTML = `<span>${message}</span>${
            options.taskId
                ? `<button onclick="window.undoDelete(${options.taskId})" class="ml-auto text-cyan-400 hover:text-cyan-300 hover:underline">Undo</button>`
                : ''
        }`;

        container.appendChild(toast);
        gsap.to(toast, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });

        setTimeout(() => {
            gsap.to(toast, { y: -10, opacity: 0, duration: 0.3, onComplete: () => toast.remove() });
        }, 5000);
    },
};

/**
 * Registers `window.undoDelete` so that toast "Undo" buttons can cancel
 * a pending task deletion and restore the task locally without a server round-trip.
 */
export function attachUndoHandler(renderCallback: () => void) {
    (window as any).undoDelete = (taskId: number) => {
        const pending = pendingDeletions[taskId];
        if (!pending) return;

        clearTimeout(pending.timeout);
        delete pendingDeletions[taskId];
        updateTasksArray([...tasks, pending.task]);
        renderCallback();
    };
}
