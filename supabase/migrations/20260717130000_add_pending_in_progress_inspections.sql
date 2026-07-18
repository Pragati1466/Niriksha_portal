-- =========================================================
-- Add pending and in-progress inspections for demo purposes
-- =========================================================
-- These use existing establishment, department, inspector, and supervisor UUIDs
-- from the seed data so they will pass FK constraints.

DO $$
DECLARE
  -- Establishments (from establishments.csv)
  v_est1 uuid := '99251165-b63a-4776-9e14-c52bb457a93c';  -- FSSAI dept
  v_est2 uuid := 'eaf1aa9a-0ea7-4d94-b882-b21d657e4523';  -- IF dept
  v_est3 uuid := '323e7014-e2a7-4767-81f6-38ff3908d945';  -- DFS dept
  v_est4 uuid := 'a7393c21-e3e7-4eab-9199-10661711062c';  -- IF dept
  v_est5 uuid := '7dc8bde1-6986-44d6-a750-b700096db1c9';  -- HEALTH dept
  v_est6 uuid := '7ad49e95-d36d-414c-a5a9-3daff9756cf7';  -- DFS dept
  v_est7 uuid := '6eabb615-797a-487e-b6bb-57ee30e750fb';  -- SPCB dept
  v_est8 uuid := 'fc9b75ee-1277-4264-8d9a-58760c101af4';  -- FSSAI dept

  -- Departments
  v_dept_fssai uuid := 'a338e2f8-957f-46aa-8d6e-5d00ffabcfda';
  v_dept_dfs   uuid := '17c8b7df-21cc-4394-b4da-f0a1a25a0349';
  v_dept_spcb  uuid := 'd8ef4900-75f2-4b9f-9815-b7dc608e0862';
  v_dept_if    uuid := '718472ee-2192-4e7b-9d38-124525a57358';
  v_dept_health uuid := '24353874-868b-46b4-8ac7-58527ba25067';

  -- Inspectors (from users.csv)
  v_insp1 uuid := '70fc361f-7ca4-41ee-8aaf-1ae1f569661e';  -- FSSAI inspector
  v_insp2 uuid := '5914045c-2e86-428b-b808-11bfde1f17b8';  -- FSSAI inspector
  v_insp3 uuid := '7c81c57e-625a-4229-95a5-618d368a1b51';  -- DFS inspector
  v_insp4 uuid := 'd2ae64bb-4a71-4067-a2e7-2f3d379e0d85';  -- DFS inspector
  v_insp5 uuid := 'd3e5a753-51d7-47a1-9d5d-a6258b6ab65b';  -- SPCB inspector
  v_insp6 uuid := 'ec3ebcfb-4766-4514-b0d4-9efc41d1dc26';  -- IF inspector
  v_insp7 uuid := 'f9beb740-6ee2-4c78-aedf-689e0b88a547';  -- DFS inspector
  v_insp8 uuid := 'bb9ce84b-f877-47bf-8d22-6debbe1d72fe';  -- SPCB inspector

  -- Supervisors (from users.csv)
  v_sup1 uuid := '55cf4f10-20fd-445c-9cc5-c2c67682a169';  -- supervisor
  v_sup2 uuid := 'f28635a2-c663-4b8f-b5aa-988a98b0bfeb';  -- supervisor
  v_sup3 uuid := '68971816-dbb5-44f7-a167-525a14e979a2';  -- supervisor
  v_sup4 uuid := 'b618a099-7df4-46a0-9488-29699334c8fb';  -- supervisor
  v_sup5 uuid := '6906817e-ab2d-4d0e-bf13-864922089a23';  -- supervisor
  v_sup6 uuid := '8d2565c2-fe69-4be3-a430-9b35960eef1a';  -- supervisor
  v_sup7 uuid := '62e51350-93fa-4c08-96a2-84ca37bc9195';  -- supervisor
  v_sup8 uuid := '33fef8ec-35c3-4dbb-9fe8-5b6b1b992ee7';  -- supervisor

  v_today date := CURRENT_DATE;
  v_future1 date := CURRENT_DATE + INTERVAL '7 days';
  v_future2 date := CURRENT_DATE + INTERVAL '14 days';
  v_future3 date := CURRENT_DATE + INTERVAL '21 days';
  v_past1 date := CURRENT_DATE - INTERVAL '3 days';
  v_past2 date := CURRENT_DATE - INTERVAL '7 days';
  v_past3 date := CURRENT_DATE - INTERVAL '14 days';
