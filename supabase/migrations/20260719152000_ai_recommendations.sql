-- =========================================================
-- Migration: ai_recommendations
-- Adds persistence for AI agent recommendation output and
-- supervisor accept/reject decisions on those recommendations.
--
-- Design decisions:
--   - Does NOT modify the AI agent (agentic_agent/) code.
--   - This is a pure persistence layer: the frontend writes here
--     after receiving an AI response, then reads it for analytics.
--   - ai_output: full JSON blob from AI endpoint (risk + report).
--   - recommendation_text: the primary recommended action (extracted
--     from ai_output for fast analytics queries without JSON parsing).
--   - ai_risk_level: extracted from ai_output for filtering.
--   - supervisor_decision: 'accepted' | 'rejected' | NULL (pending).
--   - supervisor_notes: optional free text.
--   - decided_at: set when supervisor_decision is written.
--   - UNIQUE(inspection_id): one AI recommendation log per inspection.
-- =========================================================

-- ── 1. TABLE ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id        UUID        NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  supervisor_id        UUID        NOT NULL,
  -- AI output (stored in full for auditability)
  ai_output            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Denormalised fields for fast analytics (extracted from ai_output at insert)
  recommendation_text  TEXT,
  ai_risk_level        TEXT,
  ai_risk_score        INTEGER,
  -- Supervisor decision
  supervisor_decision  TEXT        CHECK (supervisor_decision IN ('accepted', 'rejected')),
  supervisor_notes     TEXT,
  decided_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspection_id)
);

