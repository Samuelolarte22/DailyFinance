# LD Finance - PRD (Product Requirements Document)

## Project Overview
**Title:** Evaluacion de un sistema de gestion de informacion financiera  
**App Name:** LD Finance (rama de LD Holdings)  
**Institution:** Universidad Ean  

## Tech Stack
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Backend:** FastAPI, Motor (async MongoDB)
- **Database:** MongoDB
- **Authentication:** Emergent Google OAuth

## What's Been Implemented (March 23, 2026)

### Phase 1 - MVP (Complete)
- Google OAuth authentication
- 4-step diagnostic survey onboarding
- Income/expense CRUD with monthly view
- Debt management with progress bars
- Savings goals with contributions
- Before/after financial reports
- Dashboard with monthly navigation
- Admin panel (view users, add transactions, toggle admin, delete users)
- LD Finance dark theme branding (#141b2d, #D4AF37, #FFF)

### Phase 2 - Features (Complete)
- Animated Logo (LD -> Holdings -> Finance sequence)
- Custom Categories per user (admin CRUD)
- Advisor Chat (monthly messages/tasks on Dashboard)
- Debt Snowball Method (pie chart, month-by-month table)

### Phase 3 - Enhancements (Complete - March 23)
- **Budget Comparison (Proyectado vs Real):** Users set budget per expense category. Dashboard shows actual vs projected with green/red indicators per month. Add/edit/delete budgets inline.
- **Simplified Debt Form:** Replaced min_payment input with num_installments. System auto-calculates min_payment using PMT formula: P * [r(1+r)^n] / [(1+r)^n - 1]. Shows calculated payment preview in real-time.
- **CurrencyInput Component:** All money inputs across the app now auto-format with dot thousand separators (1.000.000 Colombian format). Applied to Transactions, Savings, Debts, Dashboard budgets, Admin.

### Bug Fixes
- Admin role persistence: is_admin preserved from DB on re-login
- Reports.jsx and Admin.jsx updated to dark theme

## DB Schema
- **users:** user_id, email, name, picture, has_completed_survey, is_admin, created_at
- **transactions:** transaction_id, user_id, type, category, amount, description, date
- **debts:** debt_id, user_id, name, total_amount, current_amount, interest_rate, num_installments, min_payment, due_date
- **savings_goals:** goal_id, user_id, name, target_amount, current_amount, deadline
- **surveys:** survey_id, user_id, monthly_income, financial_knowledge, ...
- **categories:** category_id, name, type (income/expense), user_id (null=global)
- **advisor_messages:** message_id, user_id, sender_id, sender_name, sender_role, content, is_task, is_completed, month, created_at
- **budgets:** budget_id, user_id, category, projected_amount, created_at
- **user_sessions:** user_id, session_token, expires_at

## Key API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout
- Survey: /api/survey
- Dashboard: /api/dashboard
- Transactions: /api/transactions (CRUD)
- Debts: /api/debts (CRUD), /api/debts/{id}/pay, /api/debts/snowball
- Savings: /api/savings (CRUD), /api/savings/{id}/contribute
- Reports: /api/reports
- Budgets: /api/budgets (CRUD), /api/budgets/comparison
- Categories: /api/categories, /api/admin/categories (CRUD)
- Messages: /api/messages, /api/messages/{id}/complete, /api/admin/users/{id}/messages
- Admin: /api/admin/summary, /api/admin/users, /api/admin/users/{id}, toggle-admin, delete

## Prioritized Backlog

### P0 (Done)
- [x] All MVP + Phase 2 + Phase 3 features

### P1 (Future)
- [ ] Export financial reports as PDF
- [ ] Email notifications for debt due dates
- [ ] Budget planning tool with alerts
- [ ] Recurring transactions

### P2 (Future)
- [ ] Multi-currency support
- [ ] Data import from bank statements
- [ ] Financial tips/education module

## Configuration
- Admin email: samuelolarte22@gmail.com
- Currency: COP (Colombian Peso)
- Language: Spanish
