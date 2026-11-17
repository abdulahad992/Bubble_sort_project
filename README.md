# Bubble Sort: Swaps & Comparisons (Flask + Animation)

Sorts an array with Bubble Sort and counts the **comparisons** and **swaps**.
Python logic -> Flask API -> HTML animation (the smart boy).

## Folder structure
```
bubble-sort-project/
├── app.py                 Flask server (API + serves the frontend)
├── bubble_sort.py         All the Bubble Sort logic (Python)
├── test_bubble_sort.py    Tests
├── requirements.txt
└── docs/                  Frontend (GitHub Pages hosts this folder)
    ├── index.html         UI + the boy's SVG animation
    ├── css/style.css
    ├── js/app.js          Animation + Flask API call
    ├── js/sorter.js       JS copy of the Python logic (fallback when Flask is not running)
    └── data/samples.json  Preset arrays
```

## Run locally
```bash
python -m venv venv
venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000 in the browser.

Python logic only: `python bubble_sort.py 5 3 8 1 9` (save JSON: add `--save output/result.json`)
Tests: `python test_bubble_sort.py`

## API
`POST /api/sort` with body `{"array": [5, 1, 4, 2, 8]}` returns `sorted`, `comparisons`, `swaps`, `rounds`,
`saved_comparisons` and the list of every `steps`. `GET /api/health` returns the server status.

## What the smart boy does
- Wears a graduation cap and shows a thought bubble with what he is thinking
- Stops early when a round has 0 swaps, and tells you how many comparisons he saved
- Your own numbers (2 to 10) or preset arrays, a step log and a final result summary

## Free hosting on GitHub Pages
1. Create a new public repository on GitHub and push this folder:
   ```bash
   git init && git add . && git commit -m "Bubble sort project"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. Repo > **Settings > Pages** > Source: *Deploy from a branch* > Branch: `main`, Folder: `/docs` > Save.
3. After 1-2 minutes the site is at `https://<username>.github.io/<repo>/`

**Note:** GitHub Pages only hosts static files, so Python/Flask cannot run there. On Pages the page uses
`sorter.js` (identical logic) and shows "Browser mode". To run Flask online for free, use Render or
PythonAnywhere (Render: build `pip install -r requirements.txt`, start `gunicorn app:app`).
