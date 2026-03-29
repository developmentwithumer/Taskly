from flask_sqlalchemy import SQLAlchemy
from flask_compress import Compress
from flask_socketio import SocketIO
from flask_login import LoginManager
from authlib.integrations.flask_client import OAuth

db            = SQLAlchemy()
compress      = Compress()
socketio      = SocketIO(cors_allowed_origins='*')
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
oauth         = OAuth()