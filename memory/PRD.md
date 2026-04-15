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
- **Storage:** Emergent Object Storage (documents)

## Implemented Features

### Phase 1 - MVP
- Google OAuth authentication
- 4-step diagnostic survey (with formatted CurrencyInput)
- Income/expense CRUD with monthly view
- Debt management with progress bars + Snowball method
- Savings goals with contributions
- Before/after financial reports
- Dashboard with monthly navigation
- Admin panel (view users, add transactions, toggle admin, delete users)
- LD Finance dark theme branding (#141b2d, #D4AF37, #FFF)

### Phase 2 - Features
- Animated Logo (LD -> Holdings -> Finance sequence)
- Custom Categories per user (personal, not global)
- Advisor Chat (monthly messages/tasks on Dashboard)
- Budget Comparison (Proyectado vs Real for expenses)
- Simplified Debt Form (auto-calc min_payment from installments)
- CurrencyInput Component (formatted numbers across all inputs)

### Phase 3 - V2.0 (March 24, 2026)
1. Dashboard auto-scroll fix
2. Slower logo animation
3. Income budget comparison
4. Bank management
5. Admin full access (impersonation with session cookie swap)
6. Document upload (Object Storage)
7. Benefits section
8. CurrencyInput in survey
9. Social network (Community) - profiles, connections, shared transactions
10. Footer with animated logo

### Phase 4 - V2.1 (March 24, 2026)
11. Dashboard budget tabs (merged expense/income)
12. Admin Impersonation (full frontend with banner + session management)
13. Emails removed from Community
14. Mobile responsive fixes (dialog scroll, number overflow, tooltip colors)
15. Admin stats cleanup (relevant metrics only)
16. Categories now personal per user (with delete capability for all including defaults)

### Phase 5 - V3.0 Digital Pockets (April 2026)
17. **Digital Pockets (Bolsillos)** — Create, fund from available balance, delete. Permanent (balance accumulates). Independent from categories.
18. **Floating Transaction Button** — Fixed bottom-right gold button on Dashboard opens transaction dialog directly (no navigation to Transactions page).
19. **Transactions → Savings/Debts** — When creating expense transaction, can optionally associate with a savings goal (increments) or debt (decrements). Also can select pocket to deduct from.
20. **Scorecards with Projected** — Income/Expenses/Balance scorecards now show projected/expected amounts as smaller text below real amounts.
21. **Budget Comparison Table** — Changed from card+progress bars to compact table format. Shows ALL user categories (no add/remove). Only edit budget amount. Totals row.

## DB Collections
- users, transactions, debts, savings_goals, surveys, user_sessions
- categories, advisor_messages, budgets, banks, documents
- connections, notifications, shared_transactions
- **pockets** (NEW: pocket_id, user_id, name, balance, created_at)

## Key API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout
- Pockets: /api/pockets (GET/POST), /api/pockets/{id}/fund (POST), /api/pockets/{id} (DELETE)
- Transactions: /api/transactions (GET/POST) — now supports pocket_id, savings_goal_id, debt_id
- Budgets: /api/budgets/comparison now returns ALL user categories
- Dashboard: /api/dashboard now includes pockets, debts, savings_goals arrays
- Categories: /api/categories (GET/POST/DELETE) — personal per user
- Admin: /api/admin/impersonate/{user_id}, /api/admin/stop-impersonation

## Configuration
- Admin email: samuelolarte22@gmail.com
- Currency: COP
- Language: Spanish

## Backlog
- [ ] Refactoring: Split server.py into routers and models
- [ ] Export reports as PDF
- [ ] Recurring transactions
- [ ] Gamification social (ranking entre amigos)
- [ ] Notificaciones automaticas (alertas de presupuesto al 80%)
- [ ] Resumen semanal por email
