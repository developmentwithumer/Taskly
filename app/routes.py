from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from datetime import datetime, timezone
from flask_login import login_required, current_user
from app.extensions import db, socketio
from app.models import Task

main_bp = Blueprint('main', __name__)


def parse_dt(dt_str: str | None) -> datetime | None:
    """Parses an ISO 8601 datetime string into a datetime object.
    Handles both '+00:00' and 'Z' suffix formats safely."""
    if not dt_str:
        return None
    if dt_str.endswith('Z'):
        dt_str = dt_str[:-1] + '+00:00'
    return datetime.fromisoformat(dt_str)


@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')


@main_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@main_bp.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    """Returns all tasks for the authenticated user, ordered by order_index."""
    tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.order_index).all()
    return jsonify([t.to_dict() for t in tasks])


@main_bp.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    """Creates a new task and broadcasts the event to the user's WebSocket room."""
    data     = request.json
    new_task = Task(
        user_id     = current_user.id,
        title       = data.get('title', 'Untitled Task'),
        description = data.get('description', ''),
        status      = data.get('status', 'todo'),
        priority    = data.get('priority', 'medium'),
        order_index = data.get('order_index', 0),
        start_date  = parse_dt(data.get('start_date')),
        due_date    = parse_dt(data.get('due_date')),
    )
    db.session.add(new_task)
    db.session.commit()
    socketio.emit('task_created', new_task.to_dict(), to=str(current_user.id))
    return jsonify(new_task.to_dict()), 201


@main_bp.route('/api/tasks/<int:task_id>', methods=['PATCH'])
@login_required
def update_task(task_id):
    """Partially updates a task and broadcasts the change to the user's WebSocket room."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    data = request.json

    if 'title'       in data: task.title       = data['title']
    if 'description' in data: task.description = data['description']
    if 'status'      in data: task.status      = data['status']
    if 'priority'    in data: task.priority    = data['priority']
    if 'order_index' in data: task.order_index = data['order_index']
    if data.get('start_date'): task.start_date = parse_dt(data['start_date'])
    if data.get('due_date'):   task.due_date   = parse_dt(data['due_date'])

    db.session.commit()
    socketio.emit('task_updated', task.to_dict(), to=str(current_user.id))
    return jsonify(task.to_dict())


@main_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    """Permanently deletes a task and notifies connected clients."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    socketio.emit('task_deleted', {'id': task_id}, to=str(current_user.id))
    return jsonify({'message': 'Task deleted', 'id': task_id})


@main_bp.route('/api/profile', methods=['PATCH'])
@login_required
def update_profile():
    """Updates the authenticated user's display name and/or avatar URL."""
    data = request.json
    if 'name'       in data: current_user.name       = data['name']
    if 'avatar_url' in data: current_user.avatar_url = data['avatar_url']
    db.session.commit()
    return jsonify({'message': 'Profile updated'})