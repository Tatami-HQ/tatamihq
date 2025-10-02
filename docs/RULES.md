# Coding & Project Rules

This file explains the standards for building TatamiHQ (Braveheart Martial Arts Manager).  
These are written in plain English to match the `.cursor/rules.json` file.

---

## 🔧 Tech & Tools
- Next.js (framework)
- TypeScript (strict mode)
- TailwindCSS (with Braveheart branding)
- Supabase (database, auth, storage)
- React Query (data fetching, caching)
- React Hook Form + Zod (forms + validation)
- pnpm (package manager)

---

## 🎨 Design & UI
- Dark, modern dashboard look (like the inspiration screenshot)
- Braveheart branding (black + electric blue), but allow re-theming for other clubs
- Desktop-first, but must scale down smoothly to mobile
- Consistent spacing, typography, and button styles
- Buttons must have hover, focus, disabled, and loading states
- Accessibility: alt text, ARIA labels, semantic HTML

---

## ⚡ Performance
- Always show loading states (skeletons, spinners)
- Optimistic updates (show instantly, confirm with DB)
- Infinite scroll for long lists (students, classes, etc.)
- Cache common data with React Query
- Lazy load heavy components & images

---

## 🔒 Security
- Supabase Row Level Security (RLS) on all tables
- Never expose private API keys
- Validate and sanitize all inputs
- Use environment variables, not hardcoded values
- Secure sessions with Supabase Auth
- HTTPS enforced in production

---

## 🧪 Testing
- Wrap API calls in try/catch with clear error messages
- Console logs must include context ([Feature:Function])
- Smoke test main flows before deploy:
  - Login
  - Add student
  - Mark attendance
  - Record payment
- Check desktop & mobile views for each major feature

---

## 📂 Structure
- `/components` → reusable UI (buttons, tables, cards)
- `/pages` → routes
- `/lib` → business logic, database helpers
- `/docs` → documentation
