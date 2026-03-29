import os
from flask import Flask
from app.extensions import db, compress, socketio, login_manager, oauth
from app.routes import main_bp
from app.routes_auth import auth_bp
from app.config import settings
from app.models import User
import app.sockets  # noqa: F401 — registers WebSocket event handlers

if settings.OAUTH_ALLOW_INSECURE:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    os.environ['AUTHLIB_INSECURE_TRANSPORT'] = '1'


def create_app() -> Flask:
    """Application factory. Initialises all extensions, registers blueprints,
    and creates the database tables on first run."""
    application = Flask(__name__)
    application.config.from_mapping(settings.model_dump())

    db.init_app(application)
    compress.init_app(application)
    socketio.init_app(application)
    login_manager.init_app(application)
    oauth.init_app(application)

    if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
        oauth.register(
            name              = 'github',
            client_id         = settings.GITHUB_CLIENT_ID,
            client_secret     = settings.GITHUB_CLIENT_SECRET,
            access_token_url  = 'https://github.com/login/oauth/access_token',
            authorize_url     = 'https://github.com/login/oauth/authorize',
            api_base_url      = 'https://api.github.com/',
            client_kwargs     = {'scope': 'user:email'},
        )

    @login_manager.user_loader
    def load_user(user_id: str):
        return User.query.get(int(user_id))

    application.register_blueprint(main_bp)
    application.register_blueprint(auth_bp)

    if settings.RUN_DB_CREATE_ALL:
        with application.app_context():
            db.create_all()

    return application


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=settings.DEBUG)
