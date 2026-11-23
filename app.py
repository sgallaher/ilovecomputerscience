from flask import Flask, render_template, request, jsonify
from pathlib import Path
import csv
import os
import tempfile

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
SCORES_FILE = BASE_DIR / "scores.txt"
TARGET_PHRASE = "I love Computer Science"
MAX_NAME_LENGTH = 24


def read_scores():
    '''Read saved scores. Each line contains a name and a time in seconds.'''    
    scores = []

    if not SCORES_FILE.exists():
        return scores

    with SCORES_FILE.open("r", newline="", encoding="utf-8") as file:
        reader = csv.reader(file)
        for row in reader:
            if len(row) != 2:
                continue
            try:
                name = row[0].strip()
                seconds = float(row[1])
                if name and 0 < seconds < 3600:
                    scores.append({"name": name, "time": seconds})
            except (ValueError, TypeError):
                continue

    return sorted(scores, key=lambda score: score["time"])


def save_scores(scores):
    '''Replace the file safely rather than leaving a partly-written file.'''
    SCORES_FILE.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix="scores_", suffix=".tmp", dir=SCORES_FILE.parent, text=True
    )
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            for score in scores:
                writer.writerow([score["name"], f'{score["time"]:.3f}'])
        os.replace(temporary_name, SCORES_FILE)
    finally:
        if os.path.exists(temporary_name):
            os.remove(temporary_name)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/scores")
def get_scores():
    scores = read_scores()
    return jsonify({"scores": scores[:10]})


@app.post("/api/scores")
def add_score():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    phrase = data.get("phrase")
    elapsed = data.get("time")

    if phrase != TARGET_PHRASE:
        return jsonify({"error": "The challenge phrase was not correct."}), 400

    if not name or len(name) > MAX_NAME_LENGTH:
        return jsonify({"error": f"Please enter a name of 1–{MAX_NAME_LENGTH} characters."}), 400

    # The browser measures the time, but the server still validates its range.
    try:
        elapsed = float(elapsed)
    except (TypeError, ValueError):
        return jsonify({"error": "The submitted time was invalid."}), 400

    if not 0.05 <= elapsed <= 3600:
        return jsonify({"error": "The submitted time was outside the accepted range."}), 400

    scores = read_scores()
    previous_best = scores[0]["time"] if scores else None

    new_score = {"name": name, "time": elapsed}
    scores.append(new_score)
    scores.sort(key=lambda score: score["time"])
    save_scores(scores)

    # A new high score means a strictly faster time than the previous best.
    is_record = previous_best is None or elapsed < previous_best
    position = next(
        (index + 1 for index, score in enumerate(scores)
         if score["name"] == name and score["time"] == elapsed),
        None
    )

    return jsonify({
        "scores": scores[:10],
        "is_record": is_record,
        "position": position,
        "message": "New high score!" if is_record else "Your time has been added."
    })


if __name__ == "__main__":
    # 0.0.0.0 makes the app accessible through a forwarded Codespaces port.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
