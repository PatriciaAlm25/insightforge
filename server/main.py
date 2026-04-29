import os
import io
import json
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

SUPA_URL = os.environ.get("VITE_SUPABASE_URL", "https://eunnztvbitlaflrpyjqo.supabase.co")
SUPA_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bm56dHZiaXRsYWZscnB5anFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTkyODMsImV4cCI6MjA5MzAzNTI4M30.XBTylmeX5Qva1WDpMiifLgdrAL3q9IyQOIVz0btbwIo")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "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")

HDR = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"}
HDR_READ = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}

ai = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_KEY)
MODEL = "google/gemini-2.0-flash-lite-001"

def supa_get(table, params=""):
    url = f"{SUPA_URL}/rest/v1/{table}?{params}"
    r = requests.get(url, headers=HDR_READ)
    if r.status_code != 200:
        print(f"Supabase GET Error [{r.status_code}] on {table}: {r.text}")
        return []
    return r.json()

def supa_post(table, data):
    url = f"{SUPA_URL}/rest/v1/{table}"
    r = requests.post(url, json=data, headers=HDR)
    if r.status_code not in [200, 201]:
        print(f"Supabase POST Error [{r.status_code}] on {table}: {r.text}")
    return r

def ai_call(prompt, json_mode=False):
    kwargs = {"model": MODEL, "messages": [{"role": "user", "content": prompt}]}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    r = ai.chat.completions.create(**kwargs)
    return r.choices[0].message.content

# ── Upload one or more CSVs ──────────────────────────────────────────────────
@app.post("/upload-csv")
async def upload_csv(files: List[UploadFile] = File(...), projectId: str = Form(...)):
    results = []
    for f in files:
        raw = await f.read()
        try:
            df = pd.read_csv(io.StringIO(raw.decode("utf-8")))
        except Exception as e:
            results.append({"file": f.filename, "error": str(e)})
            continue

        rows = df.to_dict("records")
        cols = list(df.columns)

        # 1. AI Deep Analysis for Update Reconcillation
        analysis_prompt = f"""
You are InsightForge AI. A user is updating their project data with file "{f.filename}".
Columns: {cols}
Latest Rows: {json.dumps(rows[:15])}

Respond with ONLY valid JSON:
{{
  "data_type": "label",
  "summary": "overall status update",
  "key_metrics": {{"metric": "value"}},
  "risks": ["risk 1"],
  "observation": "critical observation",
  "recommendations": ["action"],
  "employees": [
     {{"name": "name", "tasks": number, "completed": number, "score": 0-100}}
  ]
}}
"""
        try:
            ai_raw = ai_call(analysis_prompt, json_mode=True)
            ai_analysis = json.loads(ai_raw)
        except Exception as e:
            # FALLBACK: Basic extraction if AI fails (e.g. API 401)
            print(f"AI Analysis Failed: {str(e)}. Using basic extraction fallback.")
            
            # Simple heuristic for employee detection
            detected_employees = []
            emp_col = next((c for c in df.columns if any(k in c.lower() for k in ["employee", "name", "assignee", "member"])), None)
            if emp_col:
                for name in df[emp_col].unique():
                    emp_rows = df[df[emp_col] == name]
                    prog_col = next((c for c in df.columns if "progress" in c.lower() or "percent" in c.lower()), None)
                    progress = emp_rows[prog_col].mean() if prog_col and not emp_rows[prog_col].empty else 50.0
                    detected_employees.append({
                        "name": str(name),
                        "tasks": len(emp_rows),
                        "completed": 0, # Manual fallback simplified
                        "score": float(progress)
                    })

            ai_analysis = {
                "data_type": "Manual Data Update",
                "summary": f"AI service currently unavailable. Displaying raw metrics.",
                "key_metrics": {"Total Rows": len(df)},
                "risks": ["AI analysis service offline"],
                "observation": "Extracted metrics via fallback logic.",
                "recommendations": ["Update OpenRouter API Key in .env"],
                "employees": detected_employees
            }

        # 2. Store in Project_Data (We overwrite the entry for the same filename to keep the 'Current State' clean and avoid clutter)
        if SUPA_URL and SUPA_KEY:
            requests.delete(f"{SUPA_URL}/rest/v1/Project_Data?project_id=eq.{projectId}&file_name=eq.{f.filename}", headers=HDR)
            
            record = {
                "project_id": projectId,
                "file_name": f.filename,
                "data_type": ai_analysis.get("data_type", "Update"),
                "columns": cols,
                "rows": rows,
                "ai_analysis": ai_analysis,
            }
            supa_post("Project_Data", [record])

            # 3. Automatic Employee Performance Updates
            if ai_analysis.get("employees"):
                # We clear and update the dedicated table for this project
                requests.delete(f"{SUPA_URL}/rest/v1/Employee_Performance?project_id=eq.{projectId}", headers=HDR)
                perf_records = []
                for emp in ai_analysis["employees"]:
                    perf_records.append({
                        "project_id": projectId,
                        "employee_name": emp.get("name"),
                        "tasks_assigned": emp.get("tasks", 0),
                        "tasks_completed": emp.get("completed", 0),
                        "efficiency_score": emp.get("score", 0.0)
                    })
                supa_post("Employee_Performance", perf_records)

            # 4. Save Insights
            insight = {
                "project_id": projectId,
                "observation": ai_analysis.get("observation", ""),
                "hypothesis": ai_analysis.get("summary", ""),
                "recommendations": ai_analysis.get("recommendations", [])
            }
            supa_post("Project_Insights", [insight])
        
        results.append({"file": f.filename, "status": "Synced & Updated", "analysis": ai_analysis})

    return {"message": f"Successfully updated {len(files)} file(s)", "results": results}


