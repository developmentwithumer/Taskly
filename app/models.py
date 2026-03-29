from datetime import datetime
from app.extensions import db
from flask_login import UserMixin


class User(UserMixin, db.Model):
    """Registered user. Supports both password auth and GitHub OAuth."""

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=True)
    name          = db.Column(db.String(150), nullable=True)
    github_id     = db.Column(db.String(100), unique=True, nullable=True)
    avatar_url    = db.Column(db.String(500), nullable=True)
    tasks         = db.relationship('Task', backref='author', lazy=True)


class Task(db.Model):
    """A single task belonging to one user."""

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status      = db.Column(db.String(50), default='todo')
    priority    = db.Column(db.String(50), default='medium')
    order_index = db.Column(db.Integer, default=0)
    start_date  = db.Column(db.DateTime, nullable=True)
    due_date    = db.Column(db.DateTime, nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """Serialises the task to a JSON-safe dict, handling both datetime and string values."""

        def fmt(dt):
            if not dt:
                return None
            return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)

        return {
            'id':          self.id,
            'title':       self.title or 'Untitled',
            'description': self.description or '',
            'status':      self.status or 'todo',
            'priority':    self.priority or 'medium',
            'order_index': self.order_index or 0,
            'start_date':  fmt(self.start_date),
            'due_date':    fmt(self.due_date),
            'created_at':  fmt(self.created_at),
        }