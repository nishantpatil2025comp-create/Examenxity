import os

import pandas as pd
from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, url_for
from scipy.stats import pearsonr
from supabase import Client, create_client

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "local-development-key-change-me")

SUPABASE_URL ="https://tmbkcqpsugtqksxqqziy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtYmtjcXBzdWd0cWtzeHFxeml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTcyNTUsImV4cCI6MjEwNzYzMzI1NX0.d0-QWhigu8S_3WsDfyyfWEf8ZRrQIMfb0n2D1kirTLc"
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TABLE_NAME = "survey_responses"
NUMERIC_COLUMNS = ["anxiety_score", "study_hours", "exam_score"]
FIELD_LABELS = {
    "anxiety_score": "Anxiety score",
    "study_hours": "Study hours",
    "exam_score": "Exam score",
}
GRADE_BRACKETS = ["A", "B", "C", "D", "F"]


def parse_number(form, field, label, minimum, maximum):
    raw_value = form.get(field, "").strip()
    if not raw_value:
        raise ValueError(f"{label} is required.")
    try:
        value = float(raw_value)
    except ValueError as exc:
        raise ValueError(f"{label} must be a number.") from exc
    if not minimum <= value <= maximum:
        raise ValueError(f"{label} must be between {minimum} and {maximum}.")
    return value


def fetch_responses():
    if supabase is None:
        raise RuntimeError("Supabase is not configured. Add SUPABASE_URL and SUPABASE_KEY to your .env file.")
    result = supabase.table(TABLE_NAME).select("*").order("created_at", desc=True).execute()
    return result.data or []


def build_statistics(rows):
    frame = pd.DataFrame(rows)
    for column in NUMERIC_COLUMNS:
        if column not in frame:
            frame[column] = pd.Series(dtype="float64")
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    summaries = {}
    for column, label in FIELD_LABELS.items():
        values = frame[column].dropna()
        summaries[column] = {
            "label": label,
            "mean": float(values.mean()) if not values.empty else None,
            "std": float(values.std()) if len(values) > 1 else None,
            "count": int(values.count()),
        }

    correlations = []
    for left_index, left in enumerate(NUMERIC_COLUMNS):
        for right in NUMERIC_COLUMNS[left_index + 1 :]:
            paired = frame[[left, right]].dropna()
            coefficient = p_value = None
            if len(paired) >= 2 and paired[left].nunique() > 1 and paired[right].nunique() > 1:
                coefficient, p_value = pearsonr(paired[left], paired[right])
                coefficient, p_value = float(coefficient), float(p_value)
            correlations.append({
                "left": FIELD_LABELS[left],
                "right": FIELD_LABELS[right],
                "coefficient": coefficient,
                "p_value": p_value,
                "count": len(paired),
            })

    display_rows = frame.where(pd.notna(frame), None).to_dict(orient="records")
    return summaries, correlations, display_rows


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        try:
            response = {
                "anxiety_score": int(parse_number(request.form, "anxiety_score", "Anxiety score", 1, 30)),
                "study_hours": parse_number(request.form, "study_hours", "Study hours", 0, 24),
                "exam_score": parse_number(request.form, "exam_score", "Exam score", 0, 100),
                "grade_bracket": request.form.get("grade_bracket", "").strip().upper(),
            }
            if response["grade_bracket"] not in GRADE_BRACKETS:
                raise ValueError("Choose a valid grade bracket.")
            if supabase is None:
                raise RuntimeError("Supabase is not configured. Add SUPABASE_URL and SUPABASE_KEY to your .env file.")
            supabase.table(TABLE_NAME).insert(response).execute()
            flash("Your response has been recorded. Thank you for taking part.", "success")
            return redirect(url_for("index"))
        except ValueError as error:
            flash(str(error), "danger")
        except Exception:
            app.logger.exception("Could not save survey response")
            flash("We could not save your response. Please try again later.", "danger")

    return render_template("index.html", grade_brackets=GRADE_BRACKETS)


@app.route("/dashboard")
def dashboard():
    rows = []
    summaries, correlations = {}, []
    error = None
    try:
        rows = fetch_responses()
        summaries, correlations, rows = build_statistics(rows)
    except Exception as exception:
        app.logger.exception("Could not load dashboard data")
        error = str(exception) if isinstance(exception, RuntimeError) else "Survey data could not be loaded. Check the Supabase connection and table."

    return render_template(
        "dashboard.html",
        rows=rows,
        summaries=summaries,
        correlations=correlations,
        error=error,
        total_responses=len(rows),
    )


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")