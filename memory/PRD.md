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

### Phase 2 - New Features (Complete - March 23)
- **Animated Logo:** LD -> Holdings slides out -> retracts -> Finance slides out. Used in Landing page (large) and Layout navbar (small)
- **Custom Categories:** Admin can create/edit/delete global and user-specific transaction categories. Default categories preserved. Dynamic categories loaded in Transactions and Admin forms.
- **Advisor Chat:** Monthly-scoped chat between user and financial advisor on Dashboard. Messages with task support (checkbox to mark complete, line-through when done). Admin can view and respond from Admin panel. Data persists per month.
- **Debt Snowball Method:** Enhanced debt module with min_payment, interest_rate fields. Automatic month-by-month amortization calculation. 3-tab view: Resumen (pie chart + summary), Bola de Nieve (schedule table), Mis Deudas (list). Payment redistribution when debts paid off.

### Bug Fixes
- Admin role persistence: is_admin preserved from DB on re-login (not overwritten by ADMIN_EMAILS env var)
- Reports.jsx and Admin.jsx updated to dark theme

## DB Schema
- **users:** user_id, email, name, picture, has_completed_survey, is_admin, created_at
- **transactions:** transaction_id, user_id, type, category, amount, description, date
- **debts:** debt_id, user_id, name, total_amount, current_amount, interest_rate, min_payment, due_date
- **savings_goals:** goal_id, user_id, name, target_amount, current_amount, deadline
- **surveys:** survey_id, user_id, monthly_income, financial_knowledge, ...
- **categories:** category_id, name, type (income/expense), user_id (null=global)
- **advisor_messages:** message_id, user_id, sender_id, sender_name, sender_role, content, is_task, is_completed, month, created_at
- **user_sessions:** user_id, session_token, expires_at

## Key API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout
- Survey: /api/survey
- Dashboard: /api/dashboard
- Transactions: /api/transactions (CRUD)
- Debts: /api/debts (CRUD), /api/debts/{id}/pay, /api/debts/snowball
- Savings: /api/savings (CRUD), /api/savings/{id}/contribute
- Reports: /api/reports
- Categories: /api/categories, /api/admin/categories (CRUD), /api/admin/users/{id}/categories
- Messages: /api/messages, /api/messages/{id}/complete, /api/admin/users/{id}/messages
- Admin: /api/admin/summary, /api/admin/users, /api/admin/users/{id}, /api/admin/users/{id}/toggle-admin, DELETE /api/admin/users/{id}

## Prioritized Backlog

### P0 (Done)
- [x] All MVP features
- [x] Animated logo
- [x] Custom categories
- [x] Advisor chat with tasks
- [x] Debt snowball method
- [x] Admin bug fix

### P1 (Future)
- [ ] Export financial reports as PDF
- [ ] Email notifications for debt due dates
- [ ] Budget planning tool
- [ ] Recurring transactions

### P2 (Future)
- [ ] Multi-currency support
- [ ] Data import from bank statements
- [ ] Financial tips/education module
- [ ] Custom domain setup

## Configuration
- Admin email: samuelolarte22@gmail.com
- Currency: COP (Colombian Peso)
- Language: Spanish
