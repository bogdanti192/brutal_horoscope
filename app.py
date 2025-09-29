import o
import sqlite3
from datetime import datetime, date
from flask import Flask, g, render_template, request, redirect, url_for, session, jsonify, abort

# Config
DATABASE = 'data.db'
SECRET_KEY = os.environ.get('SECRET_KEY', 'change-me-in-prod')

app = Flask(__name__)
app.config.from_mapping(SECRET_KEY=SECRET_KEY, DATABASE=DATABASE)

# --- DB helpers ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.executescript("""
    CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sign TEXT,
        tone TEXT,
        sarcasm INTEGER,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS age_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        birthdate TEXT,
        allowed INTEGER,
        created_at TEXT
    );
    """)
    db.commit()

# Инициализируем базу данных сразу при старте, в контексте приложения
with app.app_context():
    init_db()



@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# --- Utilities ---
SIGNS = [
  ['Овен','♈'],['Телец','♉'],['Близнецы','♊'],['Рак','♋'],['Лев','♌'],['Дева','♍'],
  ['Весы','♎'],['Скорпион','♏'],['Стрелец','♐'],['Козерог','♑'],['Водолей','♒'],['Рыбы','♓']
]

# Simple generator templates (kept safe: no hate speech / no sexual content)
TEMPLATES = {
    'light': [
        "{sign} — сегодня уют превыше всего. Сделай вид, что у тебя план.",
        "{sign} — кофе поможет. А если нет — съешь печенье и притворись мудрецом."
    ],
    'normal': [
        "{sign} — у тебя получится, если не мешать самому себе. То есть сделай паузу.",
        "{sign} — несложно быть лучше вчера — немного усилий и сарказм выключается."
    ],
    'hard': [
        "{sign} — твоя энергия впечатляет. Немного потуши огонь, чтобы не поджечь мебель.",
        "{sign} — если бы импульсивность платили, ты бы жил в другой стране."
    ]
}

PROFANITY = ["badword1","badword2"]  # placeholder — можно расширить

def sanitize(text):
    """Простая фильтрация запрещённых слов (заполните PROFANITY реальными словами, если нужно)."""
    for w in PROFANITY:
        text = text.replace(w, "***")
    return text

def gen_horoscope(sign, tone):
    from random import choice, randint
    base = choice(TEMPLATES.get(tone, TEMPLATES['normal']))
    text = base.format(sign=sign)
    # Add small twist
    twists = [
        "Сегодня избегай обсуждений политики.", 
        "Улыбнись незнакомцу — и сломай рутину.",
        "Небольшой риск сулит большую историю для рассказа."
    ]
    # don't always add twist
    if randint(0, 10) > 6:
        text += " " + choice(twists)
    sarcasm = randint(30, 95) if tone == 'hard' else randint(10, 70) if tone == 'normal' else randint(0,45)
    return sanitize(text), sarcasm

def calculate_age(birthdate: date, today: date):
    years = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        years -= 1
    return years

# --- Routes ---
@app.before_request
def enforce_age_gate():
    # allow static and age-check paths without verification
    allowed_paths = ['/age-check', '/verify-age', '/static/', '/favicon.ico', '/api/verify-age']
    if request.path.startswith('/static/') or any(request.path.startswith(p) for p in allowed_paths):
        return
    # If not verified, redirect to age-check page
    if not session.get('age_verified'):
        return redirect(url_for('age_check'))

@app.route('/')
def index():
    return render_template('index.html', SIGNS=SIGNS)

@app.route('/age-check', methods=['GET'])
def age_check():
    return render_template('age_check.html')

@app.route('/verify-age', methods=['POST'])
def verify_age():
    # accept form or JSON
    birthdate_str = request.form.get('birthdate') or request.json.get('birthdate') if request.is_json else None
    if not birthdate_str:
        return {"ok": False, "error": "birthdate required"}, 400
    try:
        bd = datetime.strptime(birthdate_str, "%Y-%m-%d").date()
    except Exception:
        return {"ok": False, "error": "invalid date format, use YYYY-MM-DD"}, 400

    age = calculate_age(bd, date.today())
    allowed = 1 if age > 10 else 0

    db = get_db()
    db.execute("INSERT INTO age_checks (birthdate, allowed, created_at) VALUES (?, ?, ?)",
               (bd.isoformat(), allowed, datetime.utcnow().isoformat()))
    db.commit()

    if allowed:
        session['age_verified'] = True
        session['birthdate'] = bd.isoformat()
        return jsonify({"ok": True, "allowed": True})
    else:
        session['age_verified'] = False
        return jsonify({"ok": True, "allowed": False, "reason": "Вход разрешён только пользователям старше 10 лет."}), 200

@app.route('/api/generate', methods=['POST'])
def api_generate():
    if not session.get('age_verified'):
        return jsonify({"ok": False, "error": "age gate"}), 403
    data = request.get_json() or {}
    sign = data.get('sign')
    tone = data.get('tone', 'normal')
    if not sign:
        return jsonify({"ok": False, "error": "sign required"}), 400
    # safety: ensure sign is one of known
    allowed_signs = [s[0] for s in SIGNS]
    if sign not in allowed_signs:
        return jsonify({"ok": False, "error": "invalid sign"}), 400

    text, sarcasm = gen_horoscope(sign, tone)
    # save request
    db = get_db()
    db.execute("INSERT INTO requests (sign, tone, sarcasm, created_at) VALUES (?, ?, ?, ?)",
               (sign, tone, sarcasm, datetime.utcnow().isoformat()))
    db.commit()
    return jsonify({"ok": True, "sign": sign, "text": text, "sarcasm": sarcasm, "source": "server-generated"})

@app.route('/admin/stats')
def admin_stats():
    # very simple stats endpoint (no auth) — for demo only
    db = get_db()
    rows = db.execute("SELECT sign, tone, COUNT(*) as cnt FROM requests GROUP BY sign, tone ORDER BY cnt DESC").fetchall()
    data = [dict(r) for r in rows]
    return jsonify({"ok": True, "stats": data})

if __name__ == '__main__':
    app.run(debug=True)
