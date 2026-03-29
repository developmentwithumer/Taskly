from flask import Blueprint, render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db, oauth
from app.models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handles email/password login. Redirects to the dashboard on success."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        email    = request.form.get('email')
        password = request.form.get('password')
        user     = User.query.filter_by(email=email).first()

        if user and user.password_hash and check_password_hash(user.password_hash, password): # type: ignore
            login_user(user)
            return redirect(url_for('main.dashboard'))

        flash('Invalid email or password.', 'error')

    return render_template('login.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Registers a new user with email/password. Redirects to the dashboard on success."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        email    = request.form.get('email')
        password = request.form.get('password')
        name     = request.form.get('name')

        if User.query.filter_by(email=email).first():
            flash('An account with that email already exists.', 'error')
            return redirect(url_for('auth.register'))

        user = User(
            email         = email,
            name          = name,
            password_hash = generate_password_hash(password, method='scrypt'),
        )
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for('main.dashboard'))

    return render_template('register.html')


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))


@auth_bp.route('/login/github')
def login_github():
    """Initiates the GitHub OAuth flow by redirecting to GitHub's authorise URL."""
    redirect_uri = url_for('auth.auth_github', _external=True)
    return oauth.github.authorize_redirect(redirect_uri)


@auth_bp.route('/auth/github')
def auth_github():
    """GitHub OAuth callback. Creates or links a user account then logs them in."""
    try:
        token   = oauth.github.authorize_access_token()
        profile = oauth.github.get('user', token=token).json()
        github_id = str(profile['id'])

        email = profile.get('email')
        if not email:
            emails = oauth.github.get('user/emails', token=token).json()
            email  = next((e['email'] for e in emails if e.get('primary')), None)
            if not email and emails:
                email = emails[0]['email']

        if not email:
            flash('Could not retrieve your email from GitHub.', 'error')
            return redirect(url_for('auth.login'))

    except Exception:
        flash('GitHub login failed. Please try again.', 'error')
        return redirect(url_for('auth.login'))

    user = User.query.filter_by(github_id=github_id).first()
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            user.github_id  = github_id
            user.avatar_url = profile.get('avatar_url')
        else:
            user = User(
                email      = email,
                name       = profile.get('name') or profile.get('login'),
                github_id  = github_id,
                avatar_url = profile.get('avatar_url'),
            )
            db.session.add(user)
        db.session.commit()

    login_user(user)
    return redirect(url_for('main.dashboard'))