# ── Get all uploaded data for a project ─────────────────────────────────────
@app.get("/project-data/{project_id}")
async def get_project_data(project_id: str):
    data = supa_get("Project_Data", f"project_id=eq.{project_id}&order=created_at.desc")
    return data


# ── Save Project Context ─────────────────────────────────────────────────────
class ProjectContextRequest(BaseModel):
    projectId: str
    description: str
    outcomes: str
    deadlines: str
    employeeCount: int

@app.post("/project-context")
async def save_project_context(req: ProjectContextRequest):
    requests.delete(f"{SUPA_URL}/rest/v1/Project_Context?project_id=eq.{req.projectId}", headers=HDR)
    supa_post("Project_Context", [{"project_id": req.projectId, "description": req.description, "outcomes": req.outcomes, "deadlines": req.deadlines, "employee_count": req.employeeCount}])
    return {"message": "Saved!"}

@app.get("/project-context/{project_id}")
async def get_project_context(project_id: str):
    d = supa_get("Project_Context", f"project_id=eq.{project_id}&limit=1")
    return d[0] if d else {}


# ── Future Risk Prediction ───────────────────────────────────────────────────
@app.get("/future-risks/{project_id}")
async def future_risks(project_id: str):
    ctx = supa_get("Project_Context", f"project_id=eq.{project_id}&limit=1")
    uploads = supa_get("Project_Data", f"project_id=eq.{project_id}&order=created_at.desc&limit=5")

    if not ctx and not uploads:
        return []

    data_summary = []
    for u in uploads:
        data_summary.append({"file": u.get("file_name"), "type": u.get("data_type"), "analysis": u.get("ai_analysis", {})})

    prompt = f"""
You are an AI Risk Predictor for project management.
Project Context: {ctx}
Uploaded data summaries: {data_summary}

Based on the context and data patterns, predict 3 specific future risks.
Respond ONLY as valid JSON:
{{
  "risks": [
    {{"risk": "specific risk description", "probability": "High/Medium/Low", "impact": "description of impact if it happens", "mitigation": "how to prevent it"}}
  ]
}}
"""
    try:
        raw = ai_call(prompt, json_mode=True)
        parsed = json.loads(raw)
        if isinstance(parsed, dict) and "risks" in parsed:
            return parsed["risks"]
        return []
    except Exception as e:
        return [{"risk": "Could not predict risks.", "probability": "Unknown", "impact": str(e), "mitigation": "Retry after uploading more data."}]


