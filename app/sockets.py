from flask_socketio import join_room
from flask_login import current_user
from app.extensions import socketio


@socketio.on('connect')
def handle_connect():
    """Joins the authenticated user to their private WebSocket room.
    Unauthenticated connection attempts are rejected."""
    if not current_user.is_authenticated:
        return False
    join_room(str(current_user.id))
