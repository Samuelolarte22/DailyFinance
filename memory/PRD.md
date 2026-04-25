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

### Phase 1-5 (Previous sessions)
- Google OAuth, survey, CRUD transactions/debts/savings
- Admin panel with impersonation, categories, advisor chat
- Digital pockets, floating transaction button, budget comparison
- Dark/light theme, community, social connections

### Phase 6 - V4.0 Analytics & Tools (April 16, 2026)
22. Shared Transactions restored in FloatingTransaction
23. Expense Pie Chart on Dashboard
24. Debt vs Savings Timeline Chart in Reports
25. Quick Calculator in transaction forms
26. Meeting/Appointment Scheduling (admin to user, Google Calendar link)

### Phase 7 - V5.0 Improvements Batch (April 25, 2026)
27. **Fixed Header** — Changed from sticky to fixed positioning for Safari/Mac compatibility
28. **Light Mode Hover Fixes** — CSS overrides for dropdown/select hover states
29. **Favicon** — SVG + PNG with LD Finance branding
30. **Date Picker Fix** — Responsive/mobile calendar fix with z-index and portal behavior
31. **Monthly Balance Card** — "Disponible del mes" shows monthly balance, global in small text
32. **Budget Per Month** — Backend stores month field, budgets are month-specific (not global)
33. **Enter Key Saves Budget** — onKeyDown support in CurrencyInput fields
34. **Budget Comments** — Tooltip on hover (like Excel), recurring option across months
35. **Gasto Real por Mes Table** — Annual 12-month overview (Ingresos, Gastos, Ahorro, Deudas, Neto) in Dashboard
36. **Stacked Distribution Chart** — % breakdown per month (Ingresos, Gastos, Ahorro, Deudas) in Reports
37. **Edit Savings/Debts Amount** — Click to edit current_amount without deleting/recreating
38. **Google Calendar Admin Attendee** — Calendar link includes admin email
39. **Payment Reminders/Subscriptions** — In Profile: name, amount, recurrence, due day, "due soon" alerts
40. **Voice Transaction Input** — Microphone button in FloatingTransaction dialog. Records audio → Whisper STT → GPT-4.1-mini extracts type/category/amount/description/date → auto-fills form. Spanish language.

## DB Collections
- users, transactions, debts, savings_goals, surveys, user_sessions
- categories, advisor_messages, budgets (now with month field), banks, documents
- connections, notifications, shared_transactions
- pockets, meetings
- **reminders** (reminder_id, user_id, name, amount, recurrence, due_day, description, is_active)

## Key API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout
- Pockets: /api/pockets (GET/POST), /api/pockets/{id}/fund, /api/pockets/{id} (DELETE)
- Transactions: /api/transactions (GET/POST/DELETE)
- Shared: /api/transactions/shared (POST), accept/reject
- Budgets: /api/budgets (POST with month), /api/budgets/comparison (month-specific)
- Dashboard: /api/dashboard
- Reports: /api/reports (annual_overview, stacked_chart), /api/reports/timeline
- Meetings: /api/admin/users/{id}/meetings, /api/admin/meetings/{id}, /api/meetings
- Reminders: /api/reminders (GET/POST), /api/reminders/{id} (PUT/DELETE)
- Edit: /api/savings/{id}/edit, /api/debts/{id}/edit (PUT current_amount)

## Configuration
- Admin email: samuelolarte22@gmail.com
- Currency: COP
- Language: Spanish

## Backlog
- [ ] Refactoring: Split server.py into routers
- [ ] Export reports as PDF
- [ ] Recurring transactions
- [ ] Gamification social
- [ ] Notificaciones automaticas (80% budget alerts)
- [ ] Resumen semanal por email
- [ ] PWA / App nativa
