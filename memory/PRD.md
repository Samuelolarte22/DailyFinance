# LD Finance - PRD (Product Requirements Document)

## Project Overview
**Title:** Evaluacion de un sistema de gestion de informacion financiera para la organizacion de gastos en estudiantes universitarios: estudio en una beta cerrada
**Institution:** Universidad Ean - Facultad de Ingenieria - Programa Ingenieria en Sistemas
**App Name:** LD Finance
**Problem Statement:** Como puede un sistema de gestion de informacion ayudar a las personas a entender y aprender sobre las finanzas personales y gestion de deudas?

## User Personas
1. **Primary:** Estudiantes universitarios y profesionales que quieren gestionar sus finanzas
2. **Admin:** Asesores financieros que supervisan y asesoran a los usuarios
3. **Secondary:** Investigadores evaluando el impacto del sistema

## Core Requirements
- Autenticacion con Google Login (Emergent Auth)
- Encuesta diagnostica inicial sobre manejo de gastos, deudas y ahorro
- Modulo de registro de ingresos y egresos (vista mensual)
- Control y seguimiento de deudas (vista global)
- Metas de ahorro con progreso visual (vista global)
- Reportes comparativos (antes/despues) del uso del sistema
- Panel de administracion para asesores
- Diseno profesional con paleta: azul oscuro (#141b2d), dorado (#D4AF37), blanco (#FFF)

## Design System
- Color palette: #141b2d (dark navy), #D4AF37 (gold), #FFFFFF (white) - 60/30/10 rule
- Playfair Display for headings, Inter for body, JetBrains Mono for numbers
- Glass-morphism, gold gradients, card hover effects
- Dark theme throughout

## Tech Stack
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Backend:** FastAPI, Motor (async MongoDB)
- **Database:** MongoDB
- **Authentication:** Emergent Google OAuth

## DB Schema
- **users:** user_id, email, name, picture, has_completed_survey, is_admin, created_at
- **transactions:** transaction_id, user_id, type, category, amount, description, date
- **debts:** debt_id, user_id, name, total_amount, current_amount, interest_rate, due_date
- **savings_goals:** goal_id, user_id, name, target_amount, current_amount, target_date
- **surveys:** survey_id, user_id, monthly_income, financial_knowledge, ...
- **user_sessions:** user_id, session_token, expires_at, created_at

## Key API Endpoints
- /api/auth/session, /api/auth/me, /api/auth/logout
- /api/survey
- /api/dashboard
- /api/transactions (CRUD)
- /api/debts (CRUD), /api/debts/{id}/payment
- /api/savings (CRUD), /api/savings/{id}/contribute
- /api/reports
- /api/admin/summary, /api/admin/users, /api/admin/users/{id}
- /api/admin/users/{id}/toggle-admin, /api/admin/users/{id}/transactions
- DELETE /api/admin/users/{id}

## What's Been Implemented (March 23, 2026)

### Backend
- Authentication endpoints with Emergent Google OAuth
- User management with session tokens
- Diagnostic survey CRUD
- Transactions CRUD (income/expenses)
- Debts CRUD with payment tracking
- Savings goals CRUD with contributions
- Financial reports with before/after comparison
- Dashboard summary endpoint
- Admin panel: view users, add transactions, toggle admin, delete users
- Admin role persistence bug FIXED (is_admin preserved from DB on re-login)

### Frontend
- Landing page with "LD Finance" branding, dark theme
- Google OAuth authentication flow
- 4-step diagnostic survey onboarding
- Dashboard with monthly view selector
- Transactions page with monthly navigation
- Debts page with progress bars and payment modal
- Savings page with circular progress indicators
- Reports page with before/after comparison (dark theme charts)
- Admin page with user management, dark theme dialogs
- Profile page
- Responsive Layout with conditional admin nav link

## Prioritized Backlog

### P0 (Done)
- [x] User authentication
- [x] Diagnostic survey
- [x] Income/expense tracking
- [x] Debt management
- [x] Savings goals
- [x] Before/after reports
- [x] Admin panel (view users, transactions, toggle admin, delete users)
- [x] LD Finance rebranding with dark theme
- [x] Monthly view for income/expenses
- [x] Admin role persistence bug fix
- [x] Deployment readiness

### P1 (High Priority - Future)
- [ ] Export financial reports as PDF
- [ ] Email notifications for debt due dates
- [ ] Budget planning tool
- [ ] Recurring transactions

### P2 (Medium Priority - Future)
- [ ] Categories customization
- [ ] Multi-currency support
- [ ] Data import from bank statements
- [ ] Financial tips/education module
- [ ] Custom message on Landing Page before login

## Configuration
- Admin email: samuelolarte22@gmail.com (in ADMIN_EMAILS env var)
- Currency: COP (Colombian Peso)
- Language: Spanish