-- ── 2. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ai_rec_supervisor_idx
  ON public.ai_recommendations (supervisor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_rec_inspection_idx
  ON public.ai_recommendations (inspection_id);

CREATE INDEX IF NOT EXISTS ai_rec_decision_idx
  ON public.ai_recommendations (supervisor_decision);

-- ── 3. GRANTS ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;

-- ── 4. ROW LEVEL SECURITY ─────────────────────────────────────────────────────

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Supervisor reads/writes only their own rows; admin reads all.
DROP POLICY IF EXISTS "ai_rec_supervisor_rw" ON public.ai_recommendations;
CREATE POLICY "ai_rec_supervisor_rw"
  ON public.ai_recommendations
  FOR ALL TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── 5. RPC: get_ai_acceptance_rate ────────────────────────────────────────────
-- Returns accepted/rejected counts and acceptance rate (%) for the calling
-- supervisor within an optional date range.
-- Returns NULL for acceptance_rate when no decided rows exist.

CREATE OR REPLACE FUNCTION public.get_ai_acceptance_rate(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_accepted INTEGER;
  v_rejected INTEGER;
  v_rate     NUMERIC;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE a.supervisor_decision = 'accepted')::INTEGER,
    COUNT(*) FILTER (WHERE a.supervisor_decision = 'rejected')::INTEGER
  INTO v_accepted, v_rejected
  FROM public.ai_recommendations a
  WHERE a.supervisor_id = v_uid
    AND a.supervisor_decision IS NOT NULL
    AND (p_from IS NULL OR a.decided_at >= p_from)
    AND (p_to   IS NULL OR a.decided_at <= p_to);

  v_rate := CASE WHEN (v_accepted + v_rejected) > 0
    THEN ROUND((v_accepted::NUMERIC / (v_accepted + v_rejected)) * 100, 1)
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'accepted',        COALESCE(v_accepted, 0),
    'rejected',        COALESCE(v_rejected, 0),
    'total',           COALESCE(v_accepted, 0) + COALESCE(v_rejected, 0),
    'acceptance_rate', v_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_acceptance_rate(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ── 6. RPC: get_ai_acceptance_trend ──────────────────────────────────────────
-- Returns time-bucketed accepted/rejected counts for the calling supervisor.
-- Used by the AI Recommendation Acceptance chart on the Analytics Dashboard.

CREATE OR REPLACE FUNCTION public.get_ai_acceptance_trend(
  p_from   TIMESTAMPTZ DEFAULT NULL,
  p_to     TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT        DEFAULT 'month'
)
RETURNS TABLE (
  bucket_label TEXT,
  accepted     INTEGER,
  rejected     INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(
      DATE_TRUNC(p_bucket, a.decided_at AT TIME ZONE 'UTC'),
      CASE p_bucket
        WHEN 'day'  THEN 'DD Mon'
        WHEN 'week' THEN 'DD Mon'
        ELSE             'Mon ''YY'
      END
    )                                                             AS bucket_label,
    COUNT(*) FILTER (WHERE a.supervisor_decision = 'accepted')::INTEGER AS accepted,
    COUNT(*) FILTER (WHERE a.supervisor_decision = 'rejected')::INTEGER AS rejected
  FROM public.ai_recommendations a
  WHERE a.supervisor_id = v_uid
    AND a.supervisor_decision IS NOT NULL
    AND (p_from IS NULL OR a.decided_at >= p_from)
    AND (p_to   IS NULL OR a.decided_at <= p_to)
  GROUP BY DATE_TRUNC(p_bucket, a.decided_at AT TIME ZONE 'UTC')
  ORDER BY DATE_TRUNC(p_bucket, a.decided_at AT TIME ZONE 'UTC');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_acceptance_trend(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- ── 7. SEED: realistic AI recommendation + acceptance data ────────────────────
-- Creates ai_recommendations rows for ~70% of completed inspections
-- (AI is not triggered on every inspection — realistic coverage).
-- Distribution: ~74% accepted, ~26% rejected.
-- decided_at = actual_date + 1-2 days after the AI was run.

DO $$
DECLARE
  v_row       RECORD;
  v_decision  TEXT;
  v_notes     TEXT;
  v_risk_lvls TEXT[]    := ARRAY['low','low','moderate','moderate','moderate','high','high'];
  v_risk_scs  INTEGER[] := ARRAY[15, 22, 38, 45, 52, 68, 76];
  v_rec_texts TEXT[]    := ARRAY[
    'No immediate action required. Schedule next inspection per standard cycle.',
    'Issue advisory notice. Monitor compliance at next scheduled visit.',
    'Request corrective action plan within 30 days.',
    'Conduct follow-up inspection within 21 days to verify corrective measures.',
    'Issue formal compliance notice. Re-inspect within 14 days.',
    'Escalate to department head — high-risk violations identified.',
    'Recommend immediate suspension of operations pending re-inspection.'
  ];
  v_offset    INTEGER := 0;
  v_seeded    INTEGER := 0;
  v_idx       INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ai_recommendations LIMIT 1) THEN
    RAISE NOTICE 'ai_recommendations already has data — skipping seed.';
    RETURN;
  END IF;

  FOR v_row IN
    SELECT i.id          AS inspection_id,
           i.supervisor_id,
           i.actual_date,
           i.scheduled_date,
           COALESCE(i.risk_score_at_inspection, 25) AS risk_score
    FROM   public.inspections i
    WHERE  i.status = 'completed'
      AND  i.actual_date IS NOT NULL
    ORDER  BY i.actual_date
  LOOP
    v_offset := v_offset + 1;

    -- Only seed for ~70% of completed inspections
    IF (v_offset % 10) >= 7 THEN
      CONTINUE;
    END IF;

    -- Pick array index based on risk score bracket
    IF v_row.risk_score > 70 THEN
      v_idx := 6 + (v_offset % 2);   -- indices 6-7 (high)
    ELSIF v_row.risk_score > 40 THEN
      v_idx := 3 + (v_offset % 3);   -- indices 3-5 (moderate)
    ELSE
      v_idx := 1 + (v_offset % 2);   -- indices 1-2 (low)
    END IF;

    -- Clamp to array bounds (1-indexed)
    v_idx := GREATEST(1, LEAST(v_idx, array_length(v_risk_lvls, 1)));

    -- Decision: 74% accepted, 26% rejected
    v_decision := CASE (v_offset % 50)
      WHEN 0,1,2,3,4,5,6,7,8,9,10,11,12 THEN 'rejected'
      ELSE 'accepted'
    END;

    v_notes := CASE v_decision
      WHEN 'accepted' THEN
        CASE (v_offset % 4)
          WHEN 0 THEN 'AI recommendation reviewed and accepted. Actions scheduled.'
          WHEN 1 THEN 'Agreed with AI assessment. Proceeding with recommended actions.'
          WHEN 2 THEN 'AI analysis accurate — recommendation implemented.'
          ELSE        'Accepted AI recommendation after reviewing inspection evidence.'
        END
      ELSE
        CASE (v_offset % 3)
          WHEN 0 THEN 'AI recommendation overridden — on-site context differs from AI assessment.'
          WHEN 1 THEN 'Disagree with AI risk level. Manual review completed.'
          ELSE        'AI recommendation rejected — inspector findings are more nuanced.'
        END
    END;

    INSERT INTO public.ai_recommendations (
      inspection_id,
      supervisor_id,
      ai_output,
      recommendation_text,
      ai_risk_level,
      ai_risk_score,
      supervisor_decision,
      supervisor_notes,
      decided_at,
      created_at
    ) VALUES (
      v_row.inspection_id,
      v_row.supervisor_id,
      jsonb_build_object(
        'risk_score',          v_risk_scs[v_idx],
        'risk_level',          v_risk_lvls[v_idx],
        'recommended_actions', jsonb_build_array(v_rec_texts[v_idx]),
        'corrective_actions',  jsonb_build_array('Update maintenance log.', 'Re-train staff on SOPs.'),
        'report_summary',      'AI-generated inspection analysis based on field data and complaint history.',
        'generated_at',        v_row.actual_date::text
      ),
      v_rec_texts[v_idx],
      v_risk_lvls[v_idx],
      v_risk_scs[v_idx],
      v_decision,
      v_notes,
      -- decided_at = actual_date + 1 or 2 days
      v_row.actual_date::timestamptz + INTERVAL '1 day' * ((v_offset % 2) + 1),
      now()
    )
    ON CONFLICT (inspection_id) DO NOTHING;

    v_seeded := v_seeded + 1;
  END LOOP;

  RAISE NOTICE 'Seeded ai_recommendations: % rows', v_seeded;
END $$;