BEGIN

  -- =========================================================
  -- PENDING inspections (scheduled in the future or very recent)
  -- =========================================================

  -- 1. Pending: FSSAI establishment, scheduled next week
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, status, checklist, findings, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est1, v_dept_fssai, v_insp1, v_sup1,
    v_future1, 'pending',
    '{"compliance": 0, "items": [{"id": "c1", "label": "Food storage temperature", "status": "pending"}, {"id": "c2", "label": "Staff hygiene certification", "status": "pending"}]}',
    '{}'::jsonb,
    'Scheduled inspection for food safety compliance.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- 2. Pending: IF establishment, scheduled further out
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, status, checklist, findings, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est2, v_dept_if, v_insp6, v_sup4,
    v_future2, 'pending',
    '{"compliance": 0, "items": [{"id": "c1", "label": "Fire extinguisher availability", "status": "pending"}, {"id": "c2", "label": "Emergency exit signage", "status": "pending"}]}',
    '{}'::jsonb,
    'Factory safety inspection pending.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- 3. Pending: DFS establishment, scheduled next month
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, status, checklist, findings, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est3, v_dept_dfs, v_insp3, v_sup2,
    v_future3, 'pending',
    '{"compliance": 0, "items": [{"id": "c1", "label": "Fire safety equipment", "status": "pending"}, {"id": "c2", "label": "Building evacuation plan", "status": "pending"}]}',
    '{}'::jsonb,
    'Fire safety inspection scheduled.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- 4. Pending: HEALTH establishment, scheduled yesterday (overdue)
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, status, checklist, findings, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est5, v_dept_health, v_insp2, v_sup5,
    v_past1, 'pending',
    '{"compliance": 0, "items": [{"id": "c1", "label": "Waste disposal compliance", "status": "pending"}, {"id": "c2", "label": "Sanitation standards", "status": "pending"}]}',
    '{}'::jsonb,
    'Overdue — healthcare facility inspection.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- 5. Pending: SPCB establishment, scheduled today
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, status, checklist, findings, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est7, v_dept_spcb, v_insp5, v_sup8,
    v_today, 'pending',
    '{"compliance": 0, "items": [{"id": "c1", "label": "Emission levels", "status": "pending"}, {"id": "c2", "label": "Effluent treatment", "status": "pending"}]}',
    '{}'::jsonb,
    'Pollution control inspection scheduled for today.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- =========================================================
  -- IN PROGRESS inspections (started but not completed)
  -- =========================================================

  -- 6. In Progress: FSSAI establishment, started 2 days ago
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, actual_date, status, checklist, findings, risk_score_at_inspection, evidence_summary, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est8, v_dept_fssai, v_insp2, v_sup3,
    v_past2, v_past2, 'in_progress',
    '{"compliance": 45, "items": [{"id": "c1", "label": "Food handling practices", "status": "pass"}, {"id": "c2", "label": "Pest control measures", "status": "fail"}, {"id": "c3", "label": "Record keeping", "status": "pending"}]}',
    '{"summary": "Initial findings show pest control issues. Food handling is satisfactory. Awaiting record review."}',
    65,
    '{"images": 3, "documents": 1}',
    'In-progress inspection — inspector on site.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- 7. In Progress: DFS establishment, started last week
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, actual_date, status, checklist, findings, risk_score_at_inspection, evidence_summary, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est6, v_dept_dfs, v_insp7, v_sup6,
    v_past3, v_past3, 'in_progress',
    '{"compliance": 60, "items": [{"id": "c1", "label": "Fire alarm system", "status": "pass"}, {"id": "c2", "label": "Sprinkler system", "status": "pending"}, {"id": "c3", "label": "Emergency lighting", "status": "pass"}]}',
    '{"summary": "Fire alarm and emergency lighting checked. Sprinkler system inspection pending."}',
    40,
    '{"images": 5, "documents": 2}',
    'Partial inspection completed — awaiting sprinkler system test results.',
    now()
  ) ON CONFLICT DO NOTHING;

  -- 8. In Progress: IF establishment, started recently
  INSERT INTO public.inspections (
    id, establishment_id, department_id, inspector_id, supervisor_id,
    scheduled_date, actual_date, status, checklist, findings, risk_score_at_inspection, evidence_summary, notes, created_at
  ) VALUES (
    gen_random_uuid(), v_est4, v_dept_if, v_insp4, v_sup7,
    v_past1, v_past1, 'in_progress',
    '{"compliance": 30, "items": [{"id": "c1", "label": "Machine safety guards", "status": "fail"}, {"id": "c2", "label": "Worker PPE compliance", "status": "pending"}, {"id": "c3", "label": "Ventilation system", "status": "pending"}]}',
    '{"summary": "Machine safety guards missing on 2 units. Worker PPE compliance being assessed."}',
    78,
    '{"images": 7, "documents": 0}',
    'Factory safety inspection in progress — significant issues found.',
    now()
  ) ON CONFLICT DO NOTHING;

END $$;