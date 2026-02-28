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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

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
    due_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DebtCreate(BaseModel):
    name: str
    total_amount: float
    current_amount: float
    interest_rate: Optional[float] = 0
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

# ============== AUTH HELPERS ==============

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

# ============== AUTH ENDPOINTS ==============

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
    else:
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "has_completed_survey": False,
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
    """Create a new debt"""
    user = await get_current_user(request)
    
    debt = Debt(user_id=user["user_id"], **debt_data.model_dump())
    doc = debt.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.debts.insert_one(doc)
    
    return {"message": "Debt created", "debt_id": debt.debt_id}

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
        "debts_count": len(debts),
        "savings_goals_count": len(savings)
    }

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "StudentFinance API", "status": "healthy"}

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
