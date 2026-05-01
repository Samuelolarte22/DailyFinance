from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# loguins
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== OBJECT STORAGE ==============

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "ldfinance"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============== MODELOS ==============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    has_completed_survey: bool = False
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Admin emails list - add emails that should have admin access
ADMIN_EMAILS = os.environ.get('ADMIN_EMAILS', '').split(',')

class AdminTransactionCreate(BaseModel):
    user_id: str
    type: str
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[str] = None
    created_by_admin: bool = True

class Transaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: str  # "income" or "expense"
    category: str
    amount: float
    description: Optional[str] = None
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    bank: Optional[str] = None

class TransactionCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[str] = None
    bank: Optional[str] = None
    pocket_id: Optional[str] = None
    savings_goal_id: Optional[str] = None
    debt_id: Optional[str] = None

class Debt(BaseModel):
    debt_id: str = Field(default_factory=lambda: f"debt_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    total_amount: float
    current_amount: float
    interest_rate: Optional[float] = 0
    num_installments: Optional[int] = 0
    min_payment: Optional[float] = 0
    due_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DebtCreate(BaseModel):
    name: str
    total_amount: float
    current_amount: float
    interest_rate: Optional[float] = 0
    num_installments: Optional[int] = 0
    min_payment: Optional[float] = 0
    due_date: Optional[str] = None

class DebtPayment(BaseModel):
    amount: float

class SavingsGoal(BaseModel):
    goal_id: str = Field(default_factory=lambda: f"goal_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: Optional[float] = 0
    deadline: Optional[str] = None

class SavingsContribution(BaseModel):
    amount: float

class DiagnosticSurvey(BaseModel):
    survey_id: str = Field(default_factory=lambda: f"survey_{uuid.uuid4().hex[:12]}")
    user_id: str
    monthly_income: float
    monthly_expenses: float
    current_savings: float
    total_debt: float
    financial_knowledge: int  # 1-5 scale
    main_financial_goal: str
    biggest_challenge: str
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiagnosticSurveyCreate(BaseModel):
    monthly_income: float
    monthly_expenses: float
    current_savings: float
    total_debt: float
    financial_knowledge: int
    main_financial_goal: str
    biggest_challenge: str

# ============== CATEGORY MODELS ==============

class CategoryCreate(BaseModel):
    name: str
    type: str  # "income" or "expense"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None

# ============== ADVISOR MESSAGE MODELS ==============

class MessageCreate(BaseModel):
    content: str
    is_task: Optional[bool] = False
    month: Optional[str] = None  # YYYY-MM

# ============== BUDGET MODELS ==============

class BudgetCreate(BaseModel):
    category: str
    projected_amount: float
    budget_type: Optional[str] = "expense"  # "expense" or "income"
    month: Optional[str] = None  # YYYY-MM, if None uses current
    comment: Optional[str] = None
    comment_recurring: Optional[bool] = False

# ============== BANK MODELS ==============

class BankCreate(BaseModel):
    name: str

# ============== POCKET MODELS ==============

class PocketCreate(BaseModel):
    name: str

class PocketFund(BaseModel):
    amount: float

# ============== SOCIAL/CONNECTION MODELS ==============

class ConnectionRequest(BaseModel):
    to_user_id: str

class SharedTransactionCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[str] = None
    bank: Optional[str] = None
    shared_with: str  # user_id of the friend
    my_percentage: float  # 0-100
    friend_percentage: float  # 0-100

# ============== AUTH HELPERS basado en framework ==============

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ============== AUTH ENDPOINTS framework ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id from Emergent Auth for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client_http:
        auth_response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    
    auth_data = auth_response.json()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        # Preserve admin status: keep DB value OR grant if in ADMIN_EMAILS
        is_admin = existing_user.get("is_admin", False) or auth_data["email"] in ADMIN_EMAILS
        if is_admin != existing_user.get("is_admin", False):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"is_admin": is_admin}}
            )
    else:
        is_admin = auth_data["email"] in ADMIN_EMAILS
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "has_completed_survey": False,
            "is_admin": is_admin,
            "is_public": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    session_token = auth_data.get("session_token", f"st_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content=user)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    return response

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

# ============== SURVEY ENDPOINTS ==============

@api_router.post("/survey")
async def submit_survey(survey_data: DiagnosticSurveyCreate, request: Request):
    """Submit diagnostic survey"""
    user = await get_current_user(request)
    
    survey = DiagnosticSurvey(
        user_id=user["user_id"],
        **survey_data.model_dump()
    )
    
    doc = survey.model_dump()
    doc["submitted_at"] = doc["submitted_at"].isoformat()
    await db.surveys.insert_one(doc)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"has_completed_survey": True}}
    )
    
    return {"message": "Survey submitted", "survey_id": survey.survey_id}

@api_router.get("/survey")
async def get_survey(request: Request):
    """Get user's survey"""
    user = await get_current_user(request)
    survey = await db.surveys.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return survey

# ============== TRANSACTION ENDPOINTS ==============

@api_router.get("/transactions")
async def get_transactions(request: Request):
    """Get all transactions for user"""
    user = await get_current_user(request)
    transactions = await db.transactions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("date", -1).to_list(1000)
    return transactions

