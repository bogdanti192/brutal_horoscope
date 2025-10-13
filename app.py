import os
import sqlite3
from datetime import datetime, date
from flask import Flask, g, render_template, request, redirect, url_for, session, jsonify, abort

# Config
DATABASE = 'data.db'
SECRET_KEY = os.environ.get('SECRET_KEY', 'change-me-in-prod')

app = Flask(__name__)
app.config.from_mapping(SECRET_KEY=SECRET_KEY, DATABASE=DATABASE)


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


with app.app_context():
    init_db()



@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


SIGNS = [
  ['Aries','♈'],['Taurus','♉'],['Gemini','♊'],['Cancer','♋'],['Leo','♌'],['Vigro','♍'],
  ['Libra','♎'],['Scorpio','♏'],['Sagittarius','♐'],['Capricon','♑'],['Aquarius','♒'],['Pisces','♓']
]


TEMPLATES = {
    'light': [
        "{sign} — šodien komforts ir vissvarīgākais. Izliecies, ka tev ir plāns.",
        "{sign} — kafija palīdzēs. Un, ja nē, apēd cepumu un izliecies par gudrinieku."
    ],
    'normal': [
        "{sign} — tu to vari izdarīt, ja pats sev netraucēsi. Tas ir, paņem pārtraukumu.",
        "{sign} — nav grūti būt labākam nekā vakar – neliela piepūle, un sarkasms izslēdzas."
    ],
    'hard': [
        "{sign} — tava enerģija ir iespaidīga. Nodzēs nedaudz uguni, lai nepiedegtu mēbeles",
        "{sign} — ja impulsivitāte būtu sodāma, jūs dzīvotu citā valstī."
    ]
}

PROFANITY = ["badword1","badword2"]  # placeholder — можно расширить

def sanitize(text):
    for w in PROFANITY:
        text = text.replace(w, "***")
    return text

def gen_horoscope(sign, tone):
    from random import choice, randint
    base = choice(TEMPLATES.get(tone, TEMPLATES['normal']))
    text = base.format(sign=sign)
    
    twists = [
        "Šodien izvairieties no politikas apspriešanas.", 
        "Uzsmaidi svešiniekam un pārtrauc rutīnu.",
        "Neliels risks nozīmē lielisku stāstu."
    ]
    
    if randint(0, 10) > 6:
        text += " " + choice(twists)
    sarcasm = randint(30, 95) if tone == 'hard' else randint(10, 70) if tone == 'normal' else randint(0,45)
    return sanitize(text), sarcasm

def calculate_age(birthdate: date, today: date):
    years = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        years -= 1
    return years


@app.before_request
def enforce_age_gate():
    
    allowed_paths = ['/age-check', '/verify-age', '/static/', '/favicon.ico', '/api/verify-age']
    if request.path.startswith('/static/') or any(request.path.startswith(p) for p in allowed_paths):
        return
    
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
        return jsonify({"ok": True, "allowed": False, "reason": "Ieeja atļauta tikai lietotājiem, kuri ir vecāki par 10 gadiem."}), 200

@app.route('/api/generate', methods=['POST'])
def api_generate():
    if not session.get('age_verified'):
        return jsonify({"ok": False, "error": "age gate"}), 403
    data = request.get_json() or {}
    sign = data.get('sign')
    tone = data.get('tone', 'normal')
    if not sign:
        return jsonify({"ok": False, "error": "sign required"}), 400
    
    allowed_signs = [s[0] for s in SIGNS]
    if sign not in allowed_signs:
        return jsonify({"ok": False, "error": "invalid sign"}), 400

    text, sarcasm = gen_horoscope(sign, tone)
   
    db = get_db()
    db.execute("INSERT INTO requests (sign, tone, sarcasm, created_at) VALUES (?, ?, ?, ?)",
               (sign, tone, sarcasm, datetime.utcnow().isoformat()))
    db.commit()
    return jsonify({"ok": True, "sign": sign, "text": text, "sarcasm": sarcasm, "source": "server-generated"})

@app.route('/admin/stats')
def admin_stats():
   
    db = get_db()
    rows = db.execute("SELECT sign, tone, COUNT(*) as cnt FROM requests GROUP BY sign, tone ORDER BY cnt DESC").fetchall()
    data = [dict(r) for r in rows]
    return jsonify({"ok": True, "stats": data})

if __name__ == '__main__':
    app.run(debug=True)