# ── Employee Performance (from uploaded CSVs) ────────────────────────────────
@app.get("/employee-performance/{project_id}")
async def employee_performance(project_id: str):
    uploads = supa_get("Project_Data", f"project_id=eq.{project_id}&order=created_at.desc")
    
    all_rows = []
    for u in uploads:
        rows = u.get("rows", [])
        cols = [c.lower() for c in u.get("columns", [])]
        # Robust check for employee-like columns (substring match)
        found_emp_col = False
        for c in cols:
            if any(k in c for k in ["employee", "name", "assignee", "member", "person", "staff"]):
                found_emp_col = True
                break
        
        if found_emp_col:
            all_rows.extend(rows)

    if not all_rows:
        return []

    prompt = f"""
From this project data extract or calculate employee performance metrics.
Data: {json.dumps(all_rows[:50])}

Respond ONLY as valid JSON:
{{
  "employees": [
    {{"employee_name": "name", "tasks_assigned": number, "tasks_completed": number, "efficiency_score": number}}
  ]
}}
"""
    try:
        raw = ai_call(prompt, json_mode=True)
        parsed = json.loads(raw)
        return parsed.get("employees", [])
    except:
        return []


# ── Chat with Memory ─────────────────────────────────────────────────────────
@app.get("/chat-history/{project_id}")
async def chat_history(project_id: str):
    return supa_get("Chat_History", f"project_id=eq.{project_id}&order=created_at.asc&limit=30")

class ChatRequest(BaseModel):
    message: str
    projectId: str
    context: list = []

@app.post("/chat")
async def chat(req: ChatRequest):
    # Save user message
    if SUPA_URL and SUPA_KEY:
        supa_post("Chat_History", [{"project_id": req.projectId, "role": "user", "content": req.message}])

    history = supa_get("Chat_History", f"project_id=eq.{req.projectId}&order=created_at.asc&limit=20")
    ctx = supa_get("Project_Context", f"project_id=eq.{req.projectId}&limit=1")
    uploads = supa_get("Project_Data", f"project_id=eq.{req.projectId}&order=created_at.desc&limit=5")

    data_context = []
    for u in uploads:
        data_context.append({
            "file": u.get("file_name"),
            "type": u.get("data_type"),
            "analysis": u.get("ai_analysis", {}),
            "recent_rows": u.get("rows", [])[:10]
        })

    # Fallback to provided context if uploads are empty
    final_data_context = data_context if data_context else req.context

    system_msg = f"""You are InsightForge AI, an intelligent project management assistant.
Project Context: {ctx}
Recent Project Data/Metrics: {json.dumps(final_data_context, indent=2)[:4000]}

Use past chat history and real data to give specific, insightful, and automated (not static) answers.
Analyze the data to identify trends, risks, and performance.
If asked about deadlines or delivery, reason from the actual task/progress data provided.
Be concise, direct, and helpful."""

    messages = [{"role": "system", "content": system_msg}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    
    # Ensure current message is in history for AI
    if not messages or messages[-1]["content"] != req.message:
        messages.append({"role": "user", "content": req.message})

    try:
        r = ai.chat.completions.create(model=MODEL, messages=messages)
        reply = r.choices[0].message.content
        
        # Save assistant message
        if SUPA_URL and SUPA_KEY:
            supa_post("Chat_History", [{"project_id": req.projectId, "role": "assistant", "content": reply}])
            
    except Exception as e:
        reply = f"Error: {str(e)}"

    return {"reply": reply}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
