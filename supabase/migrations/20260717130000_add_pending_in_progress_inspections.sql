-- =========================================================
-- Add realistic pending and in-progress inspections
-- =========================================================
-- With ~8000 total inspections, we need a meaningful proportion:
-- ~200 pending (~2.5%) and ~100 in_progress (~1.25%)
-- These use existing UUIDs from seed data.

-- First, remove the 8 records previously inserted (if any)
DELETE FROM public.inspections WHERE notes IN (
  'Scheduled inspection for food safety compliance.',
  'Factory safety inspection pending.',
  'Fire safety inspection scheduled.',
  'Overdue — healthcare facility inspection.',
  'Pollution control inspection scheduled for today.',
  'In-progress inspection — inspector on site.',
  'Partial inspection completed — awaiting sprinkler system test results.',
  'Factory safety inspection in progress — significant issues found.'
);

-- Now insert a realistic batch
DO $$
DECLARE
  -- Arrays of existing establishment IDs (sampled from seed data)
  v_est_uuids uuid[] := ARRAY[
    '99251165-b63a-4776-9e14-c52bb457a93c',
    'eaf1aa9a-0ea7-4d94-b882-b21d657e4523',
    '323e7014-e2a7-4767-81f6-38ff3908d945',
    'a7393c21-e3e7-4eab-9199-10661711062c',
    '7dc8bde1-6986-44d6-a750-b700096db1c9',
    '7ad49e95-d36d-414c-a5a9-3daff9756cf7',
    '6eabb615-797a-487e-b6bb-57ee30e750fb',
    'fc9b75ee-1277-4264-8d9a-58760c101af4',
    '4c6758e8-bb37-4e49-99cd-977471390bcf',
    'cbb20ef6-4f2e-40ed-b937-d3176d0368ec',
    'f0b30a05-1ea0-4df7-8045-7b3ce6521d9a',
    '9db3651d-93f6-4597-b66d-7cdf33498fa5',
    'f3f6fdbd-f7fc-492f-a299-08383fc053f5',
    'c331be12-5da7-4708-978e-f79101e150af',
    '3eef959a-7337-44da-9b99-5f656bcfed1a',
    '8c8e6f81-e893-4bde-a656-1da9e4e387dc',
    '3d78a8b6-6051-4e1c-8840-19a9989b6f45',
    'afd37876-827c-40bc-a2dc-bbcf98e08ac8',
    'c1c32f09-4d75-459e-8ad6-b67efca4f260',
    'f278ea4b-6032-4dde-bdda-ca8ffefbb568',
    'c95efc3e-0760-4780-8c23-bac5515ffb4f',
    'b6385e54-5b2d-4aef-80ee-aef44dcdfa35',
    'c5147d84-e3f1-44ab-a759-1da9341d67e9',
    'd69ed75c-0c1d-4fca-9bfc-19fa7ec16b8e',
    '48d26bc5-e728-47f5-bb33-2b8abe4e1f59',
    '329d7d08-8a8a-4410-bcd8-3b073783c318',
    '590524e0-2c21-4c88-87a2-8173f48df60f',
    'a6f22627-5aa4-4ed3-8aa8-261eaa59e017',
    'c523ddba-b1c4-4bd5-a780-87fac9a97d68',
    '1113376e-a864-48fb-bc01-c12f9a1c42a8'
  ];

  -- Department IDs
  v_dept_fssai  uuid := 'a338e2f8-957f-46aa-8d6e-5d00ffabcfda';
  v_dept_dfs    uuid := '17c8b7df-21cc-4394-b4da-f0a1a25a0349';
  v_dept_spcb   uuid := 'd8ef4900-75f2-4b9f-9815-b7dc608e0862';
  v_dept_if     uuid := '718472ee-2192-4e7b-9d38-124525a57358';
  v_dept_health uuid := '24353874-868b-46b4-8ac7-58527ba25067';

  -- Inspector IDs (sampled from users.csv)
  v_insp_uuids uuid[] := ARRAY[
    '70fc361f-7ca4-41ee-8aaf-1ae1f569661e',
    '5914045c-2e86-428b-b808-11bfde1f17b8',
    '7c81c57e-625a-4229-95a5-618d368a1b51',
    'd2ae64bb-4a71-4067-a2e7-2f3d379e0d85',
    'd3e5a753-51d7-47a1-9d5d-a6258b6ab65b',
    'ec3ebcfb-4766-4514-b0d4-9efc41d1dc26',
    'f9beb740-6ee2-4c78-aedf-689e0b88a547',
    'bb9ce84b-f877-47bf-8d22-6debbe1d72fe',
    '7e6aee0c-6777-4bf5-acc4-00a6f2af5e1a',
    '0e024c2e-ffa1-4905-92ff-ec9e0eb0c52b',
    '99ee70b0-9e94-4f57-98f3-ef2a7be688c4',
    'd907b05f-e6b3-47bf-8757-6a9d12816e8a',
    'd982c1d8-7aee-4540-9376-4ba889e5dbc5',
    '92a4eb72-94aa-4690-bfb0-2a9c035c1ade',
    'a048d942-198d-4e8e-8399-7c00bc81d34e',
    'a62fcd63-d7b2-4fbb-a8a5-3c0fd9a03e3d',
    '30576eb7-5904-405c-a7ff-195e6f89e59c',
    '02da18fe-4fe4-4f8b-8c3b-9e6a41e4e80b',
    '49db62da-2f7e-4aa2-bdea-362cec3e6406',
    '6311b97a-4c53-4a20-9abe-5bd4670ae3b3',
    '0e847a19-b4bb-4dfa-adc7-4e852ccdd54e',
    'cb34bb8e-6e18-4ee4-87f8-2ad8a76f65cd',
    '2536cb4f-a714-4c12-8a0c-82e972dac657',
    '8f02a69d-2477-4777-afd4-c93e1724f7e2',
    'c40ea071-c192-4a1d-9a08-9128b6c3a4e4',
    'e405574d-2cd7-482c-8e34-e38769794f4f',
    '0ba54024-3ed0-4197-ada4-905a190ea474',
    '2cfa4b25-bdbf-49dc-bdb2-bca84edac417',
    '187831ef-1acb-4b09-b389-b568b7d941da',
    '9f1ed651-8f63-4c59-b867-a424443fa885'
  ];

  -- Supervisor IDs (sampled from users.csv)
  v_sup_uuids uuid[] := ARRAY[
    '55cf4f10-20fd-445c-9cc5-c2c67682a169',
    'f28635a2-c663-4b8f-b5aa-988a98b0bfeb',
    '68971816-dbb5-44f7-a167-525a14e979a2',
    'b618a099-7df4-46a0-9488-29699334c8fb',
    '6906817e-ab2d-4d0e-bf13-864922089a23',
    '8d2565c2-fe69-4be3-a430-9b35960eef1a',
    '62e51350-93fa-4c08-96a2-84ca37bc9195',
    '33fef8ec-35c3-4dbb-9fe8-5b6b1b992ee7',
    '8ec6bea5-f80a-4cff-a35f-3eea99be4cd5',
    '5a79626c-f6d4-4614-b53c-b5de5c3ac503',
    'e35773b1-4119-482d-9588-800521849706',
    '2f26b90c-830d-46ec-a0f9-c8b25db9e40e',
    'acc09f4f-2f7a-4b07-a68b-3e6bc62e1de4',
    '7e401ab0-f2b3-4a8f-8054-3967e2df4fbc',
    'af0dcc0f-d07d-47ee-83ba-b079da5f6e2d',
    'c2bc4195-735f-4c75-a2f7-6c60cbe96b2e',
    'c913fd3d-1d19-4f77-b471-58799d2d9b5f',
    '17cb3bc5-4fc6-4137-a0b3-921ec5e5644f',
    '60bff883-d896-4043-9799-a1333768efe3',
    'bf07d581-8b70-4380-83d4-601db3ae5f0a'
  ];

  -- Department lookup for each establishment
  v_est_dept uuid[];
  v_dept_arr uuid[];

  v_i int;
  v_est uuid;
  v_insp uuid;
  v_sup uuid;
  v_dept uuid;
  v_sched date;
  v_actual date;
  v_status text;
  v_compliance int;
  v_risk numeric;
  v_images int;
  v_findings jsonb;
  v_checklist jsonb;
  v_evidence jsonb;
  v_note text;
  v_total_pending int := 500;
  v_total_in_progress int := 250;
