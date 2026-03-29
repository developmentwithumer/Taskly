import gsap from 'gsap';
import { currentViewingTask, closeViewModal } from './ui';
import { saveTask } from './api';

/** Pomodoro session length in seconds (25 minutes). */
const FOCUS_DURATION = 25 * 60;

/** SVG progress ring circumference for a circle of radius 48. */
const CIRCUMFERENCE = 2 * Math.PI * 48;

let timerInterval: ReturnType<typeof setInterval> | null = null;
let timeRemaining = FOCUS_DURATION;
let isRunning = false;
let _renderBoard: (() => void) | null = null;

/**
 * Bootstraps the Zen Focus (Pomodoro) timer.
 * Accepts `renderBoardCb` to keep the Kanban board in sync when
 * a session completes and a task status changes to 'done'.
 */
export function initFocusTimer(renderBoardCb: () => void) {
    _renderBoard = renderBoardCb;

    document.getElementById('start-focus-btn')?.addEventListener('click', () => {
        if (!currentViewingTask) return;

        // Ensure the task is marked in-progress before focusing
        if (currentViewingTask.status !== 'in_progress') {
            currentViewingTask.status = 'in_progress';
            saveTask({ status: 'in_progress' }, currentViewingTask.id);
        }

        openFocusModal(currentViewingTask.title);
        closeViewModal();
    });

    document.getElementById('exit-focus-btn')?.addEventListener('click', stopAndCloseFocus);

    document.getElementById('complete-focus-btn')?.addEventListener('click', () => {
        if (currentViewingTask) {
            currentViewingTask.status = 'done';
            saveTask({ status: 'done' }, currentViewingTask.id);
            _renderBoard?.();
        }
        stopAndCloseFocus();
    });

    document.getElementById('toggle-timer-btn')?.addEventListener('click', toggleTimer);
}

/** Initialises and animates the focus overlay open for the given task title. */
function openFocusModal(title: string) {
    const modal   = document.getElementById('zen-focus-modal');
    const content = document.getElementById('zen-focus-content');

    document.getElementById('focus-task-title')!.innerText = title;
    document.getElementById('icon-play')?.classList.remove('hidden');
    document.getElementById('icon-pause')?.classList.add('hidden');

    timeRemaining = FOCUS_DURATION;
    isRunning = false;
    updateTimerDisplay();

    if (!modal || !content) return;
    modal.classList.remove('pointer-events-none');
    gsap.to(modal,   { opacity: 1, duration: 0.7, ease: 'power2.inOut' });
    gsap.to(content, { y: 0, duration: 0.8, delay: 0.1, ease: 'back.out(1.5)' });
}

/** Stops the timer and animates the focus overlay closed. */
function stopAndCloseFocus() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = false;

    const modal   = document.getElementById('zen-focus-modal');
    const content = document.getElementById('zen-focus-content');
    if (!modal) return;

    gsap.to(content, { y: 30, duration: 0.5, ease: 'power2.in' });
    gsap.to(modal,   { opacity: 0, duration: 0.6, delay: 0.1, ease: 'power2.inOut', onComplete: () => modal.classList.add('pointer-events-none') });
}

/** Toggles the Pomodoro countdown between running and paused states. */
function toggleTimer() {
    const playIcon  = document.getElementById('icon-play');
    const pauseIcon = document.getElementById('icon-pause');

    if (isRunning) {
        if (timerInterval) clearInterval(timerInterval);
        isRunning = false;
        playIcon?.classList.remove('hidden');
        pauseIcon?.classList.add('hidden');
    } else {
        isRunning = true;
        playIcon?.classList.add('hidden');
        pauseIcon?.classList.remove('hidden');

        timerInterval = setInterval(() => {
            if (timeRemaining > 0) {
                timeRemaining--;
                updateTimerDisplay();
            } else {
                // Session complete — mark task done and close
                if (timerInterval) clearInterval(timerInterval);
                isRunning = false;

                const display = document.getElementById('focus-time-display');
                if (display) gsap.fromTo(display, { scale: 1.1, color: '#4ade80' }, { scale: 1, color: 'white', duration: 1 });

                playIcon?.classList.remove('hidden');
                pauseIcon?.classList.add('hidden');

                if (currentViewingTask) {
                    currentViewingTask.status = 'done';
                    saveTask({ status: 'done' }, currentViewingTask.id);
                    _renderBoard?.();
                }

                setTimeout(stopAndCloseFocus, 1500);
            }
        }, 1000);
    }
}

/** Updates the visible timer display and the SVG progress ring offset. */
function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const s = (timeRemaining % 60).toString().padStart(2, '0');
    document.getElementById('focus-time-display')!.innerText = `${m}:${s}`;

    const ring = document.getElementById('focus-progress-ring');
    if (ring) {
        const offset = CIRCUMFERENCE - (timeRemaining / FOCUS_DURATION) * CIRCUMFERENCE;
        ring.style.strokeDashoffset = offset.toString();
    }
}
