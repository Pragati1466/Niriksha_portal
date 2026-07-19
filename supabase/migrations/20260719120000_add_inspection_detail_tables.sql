-- =========================================================
-- Normalized inspector workflow records. The inspections table remains the
-- assignment header; responses, evidence, and history are stored separately.
-- =========================================================

-- =========================================================
-- 1. INSPECTION RESPONSES
-- Store checklist responses per inspection
-- =========================================================
CREATE TABLE IF NOT EXISTS public.inspection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  checklist_item_id TEXT NOT NULL,
  response TEXT NOT NULL,
  finding TEXT,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, checklist_item_id)
);

-- =========================================================
-- 2. EVIDENCE
-- Store uploaded images, documents, and inspector observations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('image', 'document', 'observation')),
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'niriksha-evidence',
  observation TEXT,
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 3. INSPECTION HISTORY
-- Maintain completed inspection records with snapshot
-- =========================================================
CREATE TABLE IF NOT EXISTS public.inspection_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL UNIQUE REFERENCES public.inspections(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'submitted',
  status TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 4. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS inspection_responses_inspection_idx ON public.inspection_responses(inspection_id);
CREATE INDEX IF NOT EXISTS inspection_responses_checklist_idx ON public.inspection_responses(checklist_item_id);
CREATE INDEX IF NOT EXISTS evidence_inspection_idx ON public.evidence(inspection_id);
CREATE INDEX IF NOT EXISTS evidence_type_idx ON public.evidence(evidence_type);
CREATE INDEX IF NOT EXISTS evidence_uploaded_by_idx ON public.evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS inspection_history_inspector_idx ON public.inspection_history(inspector_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS inspection_history_status_idx ON public.inspection_history(status);

-- =========================================================
-- 5. GRANTS
-- =========================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_responses, public.evidence, public.inspection_history TO authenticated;
GRANT ALL ON public.inspection_responses, public.evidence, public.inspection_history TO service_role;

-- =========================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.inspection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_history ENABLE ROW LEVEL SECURITY;

-- Inspection responses: inspector, supervisor, or admin can access
DROP POLICY IF EXISTS "inspection_responses_owner_access" ON public.inspection_responses;
CREATE POLICY "inspection_responses_owner_access" ON public.inspection_responses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (i.inspector_id = auth.uid() OR i.supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (i.inspector_id = auth.uid() OR i.supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Evidence: inspector, supervisor, or admin can access
DROP POLICY IF EXISTS "evidence_owner_access" ON public.evidence;
CREATE POLICY "evidence_owner_access" ON public.evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (i.inspector_id = auth.uid() OR i.supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (i.inspector_id = auth.uid() OR i.supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Inspection history: inspector (self), supervisor (own inspections), or admin can read
DROP POLICY IF EXISTS "inspection_history_owner_read" ON public.inspection_history;
CREATE POLICY "inspection_history_owner_read" ON public.inspection_history FOR SELECT TO authenticated
  USING (inspector_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND i.supervisor_id = auth.uid()));

-- Allow service_role to insert/update history (used by submit flow)
DROP POLICY IF EXISTS "inspection_history_service_insert" ON public.inspection_history;
CREATE POLICY "inspection_history_service_insert" ON public.inspection_history FOR INSERT TO authenticated
  WITH CHECK (inspector_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "inspection_history_service_update" ON public.inspection_history;
CREATE POLICY "inspection_history_service_update" ON public.inspection_history FOR UPDATE TO authenticated
  USING (inspector_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (inspector_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 7. HELPER: Get full inspection detail with related data
--     Fetches inspection + responses + evidence + history
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_inspection_detail(p_inspection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_inspector_id UUID;
BEGIN
  -- Check access: the caller must be the inspector, supervisor, or admin
  SELECT i.inspector_id INTO v_inspector_id
  FROM public.inspections i
  WHERE i.id = p_inspection_id;

  IF v_inspector_id IS NULL THEN
    RAISE EXCEPTION 'Inspection not found';
  END IF;

  IF auth.uid() != v_inspector_id
     AND NOT EXISTS (SELECT 1 FROM public.inspections i2 WHERE i2.id = p_inspection_id AND i2.supervisor_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'inspection', to_jsonb(i),
    'responses', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'checklist_item_id', r.checklist_item_id,
          'response', r.response,
          'finding', r.finding,
          'responded_at', r.responded_at
        ) ORDER BY r.checklist_item_id)
       FROM public.inspection_responses r
       WHERE r.inspection_id = i.id),
      '[]'::jsonb
    ),
    'evidence', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'evidence_type', e.evidence_type,
          'file_name', e.file_name,
          'file_type', e.file_type,
          'file_size', e.file_size,
          'observation', e.observation,
          'location_text', e.location_text,
          'latitude', e.latitude,
          'longitude', e.longitude,
          'captured_at', e.captured_at,
          'created_at', e.created_at
        ) ORDER BY e.created_at DESC)
       FROM public.evidence e
       WHERE e.inspection_id = i.id),
      '[]'::jsonb
    ),
    'history', CASE WHEN h.id IS NOT NULL THEN jsonb_build_object(
      'action', h.action,
      'status', h.status,
      'snapshot', h.snapshot,
      'completed_at', h.completed_at
    ) ELSE NULL END
  ) INTO v_result
  FROM public.inspections i
  LEFT JOIN public.inspection_history h ON h.inspection_id = i.id
  WHERE i.id = p_inspection_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inspection_detail TO authenticated;

-- =========================================================
-- 8. HELPER: Get inspector dashboard data (single call)
--    Aggregates inspections, responses, evidence & history
--    for the authenticated inspector's assigned inspections.
--    Returns: { profile, inspections[], departments[] }
--    Each inspection includes nested establishment, department,
--    template, checklist, findings, evidence_summary, and history.
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_inspector_dashboard(p_inspector_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
  v_inspections JSONB;
  v_departments JSONB;
  v_result JSONB;
BEGIN
  -- 1. Profile
  SELECT jsonb_build_object(
    'name', p.name,
    'department', CASE WHEN d.id IS NOT NULL THEN jsonb_build_object('name', d.name) ELSE NULL END
  ) INTO v_profile
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.id = p_inspector_id;

  -- 2. Departments list
  SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) ORDER BY d.name)
  INTO v_departments
  FROM public.departments d;

  -- 3. Inspections with aggregated detail from all sub-tables
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'establishment_id', i.establishment_id,
      'department_id', i.department_id,
      'inspector_id', i.inspector_id,
      'supervisor_id', i.supervisor_id,
      'template_id', i.template_id,
      'scheduled_date', i.scheduled_date,
      'actual_date', i.actual_date,
      'status', i.status,
      'notes', i.notes,
      'created_at', i.created_at,
      'establishment', jsonb_build_object(
        'id', est.id,
        'name', est.name,
        'address', est.address,
        'registration_number', est.registration_number,
        'category', est.category
      ),
      'department', jsonb_build_object(
        'id', dep.id,
        'name', dep.name,
        'code', dep.code
      ),
      'template', CASE WHEN t.id IS NOT NULL THEN jsonb_build_object(
        'id', t.id,
        'template_name', t.template_name,
        'checklist_json', t.checklist_json
      ) ELSE NULL END,
      -- Aggregated from inspection_responses table
      'checklist', COALESCE(
        (SELECT jsonb_object_agg(rsp.checklist_item_id, rsp.response)
         FROM public.inspection_responses rsp
         WHERE rsp.inspection_id = i.id),
        '{}'::jsonb
      ),
      'findings', COALESCE(
        (SELECT jsonb_object_agg(rsp.checklist_item_id, rsp.finding)
         FROM public.inspection_responses rsp
         WHERE rsp.inspection_id = i.id AND rsp.finding IS NOT NULL),
        '{}'::jsonb
      ),
      -- Aggregated from evidence table
      'evidence_summary', jsonb_build_object(
        'files', COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
              'name', ev.file_name,
              'type', ev.file_type,
              'size', ev.file_size
            ))
           FROM public.evidence ev
           WHERE ev.inspection_id = i.id AND ev.evidence_type IN ('image', 'document')),
          '[]'::jsonb
        ),
        'location_text', COALESCE(
          (SELECT ev_obs.location_text FROM public.evidence ev_obs
           WHERE ev_obs.inspection_id = i.id AND ev_obs.evidence_type = 'observation' LIMIT 1),
          ''
        ),
        'location', COALESCE(
          (SELECT jsonb_build_object(
              'latitude', ev_obs.latitude,
              'longitude', ev_obs.longitude,
              'captured_at', ev_obs.captured_at
            ) FROM public.evidence ev_obs
           WHERE ev_obs.inspection_id = i.id AND ev_obs.evidence_type = 'observation'
             AND ev_obs.latitude IS NOT NULL AND ev_obs.longitude IS NOT NULL
           LIMIT 1),
          NULL
        )
      ),
      -- Aggregated from inspection_history table
      'history', CASE WHEN ih.id IS NOT NULL THEN jsonb_build_object(
        'action', ih.action,
        'status', ih.status,
        'completed_at', ih.completed_at
      ) ELSE NULL END
    ) ORDER BY i.scheduled_date ASC
  ) INTO v_inspections
  FROM public.inspections i
  JOIN public.establishments est ON est.id = i.establishment_id
  JOIN public.departments dep ON dep.id = i.department_id
  LEFT JOIN public.checklist_templates t ON t.id = i.template_id
  LEFT JOIN public.inspection_history ih ON ih.inspection_id = i.id
  WHERE i.inspector_id = p_inspector_id;

  -- Ensure empty array instead of null
  IF v_inspections IS NULL THEN
    v_inspections := '[]'::jsonb;
  END IF;

  -- Build final result matching the inspector dashboard shape
  v_result := jsonb_build_object(
    'profile', v_profile,
    'inspections', v_inspections,
    'departments', COALESCE(v_departments, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inspector_dashboard TO authenticated;

-- =========================================================
-- 9. SEED DATA: Populate inspection_responses, evidence, and
--    inspection_history from existing inspections data.
--    This runs only if the tables are empty (idempotent).
-- =========================================================
DO $$
DECLARE
  v_inspection RECORD;
  v_checklist_items TEXT[];
  v_item TEXT;
  v_response TEXT;
  v_finding TEXT;
  v_evidence_id UUID;
  v_inspector_id UUID;
BEGIN
  -- Only seed if inspection_responses is empty
  IF EXISTS (SELECT 1 FROM public.inspection_responses LIMIT 1) THEN
    RAISE NOTICE 'inspection_responses already has data, skipping seed.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding inspection_responses, evidence, and inspection_history from existing inspections...';

  FOR v_inspection IN
    SELECT i.id, i.inspector_id, i.checklist, i.findings, i.evidence_summary, i.status, i.notes, i.actual_date
    FROM public.inspections i
    WHERE i.checklist IS NOT NULL AND i.checklist != '{}'::jsonb
  LOOP
    v_inspector_id := v_inspection.inspector_id;

    -- Seed inspection_responses from the checklist JSONB
    -- The checklist is stored as { "item_id": "Safe"|"Complaint", ... }
    FOR v_item IN SELECT jsonb_object_keys(v_inspection.checklist)
    LOOP
      v_response := v_inspection.checklist->>v_item;
      v_finding := NULL;

      -- If there's a corresponding finding, grab it
      IF v_inspection.findings IS NOT NULL AND v_inspection.findings ? v_item THEN
        v_finding := v_inspection.findings->>v_item;
      END IF;

      -- Default finding text for complaints if none stored
      IF v_response = 'Complaint' AND v_finding IS NULL THEN
        v_finding := 'Issue observed during inspection — see evidence for details.';
      END IF;

      INSERT INTO public.inspection_responses (
        inspection_id, checklist_item_id, response, finding, responded_by, responded_at
      ) VALUES (
        v_inspection.id, v_item, v_response, v_finding, v_inspector_id, COALESCE(v_inspection.actual_date, now())::timestamptz
      ) ON CONFLICT (inspection_id, checklist_item_id) DO NOTHING;
    END LOOP;

    -- Seed evidence from evidence_summary JSONB
    -- evidence_summary.files[] -> image/document records
    IF v_inspection.evidence_summary IS NOT NULL AND v_inspection.evidence_summary ? 'files' THEN
      FOR v_item IN SELECT jsonb_array_elements_text(v_inspection.evidence_summary->'files')
      LOOP
        -- v_item is a JSON string, parse it
        DECLARE
          v_file JSONB := v_item::jsonb;
          v_file_name TEXT := v_file->>'name';
          v_file_type TEXT := v_file->>'type';
          v_file_size BIGINT := (v_file->>'size')::BIGINT;
          v_ev_type TEXT;
        BEGIN
          IF v_file_type LIKE 'image/%' THEN
            v_ev_type := 'image';
          ELSE
            v_ev_type := 'document';
          END IF;

          INSERT INTO public.evidence (
            inspection_id, evidence_type, file_name, file_type, file_size, uploaded_by, created_at
          ) VALUES (
            v_inspection.id, v_ev_type, v_file_name, v_file_type, v_file_size, v_inspector_id, COALESCE(v_inspection.actual_date, now())::timestamptz
          );
        END;
      END LOOP;
    END IF;

    -- Seed observation evidence from evidence_summary.location_text and notes
    IF v_inspection.evidence_summary IS NOT NULL AND (
      (v_inspection.evidence_summary ? 'location_text' AND v_inspection.evidence_summary->>'location_text' != '')
      OR (v_inspection.evidence_summary ? 'location' AND v_inspection.evidence_summary->'location' != 'null'::jsonb)
      OR (v_inspection.notes IS NOT NULL AND v_inspection.notes != '')
    ) THEN
      INSERT INTO public.evidence (
        inspection_id, evidence_type, observation, location_text,
        latitude, longitude, captured_at, uploaded_by, created_at
      ) VALUES (
        v_inspection.id, 'observation',
        v_inspection.notes,
        v_inspection.evidence_summary->>'location_text',
        CASE WHEN v_inspection.evidence_summary #>> '{location,latitude}' IS NOT NULL
             THEN (v_inspection.evidence_summary #>> '{location,latitude}')::DOUBLE PRECISION
             ELSE NULL END,
        CASE WHEN v_inspection.evidence_summary #>> '{location,longitude}' IS NOT NULL
             THEN (v_inspection.evidence_summary #>> '{location,longitude}')::DOUBLE PRECISION
             ELSE NULL END,
        CASE WHEN v_inspection.evidence_summary #>> '{location,captured_at}' IS NOT NULL
             THEN (v_inspection.evidence_summary #>> '{location,captured_at}')::timestamptz
             ELSE NULL END,
        v_inspector_id,
        COALESCE(v_inspection.actual_date, now())::timestamptz
      );
    END IF;

    -- Seed inspection_history for completed inspections
    IF v_inspection.status = 'completed' THEN
      INSERT INTO public.inspection_history (
        inspection_id, inspector_id, action, status, snapshot, completed_at
      ) VALUES (
        v_inspection.id, v_inspector_id, 'submitted', 'completed',
        jsonb_build_object(
          'responses', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'checklist_item_id', r.checklist_item_id,
            'response', r.response,
            'finding', r.finding
          )), '[]'::jsonb) FROM public.inspection_responses r WHERE r.inspection_id = v_inspection.id),
          'evidence_files', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', e.file_name,
            'type', e.file_type,
            'size', e.file_size
          )), '[]'::jsonb) FROM public.evidence e WHERE e.inspection_id = v_inspection.id AND e.evidence_type IN ('image', 'document')),
          'inspector_notes', v_inspection.notes,
          'submitted_at', COALESCE(v_inspection.actual_date, now())
        ),
        COALESCE(v_inspection.actual_date, now())::timestamptz
      ) ON CONFLICT (inspection_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed complete: inspection_responses, evidence, and inspection_history populated.';
END $$;
