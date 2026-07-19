import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, FileText, MapPin, Play, Plus, Send, Upload, X, AlertTriangle, CheckCircle, Image, Camera, ShieldAlert, Hash, FileWarning } from "lucide-react";
import { createInspectorCase, getInspectorDashboard, saveInspectionDraft, seedInspectorDemoCases, submitInspection } from "@/lib/inspector.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inspector/")({
  validateSearch: z.object({ view: z.enum(["overview", "assignments", "history"]).optional() }),
  component: InspectorDashboard,
});

type Inspection = any;
type EvidenceFile = { name: string; type: string; size: number; category: string; remark?: string };
type Location = { latitude: number; longitude: number; captured_at: string };

const EVIDENCE_CATEGORIES = [
  { value: "kitchen", label: "Kitchen" },
  { value: "fire_exit", label: "Fire Exit" },
  { value: "license", label: "License" },
  { value: "storage", label: "Storage" },
  { value: "equipment", label: "Equipment" },
] as const;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function InspectorDashboard() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const dashboard = useServerFn(getInspectorDashboard);
  const seedDemoCases = useServerFn(seedInspectorDemoCases);
  const { data, isLoading, error } = useQuery({ queryKey: ["inspector-dashboard"], queryFn: () => dashboard() });
  const [view, setView] = useState<"overview" | "assignments" | "history">(search.view ?? "overview");
  const [department, setDepartment] = useState("all");
  const [active, setActive] = useState<Inspection | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const demoSeeded = useRef(false);
  useEffect(() => { if (search.view) setView(search.view); }, [search.view]);
  useEffect(() => {
    if (demoSeeded.current || !data?.departments?.length) return;
    const counts = new Map<string, number>();
    for (const inspection of data.inspections ?? []) {
      if (inspection.status !== "completed") counts.set(inspection.department_id, (counts.get(inspection.department_id) ?? 0) + 1);
    }
    const schools = data.departments.find((item: any) => item.name === "Schools");
    const schoolNeedsCases = !schools || (counts.get(schools.id) ?? 0) < 5;
    if (!schoolNeedsCases && !data.departments.some((item: any) => (counts.get(item.id) ?? 0) < 5)) return;
    demoSeeded.current = true;
    createDemoQueue();
  }, [data]);
  const inspections = data?.inspections ?? [];
  if (active) return <InspectionWorkspace inspection={active} onClose={() => setActive(null)} />;
  const assigned = inspections.filter((i: Inspection) => i.status !== "completed");
  const completed = inspections.filter((i: Inspection) => i.status === "completed");
  const inProgress = inspections.filter((i: Inspection) => i.status === "in_progress");
  const departments = Array.from(new Set(["Food Safety", "Healthcare", "Schools", ...inspections.map((inspection: Inspection) => inspection.department?.name).filter(Boolean)]));
  const source = view === "history" ? completed : assigned;
  const shown = source.filter((inspection: Inspection) => department === "all" || inspection.department?.name === department).slice(0, 5);
  const next = assigned.find((inspection: Inspection) => department === "all" || inspection.department?.name === department);
  const createDemoQueue = async () => { setIsSeeding(true); try { const result = await seedDemoCases(); await queryClient.invalidateQueries({ queryKey: ["inspector-dashboard"] }); toast.success(result.created.length ? `Created five cases for ${result.created.length} department(s).` : "Demo cases already exist for every department."); } catch (error: any) { toast.error(error.message ?? "Could not create demo cases."); } finally { setIsSeeding(false); } };

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-medium uppercase tracking-[.14em] text-muted-foreground">NIRIKSHA <ChevronRight className="inline h-3 w-3" /> Field operations</div><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Inspector {data?.profile?.name?.split(" ")[0] ?? "Workspace"}</h1><p className="mt-1 text-sm text-muted-foreground">Your assignments, field evidence, and submitted inspection reports.</p></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={isSeeding} onClick={createDemoQueue}>{isSeeding ? "Creating cases…" : "Create department demo cases"}</Button><NewCaseDialog departments={data?.departments ?? []} onCreated={() => queryClient.invalidateQueries({ queryKey: ["inspector-dashboard"] })} /></div></header>
    <section className="grid grid-cols-3 gap-3"><Stat label="Assigned" value={assigned.length} icon={ClipboardCheck} /><Stat label="In progress" value={inProgress.length} icon={Clock3} tone="amber" /><Stat label="Completed" value={completed.length} icon={CheckCircle2} tone="emerald" /></section>
    <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Cases by department</h2><p className="mt-0.5 text-xs text-muted-foreground">Select a department to filter the visible case queue.</p></div><Badge variant="outline">{department === "all" ? "All departments" : department}</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{departments.map((name) => { const count = assigned.filter((inspection: Inspection) => inspection.department?.name === name).length; return <button key={name} onClick={() => setDepartment(name)} className={`rounded-lg border p-3 text-left transition hover:border-primary/50 ${department === name ? "border-primary bg-primary/5" : "border-border/70"}`}><div className="text-xs text-muted-foreground">{name}</div><div className="mt-1 text-xl font-semibold">{count}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">assigned cases</div></button>; })}</div></section>
    {next && <section className="rounded-2xl border border-primary/20 bg-primary p-5 text-primary-foreground"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/65">Next inspection</div><h2 className="mt-2 text-xl font-semibold">{next.establishment?.name}</h2><p className="mt-1 text-sm text-primary-foreground/70">{next.department?.name} · {format(parseISO(next.scheduled_date), "dd MMM yyyy")}</p></div><Button onClick={() => setActive(next)} className="bg-white text-primary hover:bg-white/90"><Play className="mr-2 h-4 w-4" />{next.status === "in_progress" ? "Resume" : "Start"}</Button></div></section>}
    <Tabs value={view} onValueChange={(value: any) => setView(value)}><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="assignments">Assigned inspections</TabsTrigger><TabsTrigger value="history">Inspection history</TabsTrigger></TabsList></Tabs>
    <section><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{view === "history" ? "Inspection history" : "Assigned inspections"}</h2><p className="mt-0.5 text-xs text-muted-foreground">Showing up to five records for a focused field queue.</p></div><span className="text-xs text-muted-foreground">{shown.length} records</span></div><div className="mb-4 flex flex-wrap gap-2"><button onClick={() => setDepartment("all")} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${department === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>All departments</button>{departments.map((name) => <button key={name} onClick={() => setDepartment(name)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${department === name ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{name}</button>)}</div><div className="space-y-3">{isLoading && <Empty label="Loading inspections…" />}{error && <Empty label={`Could not load inspections: ${error.message}`} />}{!isLoading && !error && !shown.length && <Empty label="No inspections to display for this department." />}{shown.map((inspection: Inspection) => <InspectionCard key={inspection.id} inspection={inspection} onOpen={() => setActive(inspection)} />)}</div></section>
  </div>;
}

function NewCaseDialog({ departments, onCreated }: { departments: Array<{ id: string; name: string }>; onCreated: () => void }) {
  const createCase = useServerFn(createInspectorCase);
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [caseLocation, setCaseLocation] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => {
    setDepartmentId("");
    setEstablishmentName("");
    setCaseLocation("");
  };

  const createNewCase = async (event: any) => {
    event.preventDefault();
    if (!departmentId || !establishmentName.trim() || !caseLocation.trim()) {
      toast.error("Choose a department and enter the establishment name and inspection location.");
      return;
    }

    setIsCreating(true);
    try {
      await createCase({ data: { department_id: departmentId, establishment_name: establishmentName.trim(), location: caseLocation.trim() } });
      toast.success("New inspection case created and assigned to you.");
      reset();
      setOpen(false);
      onCreated();
    } catch (error: any) {
      toast.error(error.message ?? "Could not create the inspection case.");
    } finally {
      setIsCreating(false);
    }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}>
    <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New case</Button>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create inspection case</DialogTitle>
        <DialogDescription>Choose the department, establishment, and the location the inspector will visit.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={createNewCase}>
        <div>
          <label className="text-sm font-medium">Department</label>
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
            <option value="">Select department</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Establishment name</label>
          <Input className="mt-1.5" value={establishmentName} onChange={(event) => setEstablishmentName(event.target.value)} placeholder="e.g. Green Leaf Restaurant" required />
        </div>
        <div>
          <label className="text-sm font-medium">Inspection location</label>
          <Textarea className="mt-1.5 min-h-20" value={caseLocation} onChange={(event) => setCaseLocation(event.target.value)} placeholder="Street, locality, city, landmark or full address" required />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={isCreating}>{isCreating ? "Creating…" : "Create case"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

function InspectionWorkspace({ inspection, onClose }: { inspection: Inspection; onClose: () => void }) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveInspectionDraft);
  const submit = useServerFn(submitInspection);
  const items = useMemo(() => checklistItems(inspection.template?.checklist_json, inspection.department?.name), [inspection]);
  const [responses, setResponses] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(inspection.checklist ?? {}).map(([key, value]) => [key, String(value)])));
  const [findings, setFindings] = useState<Record<string, string>>(inspection.findings ?? {});
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [files, setFiles] = useState<EvidenceFile[]>(inspection.evidence_summary?.files ?? []);
  const [location, setLocation] = useState<Location | null>(inspection.evidence_summary?.location ?? null);
  const [locationText, setLocationText] = useState(inspection.evidence_summary?.location_text ?? inspection.establishment?.address ?? "");
  const [step, setStep] = useState<"checklist" | "evidence" | "review">("checklist");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [locationVerifying, setLocationVerifying] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<string>("");
  const hasChanges = useRef(false);

  // Track changes for auto-save
  const getStateHash = useCallback(() => {
    return JSON.stringify({ responses, findings, notes, files, location, locationText });
  }, [responses, findings, notes, files, location, locationText]);

  // Auto-save every 30 seconds when changes exist
  useEffect(() => {
    const checkAndSave = async () => {
      const currentHash = getStateHash();
      if (currentHash !== lastSavedRef.current) {
        hasChanges.current = true;
        lastSavedRef.current = currentHash;
        try {
          const payload = buildPayload();
          await save({ data: payload });
          console.log("[Auto-save] Draft saved at", new Date().toLocaleTimeString());
        } catch (err: any) {
          console.warn("[Auto-save] Failed:", err.message);
        }
      }
    };

    autoSaveTimer.current = setInterval(checkAndSave, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [getStateHash, save]);

  const buildPayload = useCallback(() => ({
    id: inspection.id,
    checklist: responses,
    findings,
    notes,
    evidence_summary: {
      files,
      location,
      location_text: locationText,
      ai_handoff: {
        image_count: files.filter((file) => file.type.startsWith("image/")).length,
        has_inspector_notes: Boolean(notes.trim()),
        status: "queued_for_evidence_ai_review" as const,
      },
    },
  }), [inspection.id, responses, findings, notes, files, location, locationText]);

  // Validate the entire inspection before submission
  const validateInspection = useCallback((): string[] => {
    const errors: string[] = [];

    // 1. Checklist Validation - all items must be answered
    const unanswered = items.filter((item: any) => !responses[item.id]);
    if (unanswered.length > 0) {
      errors.push(`Checklist incomplete: ${unanswered.length} item(s) not answered.`);
    }

    // 2. Observation Validation - findings must be meaningful
    for (const [itemId, finding] of Object.entries(findings)) {
      if (responses[itemId] === "Complaint") {
        const trimmed = (finding as string).trim();
        if (!trimmed || trimmed.length < 10 || trimmed === "..." || trimmed === ".") {
          const item = items.find((i: any) => i.id === itemId);
          errors.push(`"${item?.label || itemId}" requires a detailed observation (min 10 characters).`);
        }
      }
    }

    // 3. Mandatory Evidence for Non-Compliance
    const complaintItems = items.filter((item: any) => responses[item.id] === "Complaint");
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (complaintItems.length > 0 && imageFiles.length === 0) {
      errors.push(`${complaintItems.length} complaint(s) found. At least 1 photo is required as evidence.`);
    }

    // 4. Image Validation
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          errors.push(`"${file.name}" has unsupported image format. Use JPEG, PNG, WebP, or HEIC.`);
        }
        if (file.size > MAX_IMAGE_SIZE) {
          errors.push(`"${file.name}" exceeds 10MB size limit.`);
        }
      }
    }

    // 5. Location Validation
    if (!location) {
      errors.push("GPS location not captured. Please capture your current location before submitting.");
    }

    return errors;
  }, [items, responses, findings, files, location]);

  // Verify GPS proximity to establishment address
  const verifyLocationProximity = useCallback(async () => {
    if (!location || !inspection.establishment?.address) {
      toast.error("GPS location or establishment address missing for proximity check.");
      return;
    }
    setLocationVerifying(true);
    try {
      // Use OpenStreetMap Nominatim to geocode the address
      const address = encodeURIComponent(inspection.establishment.address);
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${address}&format=json&limit=1`,
        { headers: { "User-Agent": "NirikshaInspector/1.0" } }
      );
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        toast.warning("Could not geocode the establishment address. Location saved but proximity not verified.");
        setLocationVerified(null);
        return;
      }
      const estLat = parseFloat(geoData[0].lat);
      const estLon = parseFloat(geoData[0].lon);
      // Haversine distance in meters
      const R = 6371000;
      const dLat = (estLat - location.latitude) * Math.PI / 180;
      const dLon = (estLon - location.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(location.latitude * Math.PI / 180) * Math.cos(estLat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      const withinRange = distance < 200; // within 200 meters
      setLocationVerified(withinRange);
      if (withinRange) {
        toast.success(`Location verified: ${Math.round(distance)}m from establishment.`);
      } else {
        toast.warning(`Location is ${Math.round(distance)}m from establishment address. Consider recapturing.`);
      }
    } catch (err: any) {
      toast.error("Could not verify location proximity. Network error.");
      setLocationVerified(null);
    } finally {
      setLocationVerifying(false);
    }
  }, [location, inspection.establishment?.address]);

  const saveRecord = async (final: boolean) => {
    if (final) {
      const errors = validateInspection();
      setValidationErrors(errors);
      if (errors.length > 0) {
        toast.error(`Cannot submit: ${errors.length} issue(s) found.`);
        return;
      }
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }
    try {
      const payload = buildPayload();
      await (final ? submit : save)({ data: payload });
      lastSavedRef.current = getStateHash();
      toast.success(final ? "Inspection successfully submitted for analysis." : "Draft saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["inspector-dashboard"] });
      if (final) onClose();
    } catch (error: any) {
      toast.error(error.message ?? "Could not save this inspection.");
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) return toast.error("Location is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, captured_at: new Date().toISOString() });
        toast.success("Current location captured.");
        setLocationVerified(null);
      },
      () => toast.error("Allow location access in your browser, then try again."),
      { enableHighAccuracy: true }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    const validated: EvidenceFile[] = [];
    for (const file of newFiles) {
      const isImage = file.type.startsWith("image/");
      const isDoc = ALLOWED_DOC_TYPES.includes(file.type);
      if (!isImage && !isDoc) {
        toast.error(`"${file.name}" has unsupported format. Use images (JPEG, PNG, WebP) or PDF/DOC.`);
        continue;
      }
      if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.warning(`"${file.name}" format may not be supported on all devices.`);
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`"${file.name}" exceeds 10MB limit.`);
        continue;
      }
      validated.push({
        name: file.name,
        type: file.type || (isImage ? "image/jpeg" : "application/pdf"),
        size: file.size,
        category: "",
      });
    }
    if (validated.length > 0) {
      setFiles([...files, ...validated]);
      toast.success(`${validated.length} file(s) added. Please assign categories.`);
    }
    // Reset input so same file can be re-selected
    if (input.current) input.current.value = "";
  };

  const updateFileCategory = (index: number, category: string) => {
    const updated = [...files];
    updated[index] = { ...updated[index], category };
    setFiles(updated);
  };

  const updateFileRemark = (index: number, remark: string) => {
    const updated = [...files];
    updated[index] = { ...updated[index], remark };
    setFiles(updated);
  };

  return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <button onClick={onClose} className="text-sm font-medium text-primary hover:underline">← Back to dashboard</button>
    <header className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{inspection.department?.name}</Badge>
      <h1 className="mt-3 text-2xl font-semibold">{inspection.establishment?.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{inspection.establishment?.address || "Address unavailable"} · {format(parseISO(inspection.scheduled_date), "dd MMMM yyyy")}</p>
    </header>
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex border-b border-border/60">
        <Step label="Checklist" value="checklist" active={step} set={setStep} />
        <Step label="Evidence & location" value="evidence" active={step} set={setStep} />
        <Step label="Review" value="review" active={step} set={setStep} />
      </div>
      <div className="p-5">
        {step === "checklist" && (
          <Checklist
            items={items}
            responses={responses}
            findings={findings}
            setResponses={setResponses}
            setFindings={setFindings}
          />
        )}
        {step === "evidence" && (
          <Evidence
            files={files}
            setFiles={setFiles}
            input={input}
            notes={notes}
            setNotes={setNotes}
            location={location}
            locationText={locationText}
            setLocationText={setLocationText}
            captureLocation={captureLocation}
            verifyLocationProximity={verifyLocationProximity}
            locationVerified={locationVerified}
            locationVerifying={locationVerifying}
            updateFileCategory={updateFileCategory}
            updateFileRemark={updateFileRemark}
          />
        )}
        {step === "review" && (
          <Review
            items={items}
            responses={responses}
            findings={findings}
            files={files}
            location={location}
            locationText={locationText}
            notes={notes}
            validationErrors={validationErrors}
          />
        )}
      </div>
      <div className="flex justify-between border-t border-border/60 p-4">
        <Button variant="outline" onClick={() => saveRecord(false)} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save draft"}
        </Button>
        {step !== "review" ? (
          <Button onClick={() => setStep(step === "checklist" ? "evidence" : "review")}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => saveRecord(true)} disabled={isSubmitting}>
            {isSubmitting ? (
              <>Submitting…</>
            ) : (
              <><Send className="mr-2 h-4 w-4" />Submit for analysis</>
            )}
          </Button>
        )}
      </div>
    </section>
  </div>;
}

function Checklist({ items, responses, findings, setResponses, setFindings }: any) {
  const unanswered = items.filter((item: any) => !responses[item.id]);
  return <div className="space-y-4">
    <div>
      <h2 className="font-semibold">Inspection checklist</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Select Safe or Complaint for each item. A complaint requires a detailed observation.
      </p>
      {unanswered.length > 0 && (
        <p className="mt-2 text-xs text-amber-600 font-medium">
          {unanswered.length} item(s) remaining
        </p>
      )}
    </div>
    {items.map((item: any, index: number) => {
      const isUnanswered = !responses[item.id];
      return <div key={item.id} className={`rounded-lg border p-4 ${isUnanswered ? "border-amber-300 bg-amber-50/30" : "border-border/70"}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{index + 1}. {item.label}</p>
          {isUnanswered && <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-300">Required</Badge>}
        </div>
        <div className="mt-3 flex gap-2">
          {["Safe", "Complaint"].map((choice) => (
            <button
              key={choice}
              onClick={() => setResponses({ ...responses, [item.id]: choice })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                responses[item.id] === choice
                  ? choice === "Complaint"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {choice === "Safe" ? <><CheckCircle className="inline h-3 w-3 mr-1" />Safe</> : <><AlertTriangle className="inline h-3 w-3 mr-1" />Complaint</>}
            </button>
          ))}
        </div>
        {responses[item.id] === "Complaint" && (
          <div className="mt-3">
            <Textarea
              value={findings[item.id] ?? ""}
              onChange={(e) => setFindings({ ...findings, [item.id]: e.target.value })}
              className={`min-h-20 ${findings[item.id]?.trim() && findings[item.id]?.trim().length < 10 ? "border-amber-400" : ""}`}
              placeholder="Describe the complaint or safety concern in detail (min 10 characters)…"
            />
            {findings[item.id]?.trim() && findings[item.id]?.trim().length < 10 && (
              <p className="mt-1 text-xs text-amber-600">Observation too short. Please provide at least 10 characters.</p>
            )}
          </div>
        )}
      </div>;
    })}
  </div>;
}

function Evidence({
  files, setFiles, input, notes, setNotes, location, locationText, setLocationText,
  captureLocation, verifyLocationProximity, locationVerified, locationVerifying,
  updateFileCategory, updateFileRemark,
}: any) {
  return <div className="space-y-5">
    <div>
      <h2 className="font-semibold">Evidence, notes & location</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload evidence with categories. Images and inspector text are packaged for AI review.
      </p>
    </div>

    <input
      ref={input}
      className="hidden"
      type="file"
      multiple
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      onChange={(e) => {
        const handler = input.current?.dataset.onchange;
        if (handler === "handleFileUpload") return;
        // The actual handler is passed via props, but we use the ref's dataset to trigger
      }}
    />

    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => {
        // Create a synthetic file input click
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        fileInput.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const newFiles = Array.from(target.files ?? []) as File[];
          const validated: EvidenceFile[] = [];
          for (const f of newFiles) {
            const isImage = f.type.startsWith("image/");
            const isDoc = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type);
            if (!isImage && !isDoc) {
              toast.error(`"${f.name}" has unsupported format.`);
              continue;
            }
            if (f.size > 10 * 1024 * 1024) {
              toast.error(`"${f.name}" exceeds 10MB limit.`);
              continue;
            }
            validated.push({
              name: f.name,
              type: f.type || (isImage ? "image/jpeg" : "application/pdf"),
              size: f.size,
              category: "",
            });
          }
          if (validated.length > 0) {
            setFiles((prev: EvidenceFile[]) => [...prev, ...validated]);
            toast.success(`${validated.length} file(s) added. Please assign categories.`);
          }
        };
        fileInput.click();
      }}>
        <Upload className="mr-2 h-4 w-4" />Add image or document
      </Button>
      <Button variant="outline" onClick={captureLocation}>
        <MapPin className="mr-2 h-4 w-4" />Capture GPS
      </Button>
      {location && (
        <Button variant="outline" onClick={verifyLocationProximity} disabled={locationVerifying}>
          <ShieldAlert className="mr-2 h-4 w-4" />
          {locationVerifying ? "Verifying…" : "Verify proximity"}
        </Button>
      )}
    </div>

    {locationVerified === true && (
      <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800 flex items-center gap-2">
        <CheckCircle className="h-4 w-4" /> Location verified within 200m of establishment.
      </div>
    )}
    {locationVerified === false && (
      <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> Location is far from establishment address. Consider recapturing.
      </div>
    )}

    <div>
      <label className="text-sm font-medium">Inspection location</label>
      <Input className="mt-2" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Enter establishment, street, locality, city, or landmark" />
    </div>

    {location && (
      <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800">
        GPS captured: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
      </div>
    )}

    {/* Files with categories */}
    {files.map((file: EvidenceFile, index: number) => (
      <div key={`${file.name}-${index}`} className="rounded-lg border border-border/70 p-3 space-y-2">
        <div className="flex items-center gap-3">
          {file.type.startsWith("image/") ? (
            <Camera className="h-4 w-4 text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-primary" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
          <Badge variant="secondary">{file.type.startsWith("image/") ? "Image" : "Document"}</Badge>
          <button onClick={() => setFiles(files.filter((_: EvidenceFile, i: number) => i !== index))}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={file.category}
            onChange={(e) => updateFileCategory(index, e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Select category…</option>
            {EVIDENCE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <Input
            className="h-8 w-48 text-xs"
            placeholder="Optional remark…"
            value={file.remark ?? ""}
            onChange={(e) => updateFileRemark(index, e.target.value)}
          />
        </div>
      </div>
    ))}

    <div>
      <label className="text-sm font-medium">Inspector observations for Evidence AI</label>
      <Textarea className="mt-2 min-h-32" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe what is visible in the images and the observed safety concern…" />
    </div>
  </div>;
}

function Review({ items, responses, findings, files, location, locationText, notes, validationErrors }: any) {
  const complaints = items.filter((item: any) => responses[item.id] === "Complaint");
  const safeItems = items.filter((item: any) => responses[item.id] === "Safe");
  const unanswered = items.filter((item: any) => !responses[item.id]);
  const images = files.filter((file: EvidenceFile) => file.type.startsWith("image/"));
  const documents = files.filter((file: EvidenceFile) => !file.type.startsWith("image/"));
  const categorizedFiles = files.filter((file: EvidenceFile) => file.category);
  const uncategorizedFiles = files.filter((file: EvidenceFile) => !file.category);
  const displayedLocation = locationText?.trim() || (location ? `GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "No inspection location captured");

  // Check if each complaint has at least one image
  const missingEvidenceForComplaints = complaints.length > 0 && images.length === 0;

  return <div className="space-y-4">
    <h2 className="font-semibold">Review before submission</h2>

    {/* Validation errors banner */}
    {validationErrors.length > 0 && (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
          <FileWarning className="h-4 w-4" /> {validationErrors.length} issue(s) must be resolved
        </h3>
        <ul className="mt-2 space-y-1">
          {validationErrors.map((err: string, i: number) => (
            <li key={i} className="text-xs text-destructive/80 flex items-start gap-2">
              <span>•</span> {err}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Summary metrics */}
    <div className="grid grid-cols-4 gap-3">
      <Metric label="Responses" value={`${Object.keys(responses).length}/${items.length}`} />
      <Metric label="Safe" value={safeItems.length} />
      <Metric label="Complaints" value={complaints.length} />
      <Metric label="Evidence" value={files.length} />
    </div>

    {/* Checklist detail */}
    <div className="rounded-lg border border-border/70 p-4">
      <h3 className="text-sm font-semibold mb-3">Checklist items</h3>
      <div className="space-y-2">
        {items.map((item: any, index: number) => {
          const response = responses[item.id];
          const isComplaint = response === "Complaint";
          const isSafe = response === "Safe";
          const isUnanswered = !response;
          const finding = findings[item.id];
          const hasValidFinding = finding?.trim() && finding.trim().length >= 10 && finding.trim() !== "...";

          return (
            <div key={item.id} className={`flex items-start gap-3 rounded-md p-2 ${
              isUnanswered ? "bg-amber-50" : isComplaint ? "bg-red-50" : "bg-emerald-50"
            }`}>
              {isUnanswered ? (
                <X className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              ) : isComplaint ? (
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{index + 1}. {item.label}</span>
                  {isUnanswered && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Unanswered</Badge>}
                  {isComplaint && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Complaint</Badge>}
                  {isSafe && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Safe</Badge>}
                </div>
                {isComplaint && (
                  <div className="mt-1">
                    {hasValidFinding ? (
                      <p className="text-xs text-muted-foreground">{finding}</p>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Missing or insufficient observation
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Evidence summary */}
    <div className="rounded-lg border border-border/70 p-4">
      <h3 className="text-sm font-semibold mb-3">Evidence files</h3>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">No evidence files uploaded.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{images.length} image(s)</span>
            <span>{documents.length} document(s)</span>
            <span>{categorizedFiles.length} categorized</span>
            {uncategorizedFiles.length > 0 && (
              <span className="text-amber-600 font-medium">{uncategorizedFiles.length} uncategorized</span>
            )}
          </div>
          {missingEvidenceForComplaints && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {complaints.length} complaint(s) require at least 1 photo
            </p>
          )}
          {files.map((file: EvidenceFile, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {file.type.startsWith("image/") ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span className="truncate">{file.name}</span>
              {file.category && <Badge variant="secondary" className="text-[10px]">{EVIDENCE_CATEGORIES.find(c => c.value === file.category)?.label || file.category}</Badge>}
              {file.remark && <span className="text-muted-foreground">— {file.remark}</span>}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Location */}
    <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm">
      <div className="font-medium">Inspection location</div>
      <p className="mt-1 text-muted-foreground">{displayedLocation}</p>
      {location && <p className="mt-1 text-xs text-muted-foreground">GPS coordinates: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>}
      {!location && <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> GPS not captured</p>}
    </div>

    {/* AI handoff */}
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
      <div className="font-medium text-primary">Evidence AI handoff</div>
      <p className="mt-1 text-muted-foreground">
        {images.length} image(s), {notes ? "inspector observations" : "no observations"}, and the saved location are ready to accompany this inspection for AI analysis.
      </p>
    </div>
  </div>;
}

function checklistItems(json: any, departmentName?: string) {
  const raw = Array.isArray(json) ? json : json?.items ?? json?.checklist ?? [];
  if (raw.length) {
    return raw.map((item: any, index: number) => ({
      id: String(item.id ?? `item-${index + 1}`),
      label: item.label ?? item.question ?? item.title ?? `Checkpoint ${index + 1}`,
    }));
  }
  // Department-specific fallback checklists
  const dept = departmentName?.toLowerCase() ?? "";
  if (dept.includes("food")) {
    return [
      { id: "food_storage", label: "Are food items stored at correct temperatures?" },
      { id: "food_hygiene", label: "Is the kitchen hygiene maintained?" },
      { id: "food_license", label: "Are FSSAI license and records displayed?" },
      { id: "food_pest", label: "Is pest control maintained?" },
      { id: "food_waste", label: "Is waste disposal proper?" },
    ];
  }
  if (dept.includes("fire")) {
    return [
      { id: "fire_extinguisher", label: "Are fire extinguishers accessible and serviced?" },
      { id: "fire_exit", label: "Are fire exits clearly marked and unobstructed?" },
      { id: "fire_alarm", label: "Is the fire alarm system functional?" },
      { id: "fire_sprinkler", label: "Are sprinkler systems operational?" },
      { id: "fire_drill", label: "Are fire drill records maintained?" },
    ];
  }
  if (dept.includes("health")) {
    return [
      { id: "health_cleanliness", label: "Is the premises clean and sanitized?" },
      { id: "health_equipment", label: "Are medical equipment properly sterilized?" },
      { id: "health_waste", label: "Is biomedical waste segregated and disposed correctly?" },
      { id: "health_license", label: "Are required healthcare licenses displayed?" },
      { id: "health_staff", label: "Are staff credentials and training records available?" },
    ];
  }
  if (dept.includes("school")) {
    return [
      { id: "school_building", label: "Is the building structure safe?" },
      { id: "school_fire", label: "Are fire safety measures in place?" },
      { id: "school_sanitation", label: "Are toilets and sanitation facilities adequate?" },
      { id: "school_drinking", label: "Is safe drinking water available?" },
      { id: "school_playground", label: "Is the playground equipment safe?" },
    ];
  }
  if (dept.includes("pollution") || dept.includes("environment")) {
    return [
      { id: "pollution_emission", label: "Are emission control systems operational?" },
      { id: "pollution_effluent", label: "Is effluent treatment working properly?" },
      { id: "pollution_waste", label: "Is hazardous waste stored and disposed correctly?" },
      { id: "pollution_noise", label: "Are noise levels within permissible limits?" },
      { id: "pollution_license", label: "Are pollution control board consents valid?" },
    ];
  }
  if (dept.includes("factory") || dept.includes("industrial")) {
    return [
      { id: "factory_safety", label: "Are safety guards on machinery in place?" },
      { id: "factory_ppe", label: "Are workers using required PPE?" },
      { id: "factory_ventilation", label: "Is ventilation adequate?" },
      { id: "factory_electrical", label: "Are electrical installations safe?" },
      { id: "factory_fire", label: "Are fire safety measures adequate?" },
    ];
  }
  // Generic fallback
  return [
    { id: "premises", label: "Are the premises clean and safe?" },
    { id: "records", label: "Are required licences and records available?" },
    { id: "safety", label: "Are safety measures in place?" },
    { id: "staff", label: "Are staff trained and qualified?" },
    { id: "equipment", label: "Is equipment properly maintained?" },
  ];
}

function Stat({ label, value, icon: Icon, tone }: any) {
  const colour = tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-primary";
  return <Card><CardContent className="p-4"><div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>{label}</span><Icon className={`h-4 w-4 ${colour}`} /></div><div className="mt-3 text-2xl font-semibold">{value}</div></CardContent></Card>;
}

function InspectionCard({ inspection, onOpen }: any) {
  return <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm hover:border-primary/40">
    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
    <div className="min-w-0 flex-1">
      <div className="flex gap-2"><h3 className="truncate font-semibold">{inspection.establishment?.name}</h3><Status status={inspection.status} /></div>
      <p className="mt-1 text-sm text-muted-foreground">{inspection.department?.name} · {format(parseISO(inspection.scheduled_date), "dd MMM yyyy")}</p>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </button>;
}

function Status({ status }: any) { return <Badge variant="secondary" className="capitalize">{String(status).replace("_", " ")}</Badge>; }
function Step({ label, value, active, set }: any) { return <button onClick={() => set(value)} className={`flex-1 px-2 py-3 text-xs font-medium ${active === value ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>{label}</button>; }
function Metric({ label, value }: any) { return <div className="rounded-lg border p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>; }
function Empty({ label }: { label: string }) { return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{label}</div>; }