# StudentFinance Beta - PRD (Product Requirements Document)

## Project Overview
**Title:** Evaluación de un sistema de gestión de información financiera para la organización de gastos en estudiantes universitarios: estudio en una beta cerrada

**Institution:** Universidad Ean - Facultad de Ingeniería - Programa Ingeniería en Sistemas

**Problem Statement:** ¿Cómo puede un sistema de gestión de información ayudar a las personas a entender y aprender sobre las finanzas personales y gestión de deudas?

## User Personas
1. **Primary:** Estudiantes universitarios participantes de la beta cerrada
2. **Secondary:** Investigadores evaluando el impacto del sistema

## Core Requirements (Static)
- Sistema de autenticación con Google Login
- Encuesta diagnóstica inicial sobre manejo de gastos, deudas y ahorro
- Módulo de registro de ingresos y egresos
- Control y seguimiento de deudas
- Metas de ahorro con progreso visual
- Reportes comparativos (antes/después) del uso del sistema
- Diseño minimalista con colores pasteles

## What's Been Implemented (Feb 28, 2026)

### Backend (FastAPI + MongoDB)
- ✅ Authentication endpoints with Emergent Google OAuth
- ✅ User management with session tokens
- ✅ Diagnostic survey CRUD
- ✅ Transactions CRUD (income/expenses)
- ✅ Debts CRUD with payment tracking
- ✅ Savings goals CRUD with contributions
- ✅ Financial reports with before/after comparison
- ✅ Dashboard summary endpoint

### Frontend (React + Tailwind + Shadcn)
- ✅ Landing page with hero, features, and CTA sections
- ✅ Google OAuth authentication flow
- ✅ 4-step diagnostic survey onboarding
- ✅ Dashboard with balance, income, expenses, savings cards
- ✅ Balance evolution chart (Recharts)
- ✅ Transactions page with filter and CRUD dialog
- ✅ Debts page with progress bars and payment modal
- ✅ Savings page with circular progress indicators
- ✅ Reports page with before/after comparison
- ✅ Profile page with user info
- ✅ Responsive navigation with mobile menu

### Design System
- Pastel color palette (Cream #FDFBF7, Emerald #059669, soft accents)
- Epilogue font for headings, Outfit for body
- JetBrains Mono for financial numbers
- Soft shadows and rounded-2xl corners
- Micro-animations and hover states

## Prioritized Backlog

### P0 (Critical - Done)
- [x] User authentication
- [x] Diagnostic survey
- [x] Income/expense tracking
- [x] Debt management
- [x] Savings goals
- [x] Before/after reports
- [x] Admin panel for advisors (view all users, add transactions)

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

## Next Tasks
1. Add more transaction categories
2. Implement budget alerts when exceeding limits
3. Add data export functionality for research analysis
4. Create admin panel for research coordinators
5. Implement user feedback collection

## Tech Stack
- **Frontend:** React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Backend:** FastAPI, Motor (async MongoDB)
- **Database:** MongoDB
- **Authentication:** Emergent Google OAuth
