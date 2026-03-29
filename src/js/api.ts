import type { Task } from './types';
import { Toast } from './toast';

/** Base URL for all task REST API calls. */
export const API_URL = '/api/tasks';

/** In-memory task list — kept in sync with the server via WebSocket events. */
export let tasks: Task[] = [];

/** Replaces the in-memory task array. Used by WebSocket handlers after mutations. */
export function updateTasksArray(newTasks: Task[]) {
    tasks = newTasks;
}

/** Fetches all tasks for the current user and re-renders the board. */
export async function fetchTasks(renderCallback: () => void) {
    try {
        const res = await fetch(API_URL);
        tasks = await res.json();
        renderCallback();
    } catch {
        Toast.show('Error fetching tasks.');
    }
}

/**
 * Creates or updates a task via REST.
 * Passing an `id` triggers a PATCH; omitting it triggers a POST.
 */
export async function saveTask(payload: Partial<Task>, id?: number) {
    const isUpdate = !!id;
    const url = isUpdate ? `${API_URL}/${id}` : API_URL;
    const method = isUpdate ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save');
        Toast.show(isUpdate ? 'Task updated.' : 'Task created.');
    } catch {
        Toast.show('Failed to save task.');
    }
}

/**
 * Pending deletions keyed by task ID.
 * Gives the undo system a 5-second window before the DELETE request fires.
 */
export let pendingDeletions: Record<number, { timeout: ReturnType<typeof setTimeout>; task: Task }> = {};

/**
 * Optimistically removes a task from the UI and schedules a permanent DELETE.
 * The operation can be cancelled within 5 seconds via the undo toast.
 */
export async function deleteTask(id: number, renderCallback: () => void) {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    tasks = tasks.filter(t => t.id !== id);
    renderCallback();
    Toast.show('Task deleted.', { taskId: id });

    pendingDeletions[id] = {
        task: taskToDelete,
        timeout: setTimeout(async () => {
            try {
                await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                delete pendingDeletions[id];
            } catch {
                Toast.show('Failed to permanently delete task.');
            }
        }, 5000),
    };
}
