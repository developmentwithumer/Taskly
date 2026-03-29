/**
 * Core data types shared across all frontend modules.
 * Mirrors the Task model returned by the REST API.
 */

export interface Task {
    id: number;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    order_index: number;
    start_date: string | null;
    due_date: string | null;
    created_at: string;
}
