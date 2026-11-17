"""
app.py  -  Flask server.
  * serves the HTML/CSS/JS files from the docs/ folder   (http://127.0.0.1:5000)
  * POST /api/sort   -> returns the result of bubble_sort.py as JSON
  * GET  /api/health -> tells whether the server is running

Run:  python app.py
"""
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from bubble_sort import bubble_sort_trace, validate_array

BASE_DIR = Path(__file__).resolve().parent
DOCS_DIR = BASE_DIR / "docs"          # frontend lives here (GitHub Pages can host this same folder)

app = Flask(__name__, static_folder=str(DOCS_DIR), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(DOCS_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify(status="ok", engine="python-flask")


@app.post("/api/sort")
def sort_api():
    payload = request.get_json(silent=True) or {}
    try:
        values = validate_array(payload.get("array"))
    except ValueError as err:
        return jsonify(error=str(err)), 400
    return jsonify(bubble_sort_trace(values))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
