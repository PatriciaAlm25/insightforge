import os

content = """import os
import io
import json
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from the parent directory
load_dotenv(dotenv_path="../.env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("VITE_SUPABASE_URL", "https://eunnztvbitlaflrpyjqo.supabase.co")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bm56dHZiaXRsYWZscnB5anFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTkyODMsImV4cCI6MjA5MzAzNTI4M30.XBTylmeX5Qva1WDpMiifLgdrAL3q9IyQOIVz0btbwIo")

supabase_headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
} if url and key else None

openrouter_key = os.environ.get("OPENROUTER_API_KEY", "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")
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=openrouter_key,
)

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), projectId: str = Form(...)):
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    metrics_data = []
    for index, row in df.iterrows():
        metrics_data.append({
            "project_id": projectId,
            "date": str(row.get("date", "")),
            "cost_metric": float(row.get("cost", 0) if pd.notnull(row.get("cost")) else 0),
            "delay_days": int(row.get("delay", 0) if pd.notnull(row.get("delay")) else 0),
            "billing_health": str(row.get("billing_health", "Safe"))
        })

    # Insert into Supabase Project_Metrics
    if url and key and metrics_data:
        try:
            r = requests.post(f"{url}/rest/v1/Project_Metrics", json=metrics_data, headers=supabase_headers)
            r.raise_for_status()
        except Exception as e:
            print(f"Supabase metrics insert error: {e}")

    # Ask OpenRouter for AI Insight
    prompt = f\"\"\"
    You are an AI assistant for a project management tool. Analyze the following project metrics data:
    {df.to_dict('records')}
    
    Identify root causes for anomalies (like cost spikes or delays) and provide recommendations.
    Output MUST be valid JSON with the exact following structure:
    {{
        "observation": "Describe the main anomalies or trends",
        "hypothesis": "What is the likely root cause?",
        "recommendations": ["Action item 1", "Action item 2"]
    }}
    \"\"\"
    
    ai_insight = None
    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-pro",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        ai_insight_raw = response.choices[0].message.content
        ai_insight = json.loads(ai_insight_raw)
        
        # Save to Supabase Project_Insights
        if url and key:
            insight_data = {
                "project_id": projectId,
                "observation": ai_insight.get("observation", ""),
                "hypothesis": ai_insight.get("hypothesis", ""),
                "recommendations": ai_insight.get("recommendations", [])
            }
            try:
                r = requests.post(f"{url}/rest/v1/Project_Insights", json=[insight_data], headers=supabase_headers)
                r.raise_for_status()
            except Exception as se:
                print(f"Supabase insight insert error: {se}")

    except Exception as e:
        print(f"AI Insight error: {e}")
        ai_insight = {
            "observation": "Failed to connect to AI.",
            "hypothesis": str(e),
            "recommendations": []
        }

    return {"message": "CSV processed successfully", "insight": ai_insight}

class ProjectContextRequest(BaseModel):
    projectId: str
    description: str
    outcomes: str
    deadlines: str
    employeeCount: int

@app.post("/project-context")
async def save_project_context(req: ProjectContextRequest):
    if not url or not key:
        return {"error": "Supabase not configured"}
    
    data = {
        "project_id": req.projectId,
        "description": req.description,
        "outcomes": req.outcomes,
        "deadlines": req.deadlines,
        "employee_count": req.employeeCount
    }
    
    # We use UPSERT by project_id but REST doesn't natively do UPSERT easily without ON CONFLICT.
    # We will just insert or delete existing then insert for simplicity
    try:
        requests.delete(f"{url}/rest/v1/Project_Context?project_id=eq.{req.projectId}", headers=supabase_headers)
        r = requests.post(f"{url}/rest/v1/Project_Context", json=[data], headers=supabase_headers)
        r.raise_for_status()
        return {"message": "Project context saved successfully!"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/project-context/{project_id}")
async def get_project_context(project_id: str):
    if not url or not key:
        return {}
    try:
        r = requests.get(f"{url}/rest/v1/Project_Context?project_id=eq.{project_id}", headers=supabase_headers)
        data = r.json()
        if data and len(data) > 0:
            return data[0]
        return {}
    except Exception as e:
        return {}

@app.get("/employee-performance/{project_id}")
async def get_employee_performance(project_id: str):
    if not url or not key:
        return []
    try:
        r = requests.get(f"{url}/rest/v1/Employee_Performance?project_id=eq.{project_id}", headers=supabase_headers)
        data = r.json()
        if len(data) == 0:
            # Seed mock data
            mock_data = [
                {"project_id": project_id, "employee_name": "Alice Chen", "tasks_assigned": 24, "tasks_completed": 22, "efficiency_score": 92.5},
                {"project_id": project_id, "employee_name": "Bob Smith", "tasks_assigned": 18, "tasks_completed": 12, "efficiency_score": 66.7},
                {"project_id": project_id, "employee_name": "Carol Davis", "tasks_assigned": 30, "tasks_completed": 29, "efficiency_score": 96.6},
                {"project_id": project_id, "employee_name": "David Kim", "tasks_assigned": 15, "tasks_completed": 14, "efficiency_score": 93.3}
            ]
            requests.post(f"{url}/rest/v1/Employee_Performance", json=mock_data, headers=supabase_headers)
            return mock_data
        return data
    except Exception as e:
        return []

@app.get("/future-risks/{project_id}")
async def get_future_risks(project_id: str):
    # Fetch Context
    ctx_res = requests.get(f"{url}/rest/v1/Project_Context?project_id=eq.{project_id}", headers=supabase_headers)
    ctx = ctx_res.json() if ctx_res.status_code == 200 else []
    
    # Fetch Metrics
    met_res = requests.get(f"{url}/rest/v1/Project_Metrics?project_id=eq.{project_id}&order=date.desc&limit=10", headers=supabase_headers)
    metrics = met_res.json() if met_res.status_code == 200 else []
    
    prompt = f\"\"\"
    You are an AI Risk Predictor. Analyze this project.
    Project Context: {ctx}
    Recent Metrics: {metrics}
    
    Predict 2 future risks that could derail this project and provide 1 mitigation strategy for each.
    Format your response as pure JSON like this:
    [
      {{"risk": "Risk description", "mitigation": "How to prevent it"}}
    ]
    \"\"\"
    
    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-pro",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        # Gemeni usually wraps arrays in an object if forced to json_object, so we parse it safely.
        res_text = response.choices[0].message.content
        import json
        parsed = json.loads(res_text)
        if isinstance(parsed, dict) and 'risks' in parsed:
            return parsed['risks']
        if isinstance(parsed, dict):
            # just return the values if it's a dict wrapping a list
            for k, v in parsed.items():
                if isinstance(v, list): return v
        return parsed if isinstance(parsed, list) else []
    except Exception as e:
        return [{"risk": "Failed to predict risks.", "mitigation": str(e)}]


@app.get("/chat-history/{project_id}")
async def get_chat_history(project_id: str):
    if not url or not key:
        return []
    try:
        # Fetch ordered by created_at asc
        r = requests.get(f"{url}/rest/v1/Chat_History?project_id=eq.{project_id}&order=created_at.asc", headers=supabase_headers)
        return r.json()
    except:
        return []

class ChatRequest(BaseModel):
    message: str
    projectId: str
    context: list

@app.post("/chat")
async def chat(request: ChatRequest):
    # Save user message
    if url and key:
        user_msg = {"project_id": request.projectId, "role": "user", "content": request.message}
        requests.post(f"{url}/rest/v1/Chat_History", json=[user_msg], headers=supabase_headers)
    
    # Get history
    history = []
    if url and key:
        r = requests.get(f"{url}/rest/v1/Chat_History?project_id=eq.{request.projectId}&order=created_at.asc&limit=20", headers=supabase_headers)
        if r.status_code == 200:
            history = r.json()
            
    # Get project context
    pctx = []
    if url and key:
        rc = requests.get(f"{url}/rest/v1/Project_Context?project_id=eq.{request.projectId}", headers=supabase_headers)
        if rc.status_code == 200: pctx = rc.json()

    messages = [
        {"role": "system", "content": f"You are InsightForge AI. You help manage projects. Project Context: {pctx}. Recent Metrics: {request.context}. Use past chat history to inform answers."}
    ]
    
    for h in history:
        # OpenAI expects user or assistant
        messages.append({"role": h["role"], "content": h["content"]})
        
    # If no history is fetched (e.g. no DB connection), just add the new message
    if not history:
        messages.append({"role": "user", "content": request.message})
        
    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-pro",
            messages=messages
        )
        reply = response.choices[0].message.content
        
        # Save assistant message
        if url and key:
            asst_msg = {"project_id": request.projectId, "role": "assistant", "content": reply}
            requests.post(f"{url}/rest/v1/Chat_History", json=[asst_msg], headers=supabase_headers)
            
    except Exception as e:
        reply = "I'm having trouble connecting to my brain. Error: " + str(e)
        
    return {"reply": reply}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
"""

with open('c:/Users/patri/OneDrive/Desktop/backup/backup/server/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