@api_router.post("/transactions")
async def create_transaction(txn_data: TransactionCreate, request: Request):
    """Create a new transaction. Optionally deducts from pocket, contributes to savings, or pays debt."""
    user = await get_current_user(request)
    
    # Build transaction doc, exclude special fields
    txn_dict = txn_data.model_dump(exclude={"date", "pocket_id", "savings_goal_id", "debt_id"})
    txn = Transaction(user_id=user["user_id"], **txn_dict)
    
    if txn_data.date:
        txn.date = datetime.fromisoformat(txn_data.date.replace('Z', '+00:00'))
    
    doc = txn.model_dump()
    doc["date"] = doc["date"].isoformat()
    
    # Store pocket reference if provided
    if txn_data.pocket_id:
        doc["pocket_id"] = txn_data.pocket_id
        # Deduct from pocket (allow negative balance)
        await db.pockets.update_one(
            {"pocket_id": txn_data.pocket_id, "user_id": user["user_id"]},
            {"$inc": {"balance": -txn_data.amount}}
        )
    
    # If contributing to savings goal
    if txn_data.savings_goal_id:
        doc["savings_goal_id"] = txn_data.savings_goal_id
        await db.savings_goals.update_one(
            {"goal_id": txn_data.savings_goal_id, "user_id": user["user_id"]},
            {"$inc": {"current_amount": txn_data.amount}}
        )
    
    # If paying a debt
    if txn_data.debt_id:
        doc["debt_id"] = txn_data.debt_id
        await db.debts.update_one(
            {"debt_id": txn_data.debt_id, "user_id": user["user_id"]},
            {"$inc": {"current_amount": -txn_data.amount}}
        )
    
    await db.transactions.insert_one(doc)
    
    return {"message": "Transaction created", "transaction_id": txn.transaction_id}

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, request: Request):
    """Delete a transaction"""
    user = await get_current_user(request)
    result = await db.transactions.delete_one({
        "transaction_id": transaction_id,
        "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ============== DEBT ENDPOINTS ==============

@api_router.get("/debts")
async def get_debts(request: Request):
    """Get all debts for user"""
    user = await get_current_user(request)
    debts = await db.debts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return debts

@api_router.post("/debts")
async def create_debt(debt_data: DebtCreate, request: Request):
    """Create a new debt. If num_installments and interest_rate provided, auto-calculates min_payment."""
    user = await get_current_user(request)
    
    data = debt_data.model_dump()
    
    # Auto-calculate min_payment if num_installments provided
    if data.get("num_installments") and data["num_installments"] > 0 and not data.get("min_payment"):
        P = data["current_amount"]
        n = data["num_installments"]
        annual_rate = data.get("interest_rate", 0)
        
        if annual_rate > 0:
            r = annual_rate / 100 / 12  # monthly rate
            # PMT formula: P * [r(1+r)^n] / [(1+r)^n - 1]
            data["min_payment"] = round(P * (r * (1 + r) ** n) / ((1 + r) ** n - 1))
        else:
            # No interest: simple division
            data["min_payment"] = round(P / n)
    
    debt = Debt(user_id=user["user_id"], **data)
    doc = debt.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.debts.insert_one(doc)
    
    return {"message": "Debt created", "debt_id": debt.debt_id, "min_payment": doc.get("min_payment", 0)}

@api_router.put("/debts/{debt_id}/pay")
async def pay_debt(debt_id: str, payment: DebtPayment, request: Request):
    """Make a payment on a debt"""
    user = await get_current_user(request)
    
    debt = await db.debts.find_one({
        "debt_id": debt_id,
        "user_id": user["user_id"]
    }, {"_id": 0})
    
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    
    new_amount = max(0, debt["current_amount"] - payment.amount)
    await db.debts.update_one(
        {"debt_id": debt_id},
        {"$set": {"current_amount": new_amount}}
    )
    
    return {"message": "Payment recorded", "new_amount": new_amount}

@api_router.delete("/debts/{debt_id}")
async def delete_debt(debt_id: str, request: Request):
    """Delete a debt"""
    user = await get_current_user(request)
    result = await db.debts.delete_one({
        "debt_id": debt_id,
        "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debt not found")
    return {"message": "Debt deleted"}

@api_router.put("/debts/{debt_id}/edit")
async def edit_debt(debt_id: str, request: Request):
    """Edit a debt's current amount"""
    user = await get_current_user(request)
    body = await request.json()
    new_amount = body.get("current_amount")
    if new_amount is None:
        raise HTTPException(status_code=400, detail="current_amount required")
    result = await db.debts.update_one(
        {"debt_id": debt_id, "user_id": user["user_id"]},
        {"$set": {"current_amount": float(new_amount)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    return {"message": "Deuda actualizada", "current_amount": float(new_amount)}

# ============== SAVINGS GOAL ENDPOINTS ==============

@api_router.get("/savings")
async def get_savings(request: Request):
    """Get all savings goals for user"""
    user = await get_current_user(request)
    goals = await db.savings_goals.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return goals

@api_router.post("/savings")
async def create_savings_goal(goal_data: SavingsGoalCreate, request: Request):
    """Create a new savings goal"""
    user = await get_current_user(request)
    
    goal = SavingsGoal(user_id=user["user_id"], **goal_data.model_dump())
    doc = goal.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.savings_goals.insert_one(doc)
    
    return {"message": "Savings goal created", "goal_id": goal.goal_id}

@api_router.put("/savings/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, contribution: SavingsContribution, request: Request):
    """Add contribution to savings goal"""
    user = await get_current_user(request)
    
    goal = await db.savings_goals.find_one({
        "goal_id": goal_id,
        "user_id": user["user_id"]
    }, {"_id": 0})
    
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    
    new_amount = goal["current_amount"] + contribution.amount
    await db.savings_goals.update_one(
        {"goal_id": goal_id},
        {"$set": {"current_amount": new_amount}}
    )
    
    return {"message": "Contribution recorded", "new_amount": new_amount}

@api_router.delete("/savings/{goal_id}")
async def delete_savings_goal(goal_id: str, request: Request):
    """Delete a savings goal"""
    user = await get_current_user(request)
    result = await db.savings_goals.delete_one({
        "goal_id": goal_id,
        "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    return {"message": "Savings goal deleted"}

@api_router.put("/savings/{goal_id}/edit")
async def edit_savings_goal(goal_id: str, request: Request):
    """Edit a savings goal's current amount"""
    user = await get_current_user(request)
    body = await request.json()
    new_amount = body.get("current_amount")
    if new_amount is None:
        raise HTTPException(status_code=400, detail="current_amount required")
    result = await db.savings_goals.update_one(
        {"goal_id": goal_id, "user_id": user["user_id"]},
        {"$set": {"current_amount": float(new_amount)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return {"message": "Meta actualizada", "current_amount": float(new_amount)}

# ============== REPORTS ENDPOINT ==============

@api_router.get("/reports")
async def get_reports(request: Request):
    """Get financial reports with annual overview and stacked chart data"""
    user = await get_current_user(request)
    
    survey = await db.surveys.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    transactions = await db.transactions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).to_list(1000)
    
    debts = await db.debts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_debt = sum(d["current_amount"] for d in debts)
    total_savings = sum(s["current_amount"] for s in savings)
    
    before = {
        "monthly_income": survey["monthly_income"] if survey else 0,
        "monthly_expenses": survey["monthly_expenses"] if survey else 0,
        "total_debt": survey["total_debt"] if survey else 0,
        "total_savings": survey["current_savings"] if survey else 0,
    }
    
    after = {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_debt": total_debt,
        "total_savings": total_savings,
        "balance": total_income - total_expenses,
    }
    
    # Monthly breakdown
    monthly_data = {}
    for txn in transactions:
        date_str = txn["date"][:7] if isinstance(txn["date"], str) else txn["date"].strftime("%Y-%m")
        if date_str not in monthly_data:
            monthly_data[date_str] = {"income": 0, "expense": 0}
        if txn["type"] == "income":
            monthly_data[date_str]["income"] += txn["amount"]
        else:
            monthly_data[date_str]["expense"] += txn["amount"]
    
    # Annual overview by month (Gasto Real por Mes) - like the spreadsheet
    current_year = str(datetime.now(timezone.utc).year)
    months_es = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    
    # Compute per-month totals for current year
    monthly_income = {f"{current_year}-{str(m).zfill(2)}": 0 for m in range(1, 13)}
    monthly_expenses_map = {f"{current_year}-{str(m).zfill(2)}": 0 for m in range(1, 13)}
    monthly_savings_contributions = {f"{current_year}-{str(m).zfill(2)}": 0 for m in range(1, 13)}
    monthly_debt_payments = {f"{current_year}-{str(m).zfill(2)}": 0 for m in range(1, 13)}
    
    for txn in transactions:
        txn_month = txn["date"][:7] if isinstance(txn["date"], str) else txn["date"].strftime("%Y-%m")
        if not txn_month.startswith(current_year):
            continue
        if txn["type"] == "income":
            monthly_income[txn_month] = monthly_income.get(txn_month, 0) + txn["amount"]
        else:
            monthly_expenses_map[txn_month] = monthly_expenses_map.get(txn_month, 0) + txn["amount"]
        if txn.get("savings_goal_id"):
            monthly_savings_contributions[txn_month] = monthly_savings_contributions.get(txn_month, 0) + txn["amount"]
        if txn.get("debt_id"):
            monthly_debt_payments[txn_month] = monthly_debt_payments.get(txn_month, 0) + txn["amount"]
    
    annual_overview = []
    for m in range(1, 13):
        key = f"{current_year}-{str(m).zfill(2)}"
        inc = round(monthly_income.get(key, 0))
        exp = round(monthly_expenses_map.get(key, 0))
        sav = round(monthly_savings_contributions.get(key, 0))
        dbt = round(monthly_debt_payments.get(key, 0))
        annual_overview.append({
            "month": key,
            "label": months_es[m - 1],
            "income": inc,
            "expenses": exp,
            "savings": sav,
            "debts": dbt,
            "net": inc - exp
        })
    
    # Stacked bar chart data (% distribution per month)
    stacked_chart = []
    for item in annual_overview:
        total = item["income"] + item["expenses"] + item["savings"] + item["debts"]
        if total == 0:
            stacked_chart.append({
                "label": item["label"],
                "month": item["month"],
                "income_pct": 0, "expenses_pct": 0, "savings_pct": 0, "debts_pct": 0,
                "income": 0, "expenses": 0, "savings": 0, "debts": 0
            })
        else:
            stacked_chart.append({
                "label": item["label"],
                "month": item["month"],
                "income_pct": round(item["income"] / total * 100),
                "expenses_pct": round(item["expenses"] / total * 100),
                "savings_pct": round(item["savings"] / total * 100),
                "debts_pct": round(item["debts"] / total * 100),
                "income": item["income"],
                "expenses": item["expenses"],
                "savings": item["savings"],
                "debts": item["debts"]
            })
    
    # Annual budget comparison
    budgets = await db.budgets.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).to_list(200)
    
    # Group budgets by type
    expense_budgets = {b["category"]: b["projected_amount"] for b in budgets if b.get("budget_type") == "expense"}
    income_budgets = {b["category"]: b["projected_amount"] for b in budgets if b.get("budget_type") == "income"}
    
    # Sum actual transactions for the current year by category
    year_expense_totals = {}
    year_income_totals = {}
    for txn in transactions:
        txn_year = txn["date"][:4] if isinstance(txn["date"], str) else str(txn["date"].year)
        if txn_year == current_year:
            cat = txn["category"]
            if txn["type"] == "expense":
                year_expense_totals[cat] = year_expense_totals.get(cat, 0) + txn["amount"]
            else:
                year_income_totals[cat] = year_income_totals.get(cat, 0) + txn["amount"]
    
    # Build annual comparison (projected * 12 vs actual year total)
    annual_expense_comparison = []
    all_expense_cats = set(list(expense_budgets.keys()) + list(year_expense_totals.keys()))
    for cat in sorted(all_expense_cats):
        monthly_proj = expense_budgets.get(cat, 0)
        annual_proj = round(monthly_proj * 12)
        actual = round(year_expense_totals.get(cat, 0))
        over = actual > annual_proj if annual_proj > 0 else actual > 0
        annual_expense_comparison.append({
            "category": cat,
            "monthly_projected": round(monthly_proj),
            "annual_projected": annual_proj,
            "annual_actual": actual,
            "difference": annual_proj - actual,
            "over_budget": over
        })
    
    annual_income_comparison = []
    all_income_cats = set(list(income_budgets.keys()) + list(year_income_totals.keys()))
    for cat in sorted(all_income_cats):
        monthly_proj = income_budgets.get(cat, 0)
        annual_proj = round(monthly_proj * 12)
        actual = round(year_income_totals.get(cat, 0))
        under = actual < annual_proj if annual_proj > 0 else False
        annual_income_comparison.append({
            "category": cat,
            "monthly_projected": round(monthly_proj),
            "annual_projected": annual_proj,
            "annual_actual": actual,
            "difference": actual - annual_proj,
            "over_budget": under
        })
    
    # Annual totals
    total_annual_expense_projected = sum(i["annual_projected"] for i in annual_expense_comparison)
    total_annual_expense_actual = sum(i["annual_actual"] for i in annual_expense_comparison)
    total_annual_income_projected = sum(i["annual_projected"] for i in annual_income_comparison)
    total_annual_income_actual = sum(i["annual_actual"] for i in annual_income_comparison)
    
    return {
        "before": before,
        "after": after,
        "monthly_breakdown": monthly_data,
        "transactions_count": len(transactions),
        "debts_count": len(debts),
        "savings_goals_count": len(savings),
        "annual_overview": annual_overview,
        "stacked_chart": stacked_chart,
        "annual_comparison": {
            "year": current_year,
            "expenses": annual_expense_comparison,
            "income": annual_income_comparison,
            "totals": {
                "expense_projected": total_annual_expense_projected,
                "expense_actual": total_annual_expense_actual,
                "income_projected": total_annual_income_projected,
                "income_actual": total_annual_income_actual
            }
        }
    }

# ============== REPORTS TIMELINE ENDPOINT ==============

@api_router.get("/reports/timeline")
async def get_reports_timeline(request: Request, period: str = "month"):
    """Get debt and savings time series data for charts.
    period: 'week', 'month', or 'year'
    """
    user = await get_current_user(request)
    
    debts = await db.debts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    transactions = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    
    # Current totals
    current_debt = sum(d["current_amount"] for d in debts)
    current_savings = sum(s["current_amount"] for s in savings)
    
    # Collect all debt payments and savings contributions sorted by date
    debt_events = []
    savings_events = []
    for txn in transactions:
        date_str = txn["date"][:10] if isinstance(txn["date"], str) else txn["date"].strftime("%Y-%m-%d")
        if txn.get("debt_id"):
            debt_events.append({"date": date_str, "amount": txn["amount"]})
        if txn.get("savings_goal_id"):
            savings_events.append({"date": date_str, "amount": txn["amount"]})
    
    # Sort by date descending (most recent first) for reverse computation
    debt_events.sort(key=lambda x: x["date"], reverse=True)
    savings_events.sort(key=lambda x: x["date"], reverse=True)
    
    # Also account for debt creation dates and their total amounts
    debt_creations = []
    for d in debts:
        created = d.get("created_at", "")
        if isinstance(created, str):
            date_str = created[:10]
        else:
            date_str = created.strftime("%Y-%m-%d")
        debt_creations.append({"date": date_str, "total_amount": d["total_amount"]})
    debt_creations.sort(key=lambda x: x["date"], reverse=True)
    
    # Collect all unique dates and group by period
    all_dates = set()
    for e in debt_events:
        all_dates.add(e["date"])
    for e in savings_events:
        all_dates.add(e["date"])
    for d in debt_creations:
        all_dates.add(d["date"])
    # Add today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    all_dates.add(today)
    
    if not all_dates:
        return {"timeline": [], "period": period}
    
    # Group dates by period
    def get_period_key(date_str):
        if period == "year":
            return date_str[:4]
        elif period == "week":
            from datetime import date as dt_date
            parts = date_str.split("-")
            d = dt_date(int(parts[0]), int(parts[1]), int(parts[2]))
            iso = d.isocalendar()
            return f"{iso[0]}-W{iso[1]:02d}"
        else:  # month
            return date_str[:7]
    
    # Build period-level debt payment and savings contribution totals
    period_debt_payments = {}
    for e in debt_events:
        pk = get_period_key(e["date"])
        period_debt_payments[pk] = period_debt_payments.get(pk, 0) + e["amount"]
    
    period_savings_contribs = {}
    for e in savings_events:
        pk = get_period_key(e["date"])
        period_savings_contribs[pk] = period_savings_contribs.get(pk, 0) + e["amount"]
    
    period_debt_creations = {}
    for d in debt_creations:
        pk = get_period_key(d["date"])
        period_debt_creations[pk] = period_debt_creations.get(pk, 0) + d["total_amount"]
    
    # Get all unique period keys sorted
    all_period_keys = set()
    all_period_keys.update(period_debt_payments.keys())
    all_period_keys.update(period_savings_contribs.keys())
    all_period_keys.update(period_debt_creations.keys())
    current_period = get_period_key(today)
    all_period_keys.add(current_period)
    sorted_periods = sorted(all_period_keys)
    
    # Compute running totals: start from current and go backwards
    # At current period, debt = current_debt, savings = current_savings
    # Going backwards: reverse debt payments (add back), reverse savings (subtract back)
    # reverse debt creations (subtract)
    timeline_data = {}
    debt_val = current_debt
    savings_val = current_savings
    
    # Process from most recent to oldest
    for pk in reversed(sorted_periods):
        timeline_data[pk] = {"debt": round(debt_val), "savings": round(savings_val)}
        # Reverse: going to the previous period means undoing this period's changes
        # Debt: payments reduced debt, so add them back; new debts added debt, so subtract them
        debt_val = debt_val + period_debt_payments.get(pk, 0) - period_debt_creations.get(pk, 0)
        savings_val = savings_val - period_savings_contribs.get(pk, 0)
    
    # Build final sorted timeline
    timeline = []
    for pk in sorted_periods:
        data = timeline_data.get(pk, {"debt": 0, "savings": 0})
        # Create label
        if period == "year":
            label = pk
        elif period == "week":
            label = pk
        else:
            parts = pk.split("-")
            months_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
            month_idx = int(parts[1]) - 1 if len(parts) > 1 else 0
            label = f"{months_es[month_idx]} {parts[0][2:]}"
        
        timeline.append({
            "period": pk,
            "label": label,
            "debt": max(0, data["debt"]),
            "savings": max(0, data["savings"])
        })
    
    return {"timeline": timeline, "period": period}

# ============== DASHBOARD SUMMARY ==============

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    """Get dashboard summary"""
    user = await get_current_user(request)
    
    transactions = await db.transactions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    debts = await db.debts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    balance = total_income - total_expenses
    
    total_debt = sum(d["current_amount"] for d in debts)
    total_savings = sum(s["current_amount"] for s in savings)
    
    pockets = await db.pockets.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    total_in_pockets = sum(p["balance"] for p in pockets)
    
    recent_transactions = transactions[:5]
    
    return {
        "balance": balance,
        "available_balance": balance - total_in_pockets,
        "total_in_pockets": total_in_pockets,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_debt": total_debt,
        "total_savings": total_savings,
        "recent_transactions": recent_transactions,
        "all_transactions": transactions,
        "debts_count": len(debts),
        "savings_goals_count": len(savings),
        "pockets": pockets,
        "debts": debts,
        "savings_goals": savings
    }

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "StudentFinance API", "status": "healthy"}

# ============== ADMIN ENDPOINTS ==============

async def get_admin_user(request: Request) -> dict:
    """Verify user is an admin"""
    user = await get_current_user(request)
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@api_router.get("/admin/users")
async def admin_get_all_users(request: Request):
    """Get all users with their financial summaries - optimized with aggregation"""
    await get_admin_user(request)
    
    users = await db.users.find({}, {"_id": 0}).to_list(500)
    
    # Batch fetch all data at once instead of N+1 queries
    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(2000)
    all_debts = await db.debts.find({}, {"_id": 0}).to_list(500)
    all_savings = await db.savings_goals.find({}, {"_id": 0}).to_list(500)
    all_surveys = await db.surveys.find({}, {"_id": 0}).to_list(500)
    
    # Group by user_id
    txn_by_user = {}
    for t in all_transactions:
        uid = t["user_id"]
        if uid not in txn_by_user:
            txn_by_user[uid] = []
        txn_by_user[uid].append(t)
    
    debts_by_user = {}
    for d in all_debts:
        uid = d["user_id"]
        if uid not in debts_by_user:
            debts_by_user[uid] = []
        debts_by_user[uid].append(d)
    
    savings_by_user = {}
    for s in all_savings:
        uid = s["user_id"]
        if uid not in savings_by_user:
            savings_by_user[uid] = []
        savings_by_user[uid].append(s)
    
    surveys_by_user = {s["user_id"]: s for s in all_surveys}
    
    # Enrich users
    enriched_users = []
    for user in users:
        uid = user["user_id"]
        transactions = txn_by_user.get(uid, [])
        debts = debts_by_user.get(uid, [])
        savings = savings_by_user.get(uid, [])
        survey = surveys_by_user.get(uid)
        
        total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
        total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
        total_debt = sum(d["current_amount"] for d in debts)
        total_savings = sum(s["current_amount"] for s in savings)
        
        enriched_users.append({
            **user,
            "financial_summary": {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "balance": total_income - total_expenses,
                "total_debt": total_debt,
                "total_savings": total_savings,
                "transactions_count": len(transactions),
                "debts_count": len(debts),
                "savings_goals_count": len(savings)
            },
            "survey": survey
        })
    
    return enriched_users

@api_router.get("/admin/users/{user_id}")
async def admin_get_user_detail(user_id: str, request: Request):
    """Get detailed financial data for a specific user"""
    await get_admin_user(request)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    transactions = await db.transactions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    debts = await db.debts.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    survey = await db.surveys.find_one({"user_id": user_id}, {"_id": 0})
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    
    return {
        "user": user,
        "transactions": transactions,
        "debts": debts,
        "savings_goals": savings,
        "survey": survey,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "balance": total_income - total_expenses,
            "total_debt": sum(d["current_amount"] for d in debts),
            "total_savings": sum(s["current_amount"] for s in savings)
        }
    }

@api_router.post("/admin/users/{user_id}/transactions")
async def admin_create_transaction(user_id: str, txn_data: AdminTransactionCreate, request: Request):
    """Admin creates a transaction for a user"""
    admin = await get_admin_user(request)
    
    # Verify target user exists
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    txn = Transaction(
        user_id=user_id,
        type=txn_data.type,
        category=txn_data.category,
        amount=txn_data.amount,
        description=txn_data.description
    )
    
    if txn_data.date:
        txn.date = datetime.fromisoformat(txn_data.date.replace('Z', '+00:00'))
    
    doc = txn.model_dump()
    doc["date"] = doc["date"].isoformat()
    doc["created_by_admin"] = True
    doc["admin_user_id"] = admin["user_id"]
    await db.transactions.insert_one(doc)
    
    return {"message": "Transaction created by admin", "transaction_id": txn.transaction_id}

@api_router.put("/admin/users/{user_id}/toggle-admin")
async def admin_toggle_user_admin(user_id: str, request: Request):
    """Toggle admin status for a user"""
    admin = await get_admin_user(request)
    
    # Prevent self-demotion
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="No puedes cambiar tu propio rol de admin")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_admin_status = not target_user.get("is_admin", False)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": new_admin_status}}
    )
    
    return {
        "message": f"Usuario {'promovido a admin' if new_admin_status else 'removido de admin'}",
        "is_admin": new_admin_status
    }

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    """Delete a user and all their associated data"""
    admin = await get_admin_user(request)
    
    # Prevent self-deletion
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Delete all user data
    await db.transactions.delete_many({"user_id": user_id})
    await db.debts.delete_many({"user_id": user_id})
    await db.savings_goals.delete_many({"user_id": user_id})
    await db.surveys.delete_many({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.categories.delete_many({"user_id": user_id})
    await db.advisor_messages.delete_many({"user_id": user_id})
    await db.budgets.delete_many({"user_id": user_id})
    await db.banks.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    
    return {
        "message": f"Usuario {target_user.get('name', 'desconocido')} eliminado correctamente",
        "deleted_user_id": user_id
    }

@api_router.get("/admin/summary")
async def admin_get_global_summary(request: Request):
    """Get global summary of all users for admin dashboard"""
    await get_admin_user(request)
    
    users = await db.users.find({}, {"_id": 0}).to_list(500)
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(2000)
    debts = await db.debts.find({}, {"_id": 0}).to_list(500)
    savings = await db.savings_goals.find({}, {"_id": 0}).to_list(500)
    surveys = await db.surveys.find({}, {"_id": 0}).to_list(500)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_debt = sum(d["current_amount"] for d in debts)
    total_savings = sum(s["current_amount"] for s in savings)
    
    # Average financial knowledge from surveys
    avg_knowledge = 0
    if surveys:
        avg_knowledge = sum(s.get("financial_knowledge", 0) for s in surveys) / len(surveys)
    
    return {
        "total_users": len(users),
        "users_with_survey": len(surveys),
        "total_transactions": len(transactions),
        "total_debts": len(debts),
        "total_savings_goals": len(savings),
        "financial_totals": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "total_debt": total_debt,
            "total_savings": total_savings
        },
        "averages": {
            "avg_financial_knowledge": round(avg_knowledge, 2),
            "avg_transactions_per_user": round(len(transactions) / max(len(users), 1), 1)
        }
    }

# ============== BUDGET ENDPOINTS ==============

@api_router.get("/budgets")
async def get_budgets(request: Request):
    """Get all budgets for user"""
    user = await get_current_user(request)
    budgets = await db.budgets.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return budgets

@api_router.post("/budgets")
async def upsert_budget(budget_data: BudgetCreate, request: Request):
    """Create or update a budget for a category for a specific month"""
    user = await get_current_user(request)
    
    month = budget_data.month
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{str(now.month).zfill(2)}"
    
    existing = await db.budgets.find_one(
        {"user_id": user["user_id"], "category": budget_data.category, "budget_type": budget_data.budget_type, "month": month},
        {"_id": 0}
    )
    
    update_fields = {"projected_amount": budget_data.projected_amount}
    if budget_data.comment is not None:
        update_fields["comment"] = budget_data.comment
        update_fields["comment_recurring"] = budget_data.comment_recurring
    
    if existing:
        await db.budgets.update_one(
            {"user_id": user["user_id"], "category": budget_data.category, "budget_type": budget_data.budget_type, "month": month},
            {"$set": update_fields}
        )
        return {"message": "Presupuesto actualizado", "budget_id": existing["budget_id"]}
    
    # Check for recurring comment from previous months
    if budget_data.comment is None:
        prev_budget = await db.budgets.find_one(
            {"user_id": user["user_id"], "category": budget_data.category, "budget_type": budget_data.budget_type, "comment_recurring": True},
            {"_id": 0},
            sort=[("month", -1)]
        )
        if prev_budget and prev_budget.get("comment"):
            update_fields["comment"] = prev_budget["comment"]
            update_fields["comment_recurring"] = True
    
    budget_id = f"bud_{uuid.uuid4().hex[:12]}"
    doc = {
        "budget_id": budget_id,
        "user_id": user["user_id"],
        "category": budget_data.category,
        "projected_amount": budget_data.projected_amount,
        "budget_type": budget_data.budget_type,
        "month": month,
        "comment": update_fields.get("comment", ""),
        "comment_recurring": update_fields.get("comment_recurring", False),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.budgets.insert_one(doc)
    return {"message": "Presupuesto creado", "budget_id": budget_id}

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, request: Request):
    """Delete a budget"""
    user = await get_current_user(request)
    result = await db.budgets.delete_one({"budget_id": budget_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    return {"message": "Presupuesto eliminado"}

@api_router.get("/budgets/comparison")
async def get_budget_comparison(request: Request, month: Optional[str] = None, budget_type: Optional[str] = "expense"):
    """Get budget vs actual spending/income for ALL user categories in a month"""
    user = await get_current_user(request)
    
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{str(now.month).zfill(2)}"
    
    # Get ALL user categories of this type
    user_cats = await db.categories.find(
        {"user_id": user["user_id"], "type": budget_type}, {"_id": 0}
    ).to_list(200)
    all_user_cat_names = [c["name"] for c in user_cats]
    
    # Get budgets of the specified type FOR THIS MONTH
    budgets = await db.budgets.find(
        {"user_id": user["user_id"], "budget_type": budget_type, "month": month},
        {"_id": 0}
    ).to_list(100)
    
    # If no month-specific budgets, fall back to budgets without month field (legacy)
    if not budgets:
        budgets = await db.budgets.find(
            {"user_id": user["user_id"], "budget_type": budget_type, "month": {"$exists": False}},
            {"_id": 0}
        ).to_list(100)
    
    # Also check for recurring comments from other months
    recurring_comments = {}
    recurring_budgets = await db.budgets.find(
        {"user_id": user["user_id"], "budget_type": budget_type, "comment_recurring": True, "comment": {"$ne": ""}},
        {"_id": 0}
    ).to_list(200)
    for rb in recurring_budgets:
        if rb["category"] not in recurring_comments:
            recurring_comments[rb["category"]] = rb.get("comment", "")
    
    budget_map = {b["category"]: b for b in budgets}
    
    # Get transactions of the matching type for the month
    txn_type = budget_type
    all_txns = await db.transactions.find(
        {"user_id": user["user_id"], "type": txn_type},
        {"_id": 0}
    ).to_list(5000)
    
    # Filter by month and group by category
    category_totals = {}
    for txn in all_txns:
        txn_month = txn["date"][:7]
        if txn_month == month:
            cat = txn["category"]
            category_totals[cat] = category_totals.get(cat, 0) + txn["amount"]
    
    # Include ALL user categories + any with budgets/transactions
    all_categories = set(all_user_cat_names + list(budget_map.keys()) + list(category_totals.keys()))
    
    comparison = []
    for cat in sorted(all_categories):
        projected = budget_map.get(cat, {}).get("projected_amount", 0)
        actual = category_totals.get(cat, 0)
        budget_id = budget_map.get(cat, {}).get("budget_id")
        
        if budget_type == "expense":
            over = actual > projected if projected > 0 else False
            diff = projected - actual
        else:
            over = actual < projected if projected > 0 else False
            diff = actual - projected
        
        comparison.append({
            "category": cat,
            "projected": projected,
            "actual": round(actual),
            "difference": round(diff),
            "over_budget": over,
            "budget_id": budget_id,
            "comment": budget_map.get(cat, {}).get("comment", "") or recurring_comments.get(cat, ""),
            "comment_recurring": budget_map.get(cat, {}).get("comment_recurring", False)
        })
    
    return comparison

# ============== BANK ENDPOINTS ==============

@api_router.get("/banks")
async def get_banks(request: Request):
    """Get user's banks"""
    user = await get_current_user(request)
    banks = await db.banks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    return banks

@api_router.post("/banks")
async def create_bank(bank_data: BankCreate, request: Request):
    """Add a bank"""
    user = await get_current_user(request)
    bank_id = f"bank_{uuid.uuid4().hex[:12]}"
    doc = {
        "bank_id": bank_id,
        "user_id": user["user_id"],
        "name": bank_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.banks.insert_one(doc)
    return {"message": "Banco agregado", "bank_id": bank_id}

@api_router.delete("/banks/{bank_id}")
async def delete_bank(bank_id: str, request: Request):
    """Delete a bank"""
    user = await get_current_user(request)
    result = await db.banks.delete_one({"bank_id": bank_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    return {"message": "Banco eliminado"}


# ============== POCKET ENDPOINTS ==============

@api_router.get("/pockets")
async def get_pockets(request: Request):
    """Get all pockets for user"""
    user = await get_current_user(request)
    pockets = await db.pockets.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return pockets

@api_router.post("/pockets")
async def create_pocket(pocket_data: PocketCreate, request: Request):
    """Create a new digital pocket"""
    user = await get_current_user(request)
    
    pocket_id = f"pkt_{uuid.uuid4().hex[:12]}"
    doc = {
        "pocket_id": pocket_id,
        "user_id": user["user_id"],
        "name": pocket_data.name,
        "balance": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pockets.insert_one(doc)
    return {"message": "Bolsillo creado", "pocket_id": pocket_id}

@api_router.post("/pockets/{pocket_id}/fund")
async def fund_pocket(pocket_id: str, fund_data: PocketFund, request: Request):
    """Add money to a pocket from available balance"""
    user = await get_current_user(request)
    
    pocket = await db.pockets.find_one(
        {"pocket_id": pocket_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not pocket:
        raise HTTPException(status_code=404, detail="Bolsillo no encontrado")
    
    await db.pockets.update_one(
        {"pocket_id": pocket_id},
        {"$inc": {"balance": fund_data.amount}}
    )
    return {"message": "Bolsillo fondeado", "new_balance": pocket["balance"] + fund_data.amount}

@api_router.delete("/pockets/{pocket_id}")
async def delete_pocket(pocket_id: str, request: Request):
    """Delete a pocket"""
    user = await get_current_user(request)
    result = await db.pockets.delete_one({"pocket_id": pocket_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bolsillo no encontrado")
    return {"message": "Bolsillo eliminado"}

@api_router.put("/pockets/{pocket_id}/edit")
async def edit_pocket(pocket_id: str, request: Request):
    """Edit a pocket's name or adjust balance"""
    user = await get_current_user(request)
    body = await request.json()
    
    pocket = await db.pockets.find_one({"pocket_id": pocket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not pocket:
        raise HTTPException(status_code=404, detail="Bolsillo no encontrado")
    
    update_fields = {}
    if "name" in body:
        update_fields["name"] = body["name"]
    
    if "balance" in body:
        new_balance = float(body["balance"])
        if new_balance < 0:
            raise HTTPException(status_code=400, detail="Balance no puede ser negativo")
        update_fields["balance"] = new_balance
    
    if update_fields:
        await db.pockets.update_one(
            {"pocket_id": pocket_id, "user_id": user["user_id"]},
            {"$set": update_fields}
        )
    
    return {"message": "Bolsillo actualizado"}

@api_router.post("/pockets/{pocket_id}/withdraw")
async def withdraw_pocket(pocket_id: str, request: Request):
    """Withdraw funds from pocket back to available balance"""
    user = await get_current_user(request)
    body = await request.json()
    amount = float(body.get("amount", 0))
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Monto debe ser positivo")
    
    pocket = await db.pockets.find_one({"pocket_id": pocket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not pocket:
        raise HTTPException(status_code=404, detail="Bolsillo no encontrado")
    
    if amount > pocket["balance"]:
        raise HTTPException(status_code=400, detail="Fondos insuficientes en el bolsillo")
    
    await db.pockets.update_one(
        {"pocket_id": pocket_id},
        {"$inc": {"balance": -amount}}
    )
    
    return {"message": f"Retirado {amount} del bolsillo", "new_balance": pocket["balance"] - amount}


# ============== ADMIN VIEW/EDIT USER DATA ==============

@api_router.get("/admin/users/{user_id}/dashboard")
async def admin_get_user_dashboard(user_id: str, request: Request):
    """Admin gets a user's full dashboard data"""
    await get_admin_user(request)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0}).to_list(5000)
    debts = await db.debts.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_debt = sum(d["current_amount"] for d in debts)
    total_savings = sum(s["current_amount"] for s in savings)
    
    return {
        "user": user,
        "transactions": transactions,
        "debts": debts,
        "savings": savings,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "balance": total_income - total_expenses,
            "total_debt": total_debt,
            "total_savings": total_savings
        }
    }

@api_router.post("/admin/users/{user_id}/debts")
async def admin_create_user_debt(user_id: str, debt_data: DebtCreate, request: Request):
    """Admin creates a debt for a user"""
    await get_admin_user(request)
    
    data = debt_data.model_dump()
    if data.get("num_installments") and data["num_installments"] > 0 and not data.get("min_payment"):
        P = data["current_amount"]
        n = data["num_installments"]
        annual_rate = data.get("interest_rate", 0)
        if annual_rate > 0:
            r = annual_rate / 100 / 12
            data["min_payment"] = round(P * (r * (1 + r) ** n) / ((1 + r) ** n - 1))
        else:
            data["min_payment"] = round(P / n)
    
    debt = Debt(user_id=user_id, **data)
    doc = debt.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.debts.insert_one(doc)
    return {"message": "Deuda creada", "debt_id": debt.debt_id}

@api_router.put("/admin/users/{user_id}/debts/{debt_id}")
async def admin_update_user_debt(user_id: str, debt_id: str, debt_data: DebtCreate, request: Request):
    """Admin updates a user's debt"""
    await get_admin_user(request)
    
    data = debt_data.model_dump()
    if data.get("num_installments") and data["num_installments"] > 0 and not data.get("min_payment"):
        P = data["current_amount"]
        n = data["num_installments"]
        annual_rate = data.get("interest_rate", 0)
        if annual_rate > 0:
            r = annual_rate / 100 / 12
            data["min_payment"] = round(P * (r * (1 + r) ** n) / ((1 + r) ** n - 1))
        else:
            data["min_payment"] = round(P / n)
    
    result = await db.debts.update_one(
        {"debt_id": debt_id, "user_id": user_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    return {"message": "Deuda actualizada"}

@api_router.delete("/admin/users/{user_id}/debts/{debt_id}")
async def admin_delete_user_debt(user_id: str, debt_id: str, request: Request):
    """Admin deletes a user's debt"""
    await get_admin_user(request)
    result = await db.debts.delete_one({"debt_id": debt_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    return {"message": "Deuda eliminada"}

@api_router.put("/admin/users/{user_id}/transactions/{transaction_id}")
async def admin_update_transaction(user_id: str, transaction_id: str, txn_data: TransactionCreate, request: Request):
    """Admin updates a user's transaction"""
    await get_admin_user(request)
    data = txn_data.model_dump()
    result = await db.transactions.update_one(
        {"transaction_id": transaction_id, "user_id": user_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaccion no encontrada")
    return {"message": "Transaccion actualizada"}

@api_router.delete("/admin/users/{user_id}/transactions/{transaction_id}")
async def admin_delete_transaction(user_id: str, transaction_id: str, request: Request):
    """Admin deletes a user's transaction"""
    await get_admin_user(request)
    result = await db.transactions.delete_one({"transaction_id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaccion no encontrada")
    return {"message": "Transaccion eliminada"}

@api_router.get("/admin/users/{user_id}/savings")
async def admin_get_user_savings(user_id: str, request: Request):
    """Admin gets user's savings goals"""
    await get_admin_user(request)
    savings = await db.savings_goals.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return savings

@api_router.delete("/admin/users/{user_id}/savings/{goal_id}")
async def admin_delete_user_saving(user_id: str, goal_id: str, request: Request):
    """Admin deletes a user's saving goal"""
    await get_admin_user(request)
    result = await db.savings_goals.delete_one({"goal_id": goal_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return {"message": "Meta eliminada"}

@api_router.post("/admin/impersonate/{user_id}")
async def admin_impersonate_user(user_id: str, request: Request):
    """Admin impersonates a user by creating a temporary session"""
    admin = await get_admin_user(request)
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Save admin's current session token so we can restore it later
    admin_session_token = request.cookies.get("session_token")
    
    # Create a temporary session for the target user
    imp_session_token = str(uuid.uuid4())
    session_doc = {
        "session_token": imp_session_token,
        "user_id": user_id,
        "is_impersonation": True,
        "admin_user_id": admin["user_id"],
        "admin_session_token": admin_session_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set the impersonation token as the active cookie (server-side)
    resp = JSONResponse(content={
        "message": "Impersonation started",
        "user": {
            "user_id": target_user["user_id"],
            "name": target_user.get("name", ""),
            "email": target_user.get("email", ""),
            "picture": target_user.get("picture", "")
        }
    })
    resp.set_cookie(
        key="session_token",
        value=imp_session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=2 * 60 * 60
    )
    return resp

@api_router.post("/admin/stop-impersonation")
async def admin_stop_impersonation(request: Request):
    """Stop impersonation and restore admin session"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        return JSONResponse(content={"message": "No active session"}, status_code=400)
    
    # Find the impersonation session to get the admin's original token
    imp_session = await db.user_sessions.find_one(
        {"session_token": session_token, "is_impersonation": True},
        {"_id": 0}
    )
    
    if not imp_session:
        return JSONResponse(content={"message": "Not impersonating"}, status_code=400)
    
    admin_session_token = imp_session.get("admin_session_token")
    
    # Delete the impersonation session
    await db.user_sessions.delete_one({"session_token": session_token})
    
    # Restore admin's original cookie
    resp = JSONResponse(content={"message": "Impersonation ended"})
    if admin_session_token:
        resp.set_cookie(
            key="session_token",
            value=admin_session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
    return resp


# ============== SOCIAL/CONNECTION ENDPOINTS ==============

@api_router.put("/profile/visibility")
async def toggle_profile_visibility(request: Request):
    """Toggle public/private profile"""
    user = await get_current_user(request)
    current = user.get("is_public", False)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"is_public": not current}}
    )
    return {"message": "Visibilidad actualizada", "is_public": not current}

@api_router.get("/community/users")
async def list_community_users(request: Request):
    """List all public users + connected users"""
    user = await get_current_user(request)
    
    # Get all users (public or connected)
    all_users = await db.users.find(
        {"user_id": {"$ne": user["user_id"]}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "is_public": 1}
    ).to_list(500)
    
    # Get connections involving this user
    connections = await db.connections.find(
        {"$or": [
            {"from_user_id": user["user_id"]},
            {"to_user_id": user["user_id"]}
        ]},
        {"_id": 0}
    ).to_list(500)
    
    # Build connection map
    conn_map = {}
    for c in connections:
        other_id = c["to_user_id"] if c["from_user_id"] == user["user_id"] else c["from_user_id"]
        conn_map[other_id] = c
    
    result = []
    for u in all_users:
        conn = conn_map.get(u["user_id"])
        result.append({
            **u,
            "connection_status": conn["status"] if conn else None,
            "connection_id": conn["connection_id"] if conn else None,
            "connection_initiated_by": conn.get("from_user_id") if conn else None
        })
    
    return result

@api_router.post("/connections/request")
async def send_connection_request(req_data: ConnectionRequest, request: Request):
    """Send a connection request"""
    user = await get_current_user(request)
    
    if req_data.to_user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="No puedes conectarte contigo mismo")
    
    # Check if connection already exists
    existing = await db.connections.find_one({
        "$or": [
            {"from_user_id": user["user_id"], "to_user_id": req_data.to_user_id},
            {"from_user_id": req_data.to_user_id, "to_user_id": user["user_id"]}
        ]
    })
    
    if existing:
        if existing.get("status") == "rejected":
            # Allow resending rejected request
            await db.connections.update_one(
                {"connection_id": existing["connection_id"]},
                {"$set": {
                    "status": "pending",
                    "from_user_id": user["user_id"],
                    "to_user_id": req_data.to_user_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            # Create notification
            await db.notifications.insert_one({
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": req_data.to_user_id,
                "type": "connection_request",
                "from_user_id": user["user_id"],
                "from_user_name": user.get("name", "Usuario"),
                "message": f"{user.get('name', 'Alguien')} te ha enviado una solicitud de conexion",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"message": "Solicitud reenviada"}
        elif existing.get("status") == "accepted":
            raise HTTPException(status_code=400, detail="Ya estan conectados")
        else:
            raise HTTPException(status_code=400, detail="Ya existe una solicitud pendiente")
    
    conn_id = f"conn_{uuid.uuid4().hex[:12]}"
    await db.connections.insert_one({
        "connection_id": conn_id,
        "from_user_id": user["user_id"],
        "to_user_id": req_data.to_user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": req_data.to_user_id,
        "type": "connection_request",
        "from_user_id": user["user_id"],
        "from_user_name": user.get("name", "Usuario"),
        "message": f"{user.get('name', 'Alguien')} te ha enviado una solicitud de conexion",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Solicitud enviada", "connection_id": conn_id}

@api_router.put("/connections/{connection_id}/accept")
async def accept_connection(connection_id: str, request: Request):
    """Accept a connection request"""
    user = await get_current_user(request)
    
    conn = await db.connections.find_one(
        {"connection_id": connection_id, "to_user_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    await db.connections.update_one(
        {"connection_id": connection_id},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify sender
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": conn["from_user_id"],
        "type": "connection_accepted",
        "from_user_id": user["user_id"],
        "from_user_name": user.get("name", "Usuario"),
        "message": f"{user.get('name', 'Alguien')} acepto tu solicitud de conexion",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Conexion aceptada"}

@api_router.put("/connections/{connection_id}/reject")
async def reject_connection(connection_id: str, request: Request):
    """Reject a connection request"""
    user = await get_current_user(request)
    
    conn = await db.connections.find_one(
        {"connection_id": connection_id, "to_user_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    await db.connections.update_one(
        {"connection_id": connection_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Solicitud rechazada"}

@api_router.get("/connections")
async def get_connections(request: Request):
    """Get user's accepted connections"""
    user = await get_current_user(request)
    
    connections = await db.connections.find(
        {"$or": [
            {"from_user_id": user["user_id"], "status": "accepted"},
            {"to_user_id": user["user_id"], "status": "accepted"}
        ]},
        {"_id": 0}
    ).to_list(500)
    
    # Get friend user data
    friend_ids = []
    for c in connections:
        friend_id = c["to_user_id"] if c["from_user_id"] == user["user_id"] else c["from_user_id"]
        friend_ids.append(friend_id)
    
    friends = []
    if friend_ids:
        friend_users = await db.users.find(
            {"user_id": {"$in": friend_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
        ).to_list(500)
        friends = friend_users
    
    return friends

@api_router.get("/notifications")
async def get_notifications(request: Request):
    """Get user's notifications"""
    user = await get_current_user(request)
    notifs = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifs

@api_router.put("/notifications/read")
async def mark_notifications_read(request: Request):
    """Mark all notifications as read"""
    user = await get_current_user(request)
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Notificaciones marcadas como leidas"}

@api_router.post("/transactions/shared")
async def create_shared_transaction(txn_data: SharedTransactionCreate, request: Request):
    """Create a shared transaction"""
    user = await get_current_user(request)
    
    # Verify they are connected
    conn = await db.connections.find_one({
        "$or": [
            {"from_user_id": user["user_id"], "to_user_id": txn_data.shared_with, "status": "accepted"},
            {"from_user_id": txn_data.shared_with, "to_user_id": user["user_id"], "status": "accepted"}
        ]
    })
    if not conn:
        raise HTTPException(status_code=400, detail="No estan conectados")
    
    # Create the shared transaction request
    shared_id = f"shared_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    doc = {
        "shared_id": shared_id,
        "creator_id": user["user_id"],
        "creator_name": user.get("name", "Usuario"),
        "shared_with_id": txn_data.shared_with,
        "type": txn_data.type,
        "category": txn_data.category,
        "total_amount": txn_data.amount,
        "description": txn_data.description,
        "date": txn_data.date or now.isoformat(),
        "bank": txn_data.bank,
        "creator_percentage": txn_data.my_percentage,
        "friend_percentage": txn_data.friend_percentage,
        "creator_amount": round(txn_data.amount * txn_data.my_percentage / 100),
        "friend_amount": round(txn_data.amount * txn_data.friend_percentage / 100),
        "status": "pending",
        "created_at": now.isoformat()
    }
    await db.shared_transactions.insert_one(doc)
    
    # Create creator's transaction immediately
    my_txn = Transaction(
        user_id=user["user_id"],
        type=txn_data.type,
        category=txn_data.category,
        amount=doc["creator_amount"],
        description=f"[Compartido] {txn_data.description or txn_data.category}",
        bank=txn_data.bank
    )
    my_doc = my_txn.model_dump()
    my_doc["date"] = txn_data.date or now.isoformat()
    my_doc["shared_id"] = shared_id
    await db.transactions.insert_one(my_doc)
    
    # Notify the friend
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": txn_data.shared_with,
        "type": "shared_transaction",
        "from_user_id": user["user_id"],
        "from_user_name": user.get("name", "Usuario"),
        "shared_id": shared_id,
        "message": f"{user.get('name', 'Alguien')} compartio un {txn_data.type} de ${round(txn_data.amount):,} contigo ({txn_data.friend_percentage}%)",
        "read": False,
        "created_at": now.isoformat()
    })
    
    return {"message": "Transaccion compartida creada", "shared_id": shared_id}

@api_router.put("/transactions/shared/{shared_id}/accept")
async def accept_shared_transaction(shared_id: str, request: Request):
    """Accept a shared transaction"""
    user = await get_current_user(request)
    
    shared = await db.shared_transactions.find_one(
        {"shared_id": shared_id, "shared_with_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    )
    if not shared:
        raise HTTPException(status_code=404, detail="Transaccion compartida no encontrada")
    
    # Create the friend's transaction
    now = datetime.now(timezone.utc)
    friend_txn = Transaction(
        user_id=user["user_id"],
        type=shared["type"],
        category=shared["category"],
        amount=shared["friend_amount"],
        description=f"[Compartido] {shared.get('description') or shared['category']}",
        bank=shared.get("bank")
    )
    f_doc = friend_txn.model_dump()
    f_doc["date"] = shared.get("date", now.isoformat())
    f_doc["shared_id"] = shared_id
    await db.transactions.insert_one(f_doc)
    
    await db.shared_transactions.update_one(
        {"shared_id": shared_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Notify creator
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": shared["creator_id"],
        "type": "shared_accepted",
        "from_user_id": user["user_id"],
        "from_user_name": user.get("name", "Usuario"),
        "message": f"{user.get('name', 'Alguien')} acepto la transaccion compartida",
        "read": False,
        "created_at": now.isoformat()
    })
    
    return {"message": "Transaccion aceptada"}

@api_router.put("/transactions/shared/{shared_id}/reject")
async def reject_shared_transaction(shared_id: str, request: Request):
    """Reject a shared transaction"""
    user = await get_current_user(request)
    
    shared = await db.shared_transactions.find_one(
        {"shared_id": shared_id, "shared_with_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    )
    if not shared:
        raise HTTPException(status_code=404, detail="Transaccion compartida no encontrada")
    
    await db.shared_transactions.update_one(
        {"shared_id": shared_id},
        {"$set": {"status": "rejected"}}
    )
    
    return {"message": "Transaccion rechazada"}

@api_router.get("/transactions/shared")
async def get_shared_transactions(request: Request):
    """Get pending shared transactions for user"""
    user = await get_current_user(request)
    pending = await db.shared_transactions.find(
        {"shared_with_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return pending

# ============== DOCUMENT ENDPOINTS ==============

@api_router.post("/documents/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    """Upload a document"""
    user = await get_current_user(request)
    
    # Validate file size (max 5MB)
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (max 5MB)")
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    allowed_exts = {"pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx", "txt"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido. Permitidos: {', '.join(allowed_exts)}")
    
    path = f"{APP_NAME}/documents/{user['user_id']}/{uuid.uuid4().hex[:12]}.{ext}"
    
    try:
        result = put_object(path, data, file.content_type or "application/octet-stream")
    except Exception as e:
        logger.error(f"Storage upload error: {e}")
        raise HTTPException(status_code=500, detail="Error al subir archivo")
    
    doc = {
        "file_id": f"file_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(doc)
    
    return {"message": "Documento subido", "file_id": doc["file_id"], "filename": file.filename}

@api_router.get("/documents")
async def list_documents(request: Request):
    """List user's documents"""
    user = await get_current_user(request)
    docs = await db.documents.find(
        {"user_id": user["user_id"], "is_deleted": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return docs

@api_router.get("/documents/{file_id}/download")
async def download_document(file_id: str, request: Request):
    """Download a document"""
    user = await get_current_user(request)
    
    doc = await db.documents.find_one(
        {"file_id": file_id, "user_id": user["user_id"], "is_deleted": False},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    try:
        data, content_type = get_object(doc["storage_path"])
    except Exception as e:
        logger.error(f"Storage download error: {e}")
        raise HTTPException(status_code=500, detail="Error al descargar archivo")
    
    return Response(
        content=data,
        media_type=doc.get("content_type", content_type),
        headers={"Content-Disposition": f"inline; filename=\"{doc['original_filename']}\""}
    )

@api_router.delete("/documents/{file_id}")
async def delete_document(file_id: str, request: Request):
    """Soft-delete a document"""
    user = await get_current_user(request)
    result = await db.documents.update_one(
        {"file_id": file_id, "user_id": user["user_id"]},
        {"$set": {"is_deleted": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"message": "Documento eliminado"}

@api_router.get("/admin/users/{user_id}/documents")
async def admin_list_user_documents(user_id: str, request: Request):
    """Admin lists a user's documents"""
    await get_admin_user(request)
    docs = await db.documents.find(
        {"user_id": user_id, "is_deleted": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return docs

@api_router.get("/admin/users/{user_id}/documents/{file_id}/download")
async def admin_download_user_document(user_id: str, file_id: str, request: Request):
    """Admin downloads a user's document"""
    await get_admin_user(request)
    doc = await db.documents.find_one(
        {"file_id": file_id, "user_id": user_id, "is_deleted": False},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    try:
        data, content_type = get_object(doc["storage_path"])
    except Exception as e:
        logger.error(f"Storage download error: {e}")
        raise HTTPException(status_code=500, detail="Error al descargar archivo")
    return Response(
        content=data,
        media_type=doc.get("content_type", content_type),
        headers={"Content-Disposition": f"inline; filename=\"{doc['original_filename']}\""}
    )

# ============== DEBT SNOWBALL ENDPOINT ==============

@api_router.get("/debts/snowball")
async def get_debt_snowball(request: Request):
    """Calculate snowball debt repayment schedule"""
    user = await get_current_user(request)
    debts = await db.debts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    if not debts:
        return {"debts": [], "schedule": [], "total_debt": 0, "total_min_payment": 0, "months_to_payoff": 0}
    
    # Sort by current_amount ascending (snowball: smallest first)
    active_debts = [d for d in debts if d.get("current_amount", 0) > 0]
    active_debts.sort(key=lambda d: d["current_amount"])
    
    total_debt = sum(d["current_amount"] for d in active_debts)
    total_min_payment = sum(d.get("min_payment", 0) for d in active_debts)
    
    # Build month-by-month schedule (max 120 months = 10 years)
    schedule = []
    balances = {d["debt_id"]: d["current_amount"] for d in active_debts}
    min_payments = {d["debt_id"]: d.get("min_payment", 0) for d in active_debts}
    rates = {d["debt_id"]: d.get("interest_rate", 0) / 100 / 12 for d in active_debts}  # monthly rate
    
    for month_num in range(1, 121):
        month_data = {"month": month_num}
        all_paid = True
        
        for d in active_debts:
            did = d["debt_id"]
            bal = balances[did]
            
            if bal <= 0:
                month_data[did] = {"payment": 0, "balance": 0}
                continue
            
            all_paid = False
            # Add interest
            interest = bal * rates[did]
            bal += interest
            
            # Calculate payment
            payment = min(min_payments[did], bal)
            bal = max(0, bal - payment)
            
            # If this debt is paid off, redistribute its min_payment to next smallest
            if bal <= 0 and payment > 0:
                remaining = payment - (balances[did] + interest)
                if remaining < 0:
                    remaining = 0
                # Find next unpaid debt to add the freed payment
                for nd in active_debts:
                    if nd["debt_id"] != did and balances.get(nd["debt_id"], 0) > 0:
                        min_payments[nd["debt_id"]] += min_payments[did]
                        break
                min_payments[did] = 0
            
            balances[did] = bal
            month_data[did] = {"payment": round(payment), "balance": round(bal)}
        
        schedule.append(month_data)
        
        if all_paid:
            break
    
    return {
        "debts": [{
            "debt_id": d["debt_id"],
            "name": d["name"],
            "balance": d["current_amount"],
            "min_payment": d.get("min_payment", 0),
            "interest_rate": d.get("interest_rate", 0)
        } for d in active_debts],
        "schedule": schedule,
        "total_debt": round(total_debt),
        "total_min_payment": round(total_min_payment),
        "months_to_payoff": len(schedule)
    }

# ============== VOICE TRANSACTION PARSING ==============

@api_router.post("/voice/parse-transaction")
async def parse_voice_transaction(request: Request, file: UploadFile = File(...)):
    """Receive audio, transcribe with Whisper, extract transaction data with GPT"""
    from emergentintegrations.llm.openai import OpenAISpeechToText
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json as json_mod
    import tempfile
    
    user = await get_current_user(request)
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    # Get user's categories for context
    user_cats = await db.categories.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).to_list(200)
    expense_cats = [c["name"] for c in user_cats if c["type"] == "expense"]
    income_cats = [c["name"] for c in user_cats if c["type"] == "income"]
    
    # Step 1: Transcribe audio with Whisper
    try:
        audio_data = await file.read()
        
        # Write to temp file
        suffix = ".webm"
        if file.filename:
            ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
            suffix = f".{ext}"
        
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                language="es",
                response_format="json"
            )
        
        transcript = response.text
        logger.info(f"Transcribed: {transcript}")
        
        # Cleanup
        os.unlink(tmp_path)
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error al transcribir: {str(e)}")
    
    if not transcript or len(transcript.strip()) < 3:
        return {"transcript": transcript, "parsed": None, "error": "No se detecto audio claro"}
    
    # Step 2: Parse with GPT
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        system_prompt = f"""Eres un asistente financiero que extrae datos de transacciones de texto en español.
El usuario describe una transaccion. Extrae los siguientes campos en formato JSON:
- "type": "expense" o "income"
- "category": la categoria mas cercana de las disponibles
- "amount": numero entero (en pesos colombianos COP)
- "description": descripcion breve
- "date": fecha en formato YYYY-MM-DD (hoy es {today})

Categorias de gasto disponibles: {', '.join(expense_cats) if expense_cats else 'Alimentacion, Transporte, Entretenimiento, Educacion, Salud, Ropa, Tecnologia, Servicios'}
Categorias de ingreso disponibles: {', '.join(income_cats) if income_cats else 'Salario, Mesada, Beca, Trabajo freelance, Regalo'}

Si el usuario dice "gaste" o menciona un gasto, type es "expense".
Si dice "recibi", "me pagaron", "ingreso", type es "income".
Si no menciona fecha, usa la fecha de hoy.
Si el monto no es claro, estima lo mejor posible.

Responde SOLO con JSON valido, sin texto adicional."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"voice_{user['user_id']}_{uuid.uuid4().hex[:8]}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4.1-mini")
        
        gpt_response = await chat.send_message(UserMessage(text=transcript))
        
        # Parse JSON from response
        cleaned = gpt_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            cleaned = cleaned.rsplit("```", 1)[0]
        
        parsed = json_mod.loads(cleaned)
        
        # Validate and clean
        if "amount" in parsed:
            parsed["amount"] = abs(int(float(str(parsed["amount"]).replace(",", "").replace(".", ""))))
        
        return {
            "transcript": transcript,
            "parsed": parsed
        }
        
    except Exception as e:
        logger.error(f"GPT parsing failed: {e}")
        return {
            "transcript": transcript,
            "parsed": None,
            "error": f"No se pudo interpretar: {str(e)}"
        }

# ============== AI FINANCIAL CHAT ==============

@api_router.post("/ai/chat")
async def ai_financial_chat(request: Request):
    """AI chat that can answer questions about the user's financial data"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    user = await get_current_user(request)
    body = await request.json()
    message = body.get("message", "")
    session_id = body.get("session_id", f"aichat_{user['user_id']}")
    
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    # Gather user's financial context
    now = datetime.now(timezone.utc)
    current_month = f"{now.year}-{str(now.month).zfill(2)}"
    
    transactions = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    debts = await db.debts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    pockets = await db.pockets.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    
    # Summarize financial data
    monthly_txns = [t for t in transactions if isinstance(t.get("date"), str) and t["date"].startswith(current_month)]
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    month_income = sum(t["amount"] for t in monthly_txns if t["type"] == "income")
    month_expenses = sum(t["amount"] for t in monthly_txns if t["type"] == "expense")
    
    # Category breakdown this month
    cat_breakdown = {}
    for t in monthly_txns:
        if t["type"] == "expense":
            cat_breakdown[t["category"]] = cat_breakdown.get(t["category"], 0) + t["amount"]
    
    # Recent transactions (last 20)
    recent = sorted(transactions, key=lambda x: x.get("date", ""), reverse=True)[:20]
    recent_text = "\n".join([
        f"- {t['date']}: {t['type']} {t['category']} ${t['amount']:,} {t.get('description', '')}"
        for t in recent
    ])
    
    debt_text = "\n".join([f"- {d['name']}: Total ${d['total_amount']:,}, Pendiente ${d['current_amount']:,}" for d in debts]) or "Sin deudas"
    savings_text = "\n".join([f"- {s['name']}: ${s['current_amount']:,} de ${s['target_amount']:,}" for s in savings]) or "Sin metas de ahorro"
    pocket_text = "\n".join([f"- {p['name']}: ${p['balance']:,}" for p in pockets]) or "Sin bolsillos"
    cat_text = "\n".join([f"- {cat}: ${amt:,}" for cat, amt in sorted(cat_breakdown.items(), key=lambda x: -x[1])]) or "Sin gastos este mes"
    
    system_prompt = f"""Eres un asesor financiero inteligente de LD Finance. Tienes acceso completo a los datos financieros del usuario.
Responde en español, de forma clara y util. Puedes dar recomendaciones, analizar patrones, y responder preguntas especificas.
Usa formato corto y directo. Si mencionas montos, usa formato colombiano ($ con puntos como separador de miles).

DATOS DEL USUARIO ({user.get('name', 'Usuario')}):
- Balance global: Ingresos totales ${total_income:,} - Gastos totales ${total_expenses:,} = ${total_income - total_expenses:,}
- Este mes ({current_month}): Ingresos ${month_income:,}, Gastos ${month_expenses:,}

GASTOS POR CATEGORIA ESTE MES:
{cat_text}

DEUDAS:
{debt_text}

METAS DE AHORRO:
{savings_text}

BOLSILLOS DIGITALES:
{pocket_text}

ULTIMAS 20 TRANSACCIONES:
{recent_text}

Responde la pregunta del usuario basandote en estos datos reales."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-4.1-mini")
        
        response = await chat.send_message(UserMessage(text=message))
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ============== EMAIL NOTIFICATION SYSTEM ==============

async def send_email(to_email: str, subject: str, html_body: str, bcc: list = None):
    """Send email via Resend with LD Finance branding. Admins go in BCC."""
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY")
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return False
    try:
        payload = {
            "from": "LD Finance <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_body
        }
        if bcc:
            payload["bcc"] = bcc
        resend.Emails.send(payload)
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False

def build_email_html(title: str, body_content: str):
    """Build branded LD Finance email HTML"""
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#141b2d;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:30px 0;border-bottom:2px solid #D4AF37;">
    <h1 style="color:#D4AF37;font-size:28px;margin:0;">LD Finance</h1>
    <p style="color:#9ca3af;font-size:12px;margin:5px 0 0;">Decisiones financieras inteligentes</p>
  </div>
  <div style="padding:30px 0;">
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 20px;">{title}</h2>
    <div style="color:#d1d5db;font-size:14px;line-height:1.6;">
      {body_content}
    </div>
  </div>
  <div style="border-top:1px solid #2a3444;padding:20px 0;text-align:center;">
    <p style="color:#6b7280;font-size:11px;margin:0;">Este es un mensaje automatico de LD Finance.</p>
    <p style="color:#6b7280;font-size:11px;margin:5px 0 0;">No responder a este correo.</p>
  </div>
</div>
</body></html>"""

@api_router.post("/admin/send-reminder-email")
async def admin_send_reminder_email(request: Request):
    """Admin manually sends a reminder email to a user"""
    await get_admin_user(request)
    body = await request.json()
    user_id = body.get("user_id")
    reminder_type = body.get("type", "payment")  # "payment" or "meeting"
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Get admin emails for CC
    admin_users = await db.users.find({"is_admin": True}, {"_id": 0}).to_list(10)
    
    if reminder_type == "meeting":
        meetings = await db.meetings.find(
            {"user_id": user_id, "status": "scheduled"},
            {"_id": 0}
        ).sort("date", 1).to_list(5)
        
        if not meetings:
            raise HTTPException(status_code=400, detail="No hay reuniones agendadas")
        
        meeting = meetings[0]
        html = build_email_html(
            "Recordatorio de Asesoria",
            f"""<p>Hola <strong>{target_user.get('name', '')}</strong>,</p>
            <p>Te recordamos que tienes una asesoria programada:</p>
            <div style="background:#1a2332;border:1px solid #D4AF37;border-radius:8px;padding:20px;margin:20px 0;">
              <p style="color:#D4AF37;font-size:16px;margin:0 0 5px;"><strong>{meeting['title']}</strong></p>
              <p style="color:#ffffff;margin:5px 0;">Fecha: {meeting['date']}</p>
              <p style="color:#ffffff;margin:5px 0;">Hora: {meeting['time']}</p>
            </div>
            <p>No faltes. Si necesitas reprogramar, contacta a tu asesor.</p>"""
        )
        subject = f"Recordatorio: {meeting['title']} - {meeting['date']}"
    else:
        html = build_email_html(
            "Recordatorio de Pago",
            f"""<p>Hola <strong>{target_user.get('name', '')}</strong>,</p>
            <p>Te recordamos que tienes pagos pendientes. Revisa tus recordatorios en tu perfil de LD Finance.</p>"""
        )
        subject = "Recordatorio de Pago - LD Finance"
    
    success = await send_email(
        target_user["email"], subject, html,
        bcc=[a["email"] for a in admin_users if a["email"] != target_user["email"]]
    )
    
    return {"message": "Email enviado" if success else "Error al enviar", "success": success}

# ============== ADMIN SUBSCRIPTION TRACKING ==============

@api_router.put("/admin/users/{user_id}/subscription")
async def admin_set_subscription(user_id: str, request: Request):
    """Admin sets user subscription payment day and status"""
    await get_admin_user(request)
    body = await request.json()
    
    update_fields = {}
    if "payment_day" in body:
        update_fields["subscription_payment_day"] = int(body["payment_day"])
    if "status" in body:
        update_fields["subscription_status"] = body["status"]  # "ok" or "overdue"
    if "confirmed_payment" in body and body["confirmed_payment"]:
        update_fields["subscription_status"] = "ok"
        update_fields["subscription_last_payment"] = datetime.now(timezone.utc).isoformat()
    
    if update_fields:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
    
    return {"message": "Suscripcion actualizada"}

@api_router.get("/admin/subscriptions")
async def admin_get_subscriptions(request: Request):
    """Admin gets all user subscription statuses"""
    await get_admin_user(request)
    
    users = await db.users.find(
        {"subscription_payment_day": {"$exists": True}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1,
         "subscription_payment_day": 1, "subscription_status": 1, "subscription_last_payment": 1}
    ).to_list(200)
    
    # Check overdue status
    today = datetime.now(timezone.utc)
    for u in users:
        day = u.get("subscription_payment_day", 1)
        if today.day > day + 3 and u.get("subscription_status") != "ok":
            u["subscription_status"] = "overdue"
    
    return users

# ============== CATEGORY ENDPOINTS ==============

DEFAULT_INCOME_CATEGORIES = ["Salario", "Mesada", "Beca", "Trabajo freelance", "Regalo", "Venta", "Otro ingreso"]
DEFAULT_EXPENSE_CATEGORIES = ["Alimentacion", "Transporte", "Entretenimiento", "Educacion", "Salud", "Ropa", "Tecnologia", "Servicios", "Otro gasto"]

@api_router.get("/categories")
async def get_categories(request: Request):
    """Get categories for user. Auto-seeds defaults on first access."""
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    # Check if user has been seeded
    existing = await db.categories.count_documents({"user_id": user_id})
    
    if existing == 0:
        # Seed defaults for this user
        docs = []
        for name in DEFAULT_INCOME_CATEGORIES:
            docs.append({
                "category_id": f"cat_{uuid.uuid4().hex[:12]}",
                "name": name,
                "type": "income",
                "user_id": user_id,
                "is_default": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        for name in DEFAULT_EXPENSE_CATEGORIES:
            docs.append({
                "category_id": f"cat_{uuid.uuid4().hex[:12]}",
                "name": name,
                "type": "expense",
                "user_id": user_id,
                "is_default": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        if docs:
            await db.categories.insert_many(docs)
    
    # Return only this user's categories
    user_cats = await db.categories.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(200)
    
    income_cats = [c["name"] for c in user_cats if c["type"] == "income"]
    expense_cats = [c["name"] for c in user_cats if c["type"] == "expense"]
    
    return {
        "income": income_cats,
        "expense": expense_cats,
        "custom": user_cats
    }

@api_router.post("/categories")
async def create_category(cat_data: CategoryCreate, request: Request):
    """User or admin creates a category for themselves"""
    user = await get_current_user(request)
    
    # Check for duplicate
    existing = await db.categories.find_one({
        "user_id": user["user_id"], "name": cat_data.name, "type": cat_data.type
    })
    if existing:
        raise HTTPException(status_code=400, detail="Esta categoria ya existe")
    
    cat_id = f"cat_{uuid.uuid4().hex[:12]}"
    doc = {
        "category_id": cat_id,
        "name": cat_data.name,
        "type": cat_data.type,
        "user_id": user["user_id"],
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(doc)
    return {"message": "Categoria creada", "category_id": cat_id}

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request):
    """User or admin deletes one of their own categories"""
    user = await get_current_user(request)
    
    result = await db.categories.delete_one({
        "category_id": category_id, "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    return {"message": "Categoria eliminada"}

@api_router.post("/admin/categories")
async def admin_create_category(cat_data: CategoryCreate, request: Request):
    """Admin creates a category for themselves (personal)"""
    admin = await get_admin_user(request)
    
    existing = await db.categories.find_one({
        "user_id": admin["user_id"], "name": cat_data.name, "type": cat_data.type
    })
    if existing:
        raise HTTPException(status_code=400, detail="Esta categoria ya existe")
    
    cat_id = f"cat_{uuid.uuid4().hex[:12]}"
    doc = {
        "category_id": cat_id,
        "name": cat_data.name,
        "type": cat_data.type,
        "user_id": admin["user_id"],
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(doc)
    return {"message": "Categoria creada", "category_id": cat_id}

@api_router.post("/admin/users/{user_id}/categories")
async def admin_create_user_category(user_id: str, cat_data: CategoryCreate, request: Request):
    """Admin creates a category for a specific user"""
    await get_admin_user(request)
    
    existing = await db.categories.find_one({
        "user_id": user_id, "name": cat_data.name, "type": cat_data.type
    })
    if existing:
        raise HTTPException(status_code=400, detail="Esta categoria ya existe para este usuario")
    
    cat_id = f"cat_{uuid.uuid4().hex[:12]}"
    doc = {
        "category_id": cat_id,
        "name": cat_data.name,
        "type": cat_data.type,
        "user_id": user_id,
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(doc)
    return {"message": "Categoria creada para usuario", "category_id": cat_id}

@api_router.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, cat_data: CategoryUpdate, request: Request):
    """Admin updates a category"""
    await get_admin_user(request)
    
    update_fields = {k: v for k, v in cat_data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.categories.update_one(
        {"category_id": category_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    return {"message": "Categoria actualizada"}

@api_router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, request: Request):
    """Admin deletes a category"""
    await get_admin_user(request)
    
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    return {"message": "Categoria eliminada"}

# ============== MEETING/APPOINTMENT MODELS ==============

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM (24h)
    duration_minutes: int = 60
    is_recurring: bool = False
    recurrence: Optional[str] = None  # "weekly" or "monthly"

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None

# ============== MEETING ENDPOINTS ==============

@api_router.post("/admin/users/{user_id}/meetings")
async def admin_create_meeting(user_id: str, meeting: MeetingCreate, request: Request):
    """Admin schedules a meeting for a user"""
    admin = await get_admin_user(request)
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    meeting_id = f"meet_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    doc = {
        "meeting_id": meeting_id,
        "user_id": user_id,
        "admin_id": admin["user_id"],
        "admin_name": admin.get("name", "Asesor"),
        "admin_email": admin.get("email", ""),
        "title": meeting.title,
        "description": meeting.description,
        "date": meeting.date,
        "time": meeting.time,
        "duration_minutes": meeting.duration_minutes,
        "is_recurring": meeting.is_recurring,
        "recurrence": meeting.recurrence,
        "status": "scheduled",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    await db.meetings.insert_one(doc)
    
    # Notify user
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "meeting_scheduled",
        "from_user_id": admin["user_id"],
        "from_user_name": admin.get("name", "Asesor"),
        "message": f"Tu asesor agendo una reunion: {meeting.title} para el {meeting.date} a las {meeting.time}",
        "read": False,
        "created_at": now.isoformat()
    })
    
    return {"message": "Reunion agendada", "meeting_id": meeting_id}

@api_router.get("/admin/users/{user_id}/meetings")
async def admin_get_user_meetings(user_id: str, request: Request):
    """Admin gets all meetings for a user"""
    await get_admin_user(request)
    meetings = await db.meetings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", 1).to_list(100)
    return meetings

@api_router.put("/admin/meetings/{meeting_id}")
async def admin_update_meeting(meeting_id: str, update: MeetingUpdate, request: Request):
    """Admin updates a meeting"""
    await get_admin_user(request)
    
    update_fields = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reunion no encontrada")
    
    # Notify user of update
    meeting = await db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
    if meeting:
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": meeting["user_id"],
            "type": "meeting_updated",
            "message": f"Tu reunion '{meeting.get('title', '')}' fue actualizada",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Reunion actualizada"}

@api_router.delete("/admin/meetings/{meeting_id}")
async def admin_cancel_meeting(meeting_id: str, request: Request):
    """Admin cancels a meeting"""
    await get_admin_user(request)
    
    meeting = await db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunion no encontrada")
    
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify user
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": meeting["user_id"],
        "type": "meeting_cancelled",
        "message": f"Tu reunion '{meeting.get('title', '')}' fue cancelada",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Reunion cancelada"}

@api_router.get("/meetings")
async def get_my_meetings(request: Request):
    """Get upcoming meetings for current user"""
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    meetings = await db.meetings.find(
        {"user_id": user["user_id"], "status": "scheduled", "date": {"$gte": today}},
        {"_id": 0}
    ).sort("date", 1).to_list(50)
    return meetings

# ============== REMINDER/SUBSCRIPTION MODELS ==============

class ReminderCreate(BaseModel):
    name: str
    amount: Optional[float] = None
    recurrence: str  # "monthly", "weekly", "biweekly", "yearly"
    due_day: int  # Day of month (1-31)
    description: Optional[str] = None

class ReminderUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    recurrence: Optional[str] = None
    due_day: Optional[int] = None
    description: Optional[str] = None

# ============== REMINDER ENDPOINTS ==============

@api_router.get("/reminders")
async def get_reminders(request: Request):
    """Get all reminders for current user"""
    user = await get_current_user(request)
    reminders = await db.reminders.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("due_day", 1).to_list(100)
    
    # Check which are due soon (within 3 days)
    today = datetime.now(timezone.utc)
    for r in reminders:
        due_day = r.get("due_day", 1)
        days_until = due_day - today.day
        if days_until < 0:
            days_until += 30  # approximate
        r["days_until_due"] = days_until
        r["is_due_soon"] = days_until <= 3
    
    return reminders

@api_router.post("/reminders")
async def create_reminder(reminder: ReminderCreate, request: Request):
    """Create a new reminder"""
    user = await get_current_user(request)
    
    reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
    doc = {
        "reminder_id": reminder_id,
        "user_id": user["user_id"],
        "name": reminder.name,
        "amount": reminder.amount,
        "recurrence": reminder.recurrence,
        "due_day": reminder.due_day,
        "description": reminder.description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reminders.insert_one(doc)
    return {"message": "Recordatorio creado", "reminder_id": reminder_id}

@api_router.put("/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, update: ReminderUpdate, request: Request):
    """Update a reminder"""
    user = await get_current_user(request)
    
    update_fields = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.reminders.update_one(
        {"reminder_id": reminder_id, "user_id": user["user_id"]},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    return {"message": "Recordatorio actualizado"}

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, request: Request):
    """Delete a reminder"""
    user = await get_current_user(request)
    result = await db.reminders.delete_one(
        {"reminder_id": reminder_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    return {"message": "Recordatorio eliminado"}

# ============== ADVISOR MESSAGES ENDPOINTS ==============

@api_router.get("/messages")
async def get_messages(request: Request, month: Optional[str] = None):
    """Get messages for current user for a specific month"""
    user = await get_current_user(request)
    
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{str(now.month).zfill(2)}"
    
    messages = await db.advisor_messages.find(
        {"user_id": user["user_id"], "month": month},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    return messages

@api_router.post("/messages")
async def create_message(msg_data: MessageCreate, request: Request):
    """User sends a message to advisor"""
    user = await get_current_user(request)
    
    now = datetime.now(timezone.utc)
    month = msg_data.month or f"{now.year}-{str(now.month).zfill(2)}"
    
    doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "sender_id": user["user_id"],
        "sender_name": user.get("name", "Usuario"),
        "sender_role": "user",
        "content": msg_data.content,
        "is_task": msg_data.is_task,
        "is_completed": False,
        "month": month,
        "created_at": now.isoformat()
    }
    await db.advisor_messages.insert_one(doc)
    return {"message": "Mensaje enviado", "message_id": doc["message_id"]}

@api_router.put("/messages/{message_id}/complete")
async def toggle_message_complete(message_id: str, request: Request):
    """Toggle task completion status"""
    user = await get_current_user(request)
    
    msg = await db.advisor_messages.find_one(
        {"message_id": message_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not msg:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    
    new_status = not msg.get("is_completed", False)
    await db.advisor_messages.update_one(
        {"message_id": message_id},
        {"$set": {"is_completed": new_status}}
    )
    return {"message": "Estado actualizado", "is_completed": new_status}

@api_router.get("/admin/users/{user_id}/messages")
async def admin_get_user_messages(user_id: str, request: Request, month: Optional[str] = None):
    """Admin gets messages for a specific user"""
    await get_admin_user(request)
    
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{str(now.month).zfill(2)}"
    
    messages = await db.advisor_messages.find(
        {"user_id": user_id, "month": month},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    return messages

@api_router.post("/admin/users/{user_id}/messages")
async def admin_send_message(user_id: str, msg_data: MessageCreate, request: Request):
    """Admin sends a message/task to a user"""
    admin = await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    month = msg_data.month or f"{now.year}-{str(now.month).zfill(2)}"
    
    doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "sender_id": admin["user_id"],
        "sender_name": admin.get("name", "Asesor"),
        "sender_role": "admin",
        "content": msg_data.content,
        "is_task": msg_data.is_task,
        "is_completed": False,
        "month": month,
        "created_at": now.isoformat()
    }
    await db.advisor_messages.insert_one(doc)
    return {"message": "Mensaje enviado", "message_id": doc["message_id"]}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed (will retry on first use): {e}")
    # Start background subscription reminder cron
    import asyncio
    asyncio.create_task(subscription_reminder_cron())

async def subscription_reminder_cron():
    """Background task: sends reminder emails 3 days before subscription due date"""
    import asyncio
    await asyncio.sleep(30)  # Initial delay after startup
    while True:
        try:
            today = datetime.now(timezone.utc)
            due_day_target = today.day + 3
            
            # Handle month overflow
            import calendar
            max_day = calendar.monthrange(today.year, today.month)[1]
            if due_day_target > max_day:
                due_day_target = due_day_target - max_day
            
            users_due = await db.users.find(
                {"subscription_payment_day": due_day_target},
                {"_id": 0}
            ).to_list(200)
            
            admin_users = await db.users.find({"is_admin": True}, {"_id": 0, "email": 1}).to_list(10)
            admin_bcc = [a["email"] for a in admin_users]
            
            for u in users_due:
                if u.get("subscription_status") == "ok":
                    continue
                
                reminder_key = f"sub_reminder_{u['user_id']}_{today.strftime('%Y-%m-%d')}"
                already_sent = await db.notifications.find_one({"notification_id": reminder_key})
                if already_sent:
                    continue
                
                html = build_email_html(
                    "Recordatorio de Pago de Suscripcion",
                    f"""<p>Hola <strong>{u.get('name', '')}</strong>,</p>
                    <p>Te recordamos que tu pago de suscripcion vence en <strong>3 dias</strong> (dia {u.get('subscription_payment_day')} de este mes).</p>
                    <p>Por favor realiza tu pago a tiempo para evitar interrupciones.</p>
                    <div style="background:#D4AF37;border-radius:8px;padding:15px;margin:20px 0;text-align:center;">
                      <p style="color:#141b2d;font-weight:bold;margin:0;">Fecha limite: Dia {u.get('subscription_payment_day')}</p>
                    </div>"""
                )
                
                bcc_list = [e for e in admin_bcc if e != u.get("email")]
                await send_email(u["email"], "Recordatorio: Tu suscripcion vence pronto - LD Finance", html, bcc=bcc_list)
                
                await db.notifications.insert_one({
                    "notification_id": reminder_key,
                    "user_id": u["user_id"],
                    "type": "subscription_reminder_sent",
                    "message": "Recordatorio automatico de suscripcion enviado",
                    "read": False,
                    "created_at": today.isoformat()
                })
                logger.info(f"Subscription reminder sent to {u.get('email')}")
            
        except Exception as e:
            logger.error(f"Subscription cron error: {e}")
        
        await asyncio.sleep(86400)  # Run every 24 hours

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
