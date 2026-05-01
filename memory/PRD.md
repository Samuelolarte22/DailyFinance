# LD Finance - PRD (Product Requirements Document)

## Project Overview
**App Name:** LD Finance (rama de LD Holdings)
**Tech Stack:** React 19 + Tailwind + Shadcn/UI + Recharts | FastAPI + Motor + MongoDB | Emergent Google OAuth | Emergent Object Storage | Resend (emails)

## Implemented Features (All Phases)

### Phase 1-5 (Previous)
- Google OAuth, survey, CRUD transactions/debts/savings, admin panel with impersonation
- Categories per user, advisor chat, budget comparison, digital pockets
- Dark/light theme, community, social connections, floating transaction button

### Phase 6 - V4.0 (April 16, 2026)
22-26. Shared transactions, pie chart, timeline chart, calculator, meeting scheduling

### Phase 7 - V5.0 (April 25, 2026)
27-39. Fixed header, light mode fixes, favicon, date picker fix, monthly balance, budget per month, Enter save, comments, annual overview table, stacked chart, edit savings/debts, calendar admin attendee, payment reminders

### Phase 8 - V6.0 (May 1, 2026)
40. **Voice Transaction Input** — Whisper STT + GPT-4.1-mini auto-fill
41. **Landing Page Dark Theme** — Forces dark regardless of user preference
42. **Calendar Auto-Close** — Popover closes on date select
43. **Comprehensive Light Mode CSS** — All components adapt properly
44. **Community Responsive** — Fixed horizontal overflow on mobile
45. **Pocket CRUD** — Agregar/Retirar/Fijar balance (withdraw, edit endpoints)
46. **Audio in Transactions** — Same voice input in Transactions dialog
47. **AI Financial Chat** — GPT-4.1-mini connected to ALL user data (transactions, debts, savings, pockets). In Transactions page with suggestions.
48. **Email Reminders** — Resend integration with branded LD Finance HTML templates. Payment and meeting reminders with CC to admins.
49. **Admin Subscription Tracking** — Payment day per user, ok/overdue status, confirm payment button. Admin-only visibility.

## Key API Endpoints
- Auth, Pockets (GET/POST/DELETE/PUT edit/POST withdraw/POST fund)
- Transactions, Shared Transactions, Budgets (month-specific), Dashboard
- Reports (annual_overview, stacked_chart, timeline)
- Meetings, Reminders, Categories
- **AI:** POST /api/ai/chat, POST /api/voice/parse-transaction
- **Email:** POST /api/admin/send-reminder-email
- **Subscriptions:** PUT /api/admin/users/{id}/subscription, GET /api/admin/subscriptions
- Edit: PUT /api/savings/{id}/edit, PUT /api/debts/{id}/edit

## DB Collections
users (+ subscription_payment_day, subscription_status, subscription_last_payment), transactions, debts, savings_goals, surveys, user_sessions, categories, advisor_messages, budgets, banks, documents, connections, notifications, shared_transactions, pockets, meetings, reminders

## Backlog
- [ ] Refactoring: Split server.py into routers
- [ ] Export reports as PDF
- [ ] Recurring transactions
- [ ] Gamification social
- [ ] Notificaciones automaticas (80% budget alerts)
- [ ] Resumen semanal por email automatico
- [ ] PWA / App nativa
