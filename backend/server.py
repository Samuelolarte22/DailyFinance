from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
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

class TransactionCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[str] = None

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
    """Create a new transaction"""
    user = await get_current_user(request)
    
    txn = Transaction(
        user_id=user["user_id"],
        **txn_data.model_dump(exclude={"date"})
    )
    
    if txn_data.date:
        txn.date = datetime.fromisoformat(txn_data.date.replace('Z', '+00:00'))
    
    doc = txn.model_dump()
    doc["date"] = doc["date"].isoformat()
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

# ============== REPORTS ENDPOINT ==============

@api_router.get("/reports")
async def get_reports(request: Request):
    """Get financial reports with before/after comparison"""
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
    
    return {
        "before": before,
        "after": after,
        "monthly_breakdown": monthly_data,
        "transactions_count": len(transactions),
        "debts_count": len(debts),
        "savings_goals_count": len(savings)
    }

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
    
    recent_transactions = transactions[:5]
    
    return {
        "balance": balance,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_debt": total_debt,
        "total_savings": total_savings,
        "recent_transactions": recent_transactions,
        "all_transactions": transactions,
        "debts_count": len(debts),
        "savings_goals_count": len(savings)
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
    """Create or update a budget for a category"""
    user = await get_current_user(request)
    
    existing = await db.budgets.find_one(
        {"user_id": user["user_id"], "category": budget_data.category},
        {"_id": 0}
    )
    
    if existing:
        await db.budgets.update_one(
            {"user_id": user["user_id"], "category": budget_data.category},
            {"$set": {"projected_amount": budget_data.projected_amount}}
        )
        return {"message": "Presupuesto actualizado", "budget_id": existing["budget_id"]}
    
    budget_id = f"bud_{uuid.uuid4().hex[:12]}"
    doc = {
        "budget_id": budget_id,
        "user_id": user["user_id"],
        "category": budget_data.category,
        "projected_amount": budget_data.projected_amount,
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
async def get_budget_comparison(request: Request, month: Optional[str] = None):
    """Get budget vs actual spending for each category in a month"""
    user = await get_current_user(request)
    
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{str(now.month).zfill(2)}"
    
    # Get budgets
    budgets = await db.budgets.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    budget_map = {b["category"]: b for b in budgets}
    
    # Get expense transactions for the month
    all_txns = await db.transactions.find(
        {"user_id": user["user_id"], "type": "expense"},
        {"_id": 0}
    ).to_list(5000)
    
    # Filter by month and group by category
    category_totals = {}
    for txn in all_txns:
        txn_month = txn["date"][:7]
        if txn_month == month:
            cat = txn["category"]
            category_totals[cat] = category_totals.get(cat, 0) + txn["amount"]
    
    # Build comparison
    comparison = []
    all_categories = set(list(budget_map.keys()) + list(category_totals.keys()))
    
    for cat in sorted(all_categories):
        projected = budget_map.get(cat, {}).get("projected_amount", 0)
        actual = category_totals.get(cat, 0)
        budget_id = budget_map.get(cat, {}).get("budget_id")
        comparison.append({
            "category": cat,
            "projected": projected,
            "actual": round(actual),
            "difference": round(projected - actual),
            "over_budget": actual > projected if projected > 0 else False,
            "budget_id": budget_id
        })
    
    return comparison

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

# ============== CATEGORY ENDPOINTS ==============

DEFAULT_INCOME_CATEGORIES = ["Salario", "Mesada", "Beca", "Trabajo freelance", "Regalo", "Venta", "Otro ingreso"]
DEFAULT_EXPENSE_CATEGORIES = ["Alimentacion", "Transporte", "Entretenimiento", "Educacion", "Salud", "Ropa", "Tecnologia", "Servicios", "Otro gasto"]

@api_router.get("/categories")
async def get_categories(request: Request):
    """Get all categories for user (defaults + custom global + custom per-user)"""
    user = await get_current_user(request)
    
    # Fetch custom categories (global ones + user-specific ones)
    custom_cats = await db.categories.find(
        {"$or": [{"user_id": None}, {"user_id": user["user_id"]}]},
        {"_id": 0}
    ).to_list(200)
    
    # Build combined lists
    income_cats = list(DEFAULT_INCOME_CATEGORIES)
    expense_cats = list(DEFAULT_EXPENSE_CATEGORIES)
    
    for cat in custom_cats:
        if cat["type"] == "income" and cat["name"] not in income_cats:
            income_cats.append(cat["name"])
        elif cat["type"] == "expense" and cat["name"] not in expense_cats:
            expense_cats.append(cat["name"])
    
    return {
        "income": income_cats,
        "expense": expense_cats,
        "custom": custom_cats
    }

@api_router.post("/admin/categories")
async def admin_create_category(cat_data: CategoryCreate, request: Request):
    """Admin creates a global category"""
    await get_admin_user(request)
    
    cat_id = f"cat_{uuid.uuid4().hex[:12]}"
    doc = {
        "category_id": cat_id,
        "name": cat_data.name,
        "type": cat_data.type,
        "user_id": None,  # global
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(doc)
    return {"message": "Categoria creada", "category_id": cat_id}

@api_router.post("/admin/users/{user_id}/categories")
async def admin_create_user_category(user_id: str, cat_data: CategoryCreate, request: Request):
    """Admin creates a category for a specific user"""
    await get_admin_user(request)
    
    cat_id = f"cat_{uuid.uuid4().hex[:12]}"
    doc = {
        "category_id": cat_id,
        "name": cat_data.name,
        "type": cat_data.type,
        "user_id": user_id,
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
