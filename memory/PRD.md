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
- Custom Categories per user (admin CRUD)
- Advisor Chat (monthly messages/tasks on Dashboard)
- Budget Comparison (Proyectado vs Real for expenses)
- Simplified Debt Form (auto-calc min_payment from installments)
- CurrencyInput Component (formatted numbers across all inputs)

### Phase 3 - V2.0 (March 24, 2026)
1. **Dashboard auto-scroll fix** - Chat no longer steals scroll on load
2. **Slower logo animation** - 800ms/1800ms/3600ms/4600ms/5600ms phases
3. **Income budget comparison** - Esperado vs Real for income categories
4. **Bank management** - Add/delete banks in Profile, optional bank selector in transactions
5. **Admin full access** - View/edit user dashboards, transactions, debts, savings
6. **Document upload** - Object storage integration for certificates/documents in Profile
7. **Benefits section** - Pagano 10%, 3 Esencias 10%, Opticas Visoc 15%
8. **CurrencyInput in survey** - All money fields use formatted input
9. **Social network (Community)** - Public/private profiles, user discovery, connection requests (send/accept/reject/resend), shared transactions with % split and notifications
10. **Footer** - Animated logo + "Decisiones financieras inteligentes, resultados reales"

### Phase 4 - V2.1 (March 24, 2026)
11. **Dashboard budget tabs** - Merged expense/income budget cards into single tabbed card (Gastos/Ingresos)
12. **Admin Impersonation (Vista de Asesor)** - Full frontend implementation: "Ver como usuario" button in Admin panel, impersonation banner, session management, navigate as user with editing capabilities

## DB Collections
- users, transactions, debts, savings_goals, surveys, user_sessions
- categories, advisor_messages, budgets, banks, documents
- connections, notifications, shared_transactions

## Key API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout
- Profile: /api/profile/visibility
- Banks: /api/banks (CRUD)
- Documents: /api/documents (upload/list/download/delete)
- Budgets: /api/budgets (CRUD), /api/budgets/comparison?budget_type=
- Categories: /api/categories, /api/admin/categories (CRUD)
- Messages: /api/messages, /api/admin/users/{id}/messages
- Community: /api/community/users
- Connections: /api/connections (CRUD with accept/reject)
- Notifications: /api/notifications, /api/notifications/read
- Shared Transactions: /api/transactions/shared (create/accept/reject)
- Admin: Full view/edit access to user data
- Admin Impersonation: /api/admin/impersonate/{user_id}, /api/admin/stop-impersonation

## Configuration
- Admin email: samuelolarte22@gmail.com
- Currency: COP
- Language: Spanish

## Backlog
- [ ] Export reports as PDF
- [ ] Email notifications for debt due dates
- [ ] Recurring transactions
- [ ] Gamification social (ranking entre amigos)
- [ ] Notificaciones automaticas (alertas de presupuesto al 80%)
- [ ] Resumen semanal por email
- [ ] Refactoring: Split server.py into routers and models
