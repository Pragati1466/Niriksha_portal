-- =========================================================
-- Migration: supervisor_reviews
-- Adds the supervisor approval/rejection workflow table.
-- One review record per inspection, created when a supervisor
-- makes a decision on a completed inspection.
--
-- Design decisions:
--   - Does NOT modify the inspections table or its status logic.
--   - Separate table keeps approval workflow decoupled from
--     assignment/scheduling lifecycle.
--   - decision enum: 'approved' | 'rejected' — simple binary verdict.
--   - remarks: optional free-text notes from the supervisor.
--   - reviewed_at: explicit timestamp of the decision.
--   - UNIQUE(inspection_id) enforces one-review-per-inspection.
-- =========================================================

-- ── 1. TABLE ──────────────────────────────────────────────────────────────────

CREATE TABLE public.supervisor_reviews (  
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID        NOT NULL REFERENCES public.inspections(id) ON DELETE RESTRICT,
  supervisor_id UUID        NOT NULL,
  decision      TEXT        NOT NULL CHECK (decision IN ('approved', 'rejected')),
  remarks       TEXT,
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspection_id)
);

-- ── 2. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS supervisor_reviews_supervisor_idx
  ON public.supervisor_reviews (supervisor_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS supervisor_reviews_inspection_idx
  ON public.supervisor_reviews (inspection_id);

CREATE INDEX IF NOT EXISTS supervisor_reviews_decision_idx
  ON public.supervisor_reviews (decision);

-- ── 3. GRANTS ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_reviews TO authenticated;
GRANT ALL ON public.supervisor_reviews TO service_role;

-- ── 4. ROW LEVEL SECURITY ─────────────────────────────────────────────────────

ALTER TABLE public.supervisor_reviews ENABLE ROW LEVEL SECURITY;

-- Supervisor can read and write only their own review rows.
-- Admin can read all rows.
DROP POLICY IF EXISTS "supervisor_reviews_supervisor_rw" ON public.supervisor_reviews;
CREATE POLICY "supervisor_reviews_supervisor_rw"
  ON public.supervisor_reviews
  FOR ALL TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── 5. RPC: get_approval_rate ─────────────────────────────────────────────────
-- Returns approval/rejection counts and approval rate (%) for the calling
-- supervisor, optionally filtered by a date range on reviewed_at.
-- Returns NULL for approval_rate when no decided rows exist (prevents
-- dividing by zero and avoids showing 0% when there's simply no data).

CREATE OR REPLACE FUNCTION public.get_approval_rate(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_approved INTEGER;
  v_rejected INTEGER;
  v_rate     NUMERIC;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE r.decision = 'approved')::INTEGER,
    COUNT(*) FILTER (WHERE r.decision = 'rejected')::INTEGER
  INTO v_approved, v_rejected
  FROM public.supervisor_reviews r
  WHERE r.supervisor_id = v_uid
    AND (p_from IS NULL OR r.reviewed_at >= p_from)
    AND (p_to   IS NULL OR r.reviewed_at <= p_to);

  v_rate := CASE WHEN (v_approved + v_rejected) > 0
    THEN ROUND((v_approved::NUMERIC / (v_approved + v_rejected)) * 100, 1)
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'approved',      COALESCE(v_approved, 0),
    'rejected',      COALESCE(v_rejected, 0),
    'total',         COALESCE(v_approved, 0) + COALESCE(v_rejected, 0),
    'approval_rate', v_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approval_rate(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ── 6. RPC: get_approval_trend ────────────────────────────────────────────────
-- Returns time-bucketed approved/rejected counts for the calling supervisor.
-- Used by the Approval vs Rejection bar chart on the Analytics Dashboard.

CREATE OR REPLACE FUNCTION public.get_approval_trend(
  p_from   TIMESTAMPTZ DEFAULT NULL,
  p_to     TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT        DEFAULT 'month'   -- 'day' | 'week' | 'month'
)
RETURNS TABLE (
  bucket_label TEXT,
  approved     INTEGER,
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
      DATE_TRUNC(p_bucket, r.reviewed_at AT TIME ZONE 'UTC'),
      CASE p_bucket
        WHEN 'day'  THEN 'DD Mon'
        WHEN 'week' THEN 'DD Mon'
        ELSE             'Mon ''YY'
      END
    )                                                            AS bucket_label,
    COUNT(*) FILTER (WHERE r.decision = 'approved')::INTEGER    AS approved,
    COUNT(*) FILTER (WHERE r.decision = 'rejected')::INTEGER    AS rejected
  FROM public.supervisor_reviews r
  WHERE r.supervisor_id = v_uid
    AND (p_from IS NULL OR r.reviewed_at >= p_from)
    AND (p_to   IS NULL OR r.reviewed_at <= p_to)
  GROUP BY DATE_TRUNC(p_bucket, r.reviewed_at AT TIME ZONE 'UTC')
  ORDER BY DATE_TRUNC(p_bucket, r.reviewed_at AT TIME ZONE 'UTC');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approval_trend(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