BEGIN

  -- Build department lookup: for each establishment, determine its department
  -- based on the department_id in the CSV (2nd column)
  -- We'll use a simple mapping based on position in the array
  v_dept_arr := ARRAY[
    v_dept_fssai, v_dept_if, v_dept_dfs, v_dept_if,
    v_dept_health, v_dept_dfs, v_dept_spcb, v_dept_fssai,
    v_dept_fssai, v_dept_health, v_dept_fssai, v_dept_dfs,
    v_dept_health, v_dept_if, v_dept_fssai, v_dept_if,
    v_dept_health, v_dept_health, v_dept_dfs, v_dept_health,
    v_dept_fssai, v_dept_spcb, v_dept_spcb, v_dept_dfs,
    v_dept_if, v_dept_if, v_dept_spcb, v_dept_health,
    v_dept_fssai, v_dept_dfs
  ];

  -- =========================================================
  -- INSERT PENDING INSPECTIONS (~200)
  -- =========================================================
  FOR v_i IN 1..v_total_pending LOOP
    v_est := v_est_uuids[1 + (v_i % array_length(v_est_uuids, 1))];
    v_insp := v_insp_uuids[1 + (v_i % array_length(v_insp_uuids, 1))];
    v_sup := v_sup_uuids[1 + (v_i % array_length(v_sup_uuids, 1))];
    v_dept := v_dept_arr[1 + (v_i % array_length(v_dept_arr, 1))];

    -- Schedule dates: mix of future, today, and recently overdue
    IF v_i <= 40 THEN
      v_sched := CURRENT_DATE + (v_i % 30);  -- next 30 days
    ELSIF v_i <= 80 THEN
      v_sched := CURRENT_DATE + 30 + (v_i % 60);  -- 30-90 days out
    ELSIF v_i <= 120 THEN
      v_sched := CURRENT_DATE - (v_i % 14);  -- overdue by up to 14 days
    ELSE
      v_sched := CURRENT_DATE + 90 + (v_i % 90);  -- 90-180 days out
    END IF;

    v_checklist := jsonb_build_object(
      'compliance', 0,
      'items', jsonb_build_array(
        jsonb_build_object('id', 'c1', 'label', 'General compliance check', 'status', 'pending'),
        jsonb_build_object('id', 'c2', 'label', 'Documentation review', 'status', 'pending')
      )
    );

    INSERT INTO public.inspections (
      id, establishment_id, department_id, inspector_id, supervisor_id,
      scheduled_date, status, checklist, findings, notes, created_at
    ) VALUES (
      gen_random_uuid(), v_est, v_dept, v_insp, v_sup,
      v_sched, 'pending',
      v_checklist,
      '{}'::jsonb,
      CASE
        WHEN v_sched < CURRENT_DATE THEN 'Overdue inspection — was scheduled for ' || v_sched::text
        WHEN v_sched = CURRENT_DATE THEN 'Scheduled for today — ' ||
          CASE v_dept
            WHEN v_dept_fssai THEN 'Food safety'
            WHEN v_dept_dfs THEN 'Fire safety'
            WHEN v_dept_spcb THEN 'Pollution control'
            WHEN v_dept_if THEN 'Factory safety'
            ELSE 'Healthcare'
          END || ' inspection'
        ELSE 'Upcoming ' ||
          CASE v_dept
            WHEN v_dept_fssai THEN 'food safety'
            WHEN v_dept_dfs THEN 'fire safety'
            WHEN v_dept_spcb THEN 'pollution control'
            WHEN v_dept_if THEN 'factory safety'
            ELSE 'healthcare'
          END || ' inspection scheduled for ' || v_sched::text
      END,
      now()
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- =========================================================
  -- INSERT IN-PROGRESS INSPECTIONS (~100)
  -- =========================================================
  FOR v_i IN 1..v_total_in_progress LOOP
    v_est := v_est_uuids[1 + (v_i % array_length(v_est_uuids, 1))];
    v_insp := v_insp_uuids[1 + (v_i % array_length(v_insp_uuids, 1))];
    v_sup := v_sup_uuids[1 + (v_i % array_length(v_sup_uuids, 1))];
    v_dept := v_dept_arr[1 + (v_i % array_length(v_dept_arr, 1))];

    -- Started 1-14 days ago
    v_sched := CURRENT_DATE - (1 + (v_i % 14));
    v_actual := v_sched;

    -- Randomize compliance progress (30-80%)
    v_compliance := 30 + (v_i % 50);
    v_risk := 20 + (v_i % 60);
    v_images := 1 + (v_i % 10);

    v_checklist := jsonb_build_object(
      'compliance', v_compliance,
      'items', jsonb_build_array(
        jsonb_build_object('id', 'c1', 'label', 'Primary compliance check', 'status', CASE WHEN v_i % 3 = 0 THEN 'fail' ELSE 'pass' END),
        jsonb_build_object('id', 'c2', 'label', 'Secondary review', 'status', CASE WHEN v_i % 4 = 0 THEN 'fail' ELSE 'pass' END),
        jsonb_build_object('id', 'c3', 'label', 'Final verification', 'status', 'pending')
      )
    );

    v_findings := jsonb_build_object(
      'summary', CASE
        WHEN v_i % 3 = 0 THEN 'Significant issues found in primary areas. Further investigation required.'
        WHEN v_i % 3 = 1 THEN 'Most checks passed. Pending final documentation review.'
        ELSE 'Initial assessment complete. Awaiting detailed inspection results.'
      END
    );

    v_evidence := jsonb_build_object('images', v_images, 'documents', (v_i % 4));

    INSERT INTO public.inspections (
      id, establishment_id, department_id, inspector_id, supervisor_id,
      scheduled_date, actual_date, status, checklist, findings,
      risk_score_at_inspection, evidence_summary, notes, created_at
    ) VALUES (
      gen_random_uuid(), v_est, v_dept, v_insp, v_sup,
      v_sched, v_actual, 'in_progress',
      v_checklist, v_findings, v_risk, v_evidence,
      CASE
        WHEN v_i % 3 = 0 THEN 'In-progress — significant issues being addressed'
        WHEN v_i % 3 = 1 THEN 'In-progress — most checks completed, pending final review'
        ELSE 'In-progress — initial findings being documented'
      END,
      now()
    ) ON CONFLICT DO NOTHING;
  END LOOP;

END $$;