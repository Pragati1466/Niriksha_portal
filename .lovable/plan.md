## NIRIKSHA — Admin Dashboard (Pragati) Build Plan

Foundation module. Master data only — no inspection execution, no AI. Uses Lovable Cloud for DB + admin auth. GovTech Navy palette.

### Design tokens (src/styles.css)
- `--primary` #0B2545, `--secondary` #13315C, `--accent` #8DA9C4, `--background` #EEF4ED, `--destructive` #D64545
- Sans stack (Inter), dense data-table density, subtle borders, semantic tokens only (no hardcoded colors in components).

### Database (single migration, RLS + GRANTs)
Tables (public schema):
1. `departments` — id, name, code (unique), created_at
2. `establishments` — all columns from spec, FK department_id
3. `checklist_templates` — id, department_id FK, template_name, checklist_json (jsonb), version, created_at
4. `inspections` — id, establishment_id, department_id, inspector_id, supervisor_id, scheduled_date, actual_date, status ('pending'|'completed'|'cancelled'), checklist jsonb, findings jsonb, risk_score_at_inspection, evidence_summary jsonb, created_at
5. `profiles` — id (=auth.users.id), department_id, name, email, phone, employee_id, jurisdiction (state, district), created_at
6. `user_roles` — (user_id, role app_role enum: 'admin'|'inspector'|'supervisor')
7. `has_role(uuid, app_role)` SECURITY DEFINER function
8. Trigger: on `auth.users` insert → create empty profile row

RLS policy shape:
- All admin tables: admins full CRUD via `has_role(auth.uid(),'admin')`
- `profiles`: user reads own; admin reads/writes all
- `user_roles`: user reads own; admin manages all
- `inspections`: admin full; inspector reads own (`inspector_id = auth.uid()`); supervisor reads own
- GRANTs for authenticated + service_role on every table

### Auth
- Email/password admin login at `/auth` (public route)
- Sign-up disabled in UI; first admin bootstrapped via a one-off "Create first admin" flow that only works when zero admins exist (checked via server fn calling `has_role` count)
- `_authenticated/` layout (integration-managed) gates the dashboard
- Inside `_authenticated/`, a role gate server fn redirects non-admins away
- Client bearer middleware in `src/start.ts`

### Routes (TanStack file-based)
```
src/routes/
  index.tsx                       → public landing → CTA "Admin Login"
  auth.tsx                        → login (+ first-admin bootstrap card if empty)
  _authenticated/
    route.tsx                     → managed gate
    admin.tsx                     → admin layout (sidebar shell + role check in beforeLoad)
    admin.index.tsx               → Dashboard (stats)
    admin.departments.tsx         → Departments CRUD
    admin.users.tsx               → Users (inspectors/supervisors) CRUD
    admin.establishments.tsx      → Establishments CRUD
    admin.templates.tsx           → Checklist templates (raw JSON editor)
    admin.assignments.tsx         → Inspection assignment (create/list; no delete)
```

### Server functions (src/lib/*.functions.ts, RLS-authenticated)
- `getDashboardStats` — counts of departments, establishments, inspectors, supervisors, pending inspections, completed inspections
- Departments: `listDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`
- Users: `listUsers` (join profiles + user_roles + departments), `createUser` (server-only: uses `supabaseAdmin` inside handler to `auth.admin.createUser`, then insert profile + role — after verifying caller is admin via `context.supabase.rpc('has_role',…)`), `updateUser`, `deactivateUser`, `deleteUser`
- Establishments: full CRUD + `suspendEstablishment` (status flip)
- Templates: full CRUD; `checklist_json` validated as JSON server-side
- Assignments: `listAssignments`, `createAssignment` (inserts row, status='pending'), `updateAssignment` (reschedule/reassign). No delete.

Each privileged fn uses `requireSupabaseAuth`, checks admin role via authenticated client, then does the write (admin client only where auth-admin API is required, loaded via dynamic import).

### UI patterns
- Shadcn Sidebar shell (collapsible icon), header with logo "NIRIKSHA" + org name + sign-out
- Dashboard: 6 stat cards + welcome/quick-actions
- All list pages: shadcn DataTable (search, sort, pagination), row actions (Edit/Delete in dropdown), "Add" dialog with react-hook-form + zod
- Templates page: name/department/version fields + Monaco-lite `<Textarea>` with JSON validation + pretty-print button
- Assignments page: form with cascading selects (Department → filter Inspectors/Supervisors/Establishments) + date picker
- Confirm dialogs on destructive actions, toast feedback via sonner

### Head / SEO
- `__root.tsx`: title "NIRIKSHA — Government Inspection Intelligence"
- Each admin route sets its own `head()` title

### Out of scope (explicit, per spec)
- Conducting inspections, uploading evidence, AI agents, supervisor approvals, audit logs (deferred), file storage
- Social auth

### Build order (single pass)
1. Enable Lovable Cloud
2. Apply migration (enums, tables, RLS, GRANTs, has_role, trigger)
3. Update design tokens
4. Auth route + first-admin bootstrap + role gate
5. Sidebar shell + Dashboard stats
6. Departments CRUD
7. Users CRUD (with admin-create via service role)
8. Establishments CRUD
9. Checklist templates (JSON editor)
10. Inspection assignment
11. Verify: sign up first admin, create dept → user → establishment → template → assignment; confirm rows via `psql`

### Notes
- Email auto-confirm should be enabled to skip email verification for admin-created inspectors/supervisors
- Inspector/Supervisor accounts created by admin get a temp password shown once in the UI (they change on first login later)
- No inspector/supervisor UI yet — they can log in but land on a "Coming soon" page under their own gated area (out of scope for this module but a stub route prevents a broken login)
