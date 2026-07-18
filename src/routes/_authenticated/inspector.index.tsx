import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, FileText, MapPin, Play, Plus, Send, Upload, X } from "lucide-react";
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
type EvidenceFile = { name: string; type: string; size: number };
type Location = { latitude: number; longitude: number; captured_at: string };

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
  const queryClient = useQueryClient(); const save = useServerFn(saveInspectionDraft); const submit = useServerFn(submitInspection);
  const items = useMemo(() => checklistItems(inspection.template?.checklist_json), [inspection]);
  const [responses, setResponses] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(inspection.checklist ?? {}).map(([key, value]) => [key, String(value)])));
  const [findings, setFindings] = useState<Record<string, string>>(inspection.findings ?? {});
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [files, setFiles] = useState<EvidenceFile[]>(inspection.evidence_summary?.files ?? []);
  const [location, setLocation] = useState<Location | null>(inspection.evidence_summary?.location ?? null);
  const [locationText, setLocationText] = useState(inspection.evidence_summary?.location_text ?? inspection.establishment?.address ?? "");
  const [step, setStep] = useState<"checklist" | "evidence" | "review">("checklist"); const input = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  // Build the normalized payload for the new save/submit functions
  const buildPayload = () => ({
    id: inspection.id,
    responses: Object.entries(responses).map(([checklist_item_id, response]) => ({
      checklist_item_id,
      response,
      finding: findings[checklist_item_id] || "",
    })),
    evidence_files: files.map((file: EvidenceFile) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      observation: "",
    })),
    evidence_location: location,
    location_text: locationText,
    inspector_notes: notes,
  });

  const saveRecord = async (final: boolean) => {
    setIsSubmitting(true);
    try {
      await (final ? submit : save)({ data: buildPayload() });
      if (final) {
        setSubmitStatus("submitted");
        toast.success("Inspection submitted successfully! ✓ Inspection stored ✓ AI Risk Analysis initiated ✓ Evidence Verification in progress ✓ Report Generation queued");
      } else {
        toast.success("Draft saved successfully.");
      }
      queryClient.invalidateQueries({ queryKey: ["inspector-dashboard"] });
      if (final) setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      toast.error(error.message ?? "Could not save this inspection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const captureLocation = () => { if (!navigator.geolocation) return toast.error("Location is not supported by this browser."); navigator.geolocation.getCurrentPosition((pos) => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, captured_at: new Date().toISOString() }); toast.success("Current location captured."); }, () => toast.error("Allow location access in your browser, then try again."), { enableHighAccuracy: true }); };

  // Post-submission success screen
  if (submitStatus === "submitted") {
    return <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
      <div className="rounded-full bg-emerald-100 p-4 mx-auto w-16 h-16 flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
      <h2 className="text-2xl font-semibold">Inspection Submitted Successfully</h2>
      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-6 text-left shadow-sm">
        <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span className="text-sm">✓ Inspection stored</span></div>
        <div className="flex items-center gap-3"><div className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" /><span className="text-sm">AI Risk Analysis initiated</span></div>
        <div className="flex items-center gap-3"><div className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" /><span className="text-sm">Evidence Verification in progress</span></div>
        <div className="flex items-center gap-3"><div className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" /><span className="text-sm">Report Generation queued</span></div>
      </div>
      <p className="text-sm text-muted-foreground">Your inspection has been forwarded for supervisory review.</p>
    </div>;
  }

  return <div className="mx-auto max-w-5xl space-y-5 pb-12"><button onClick={onClose} className="text-sm font-medium text-primary hover:underline">← Back to dashboard</button><header className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><Badge className="bg-primary/10 text-primary hover:bg-primary/10">{inspection.department?.name}</Badge><h1 className="mt-3 text-2xl font-semibold">{inspection.establishment?.name}</h1><p className="mt-1 text-sm text-muted-foreground">{inspection.establishment?.address || "Address unavailable"} · {format(parseISO(inspection.scheduled_date), "dd MMMM yyyy")}</p></header>
    <section className="rounded-xl border border-border/70 bg-card shadow-sm"><div className="flex border-b border-border/60"><Step label="Checklist" value="checklist" active={step} set={setStep} /><Step label="Evidence & location" value="evidence" active={step} set={setStep} /><Step label="Review" value="review" active={step} set={setStep} /></div><div className="p-5">{step === "checklist" && <Checklist items={items} responses={responses} findings={findings} setResponses={setResponses} setFindings={setFindings} />}{step === "evidence" && <Evidence files={files} setFiles={setFiles} input={input} notes={notes} setNotes={setNotes} location={location} locationText={locationText} setLocationText={setLocationText} captureLocation={captureLocation} />}{step === "review" && <Review items={items} responses={responses} files={files} location={location} locationText={locationText} notes={notes} />}</div><div className="flex justify-between border-t border-border/60 p-4"><Button variant="outline" onClick={() => saveRecord(false)} disabled={isSubmitting}>Save draft</Button>{step !== "review" ? <Button onClick={() => setStep(step === "checklist" ? "evidence" : "review")}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button onClick={() => saveRecord(true)} disabled={isSubmitting}><Send className="mr-2 h-4 w-4" />{isSubmitting ? "Submitting…" : "Submit for analysis"}</Button>}</div></section></div>;
}

function Checklist({ items, responses, findings, setResponses, setFindings }: any) { return <div className="space-y-4"><div><h2 className="font-semibold">Inspection checklist</h2><p className="mt-1 text-sm text-muted-foreground">Select Safe or Complaint for each item. A complaint requires an observation.</p></div>{items.map((item: any, index: number) => <div key={item.id} className="rounded-lg border border-border/70 p-4"><p className="text-sm font-medium">{index + 1}. {item.label}</p><div className="mt-3 flex gap-2">{["Safe", "Complaint"].map((choice) => <button key={choice} onClick={() => setResponses({ ...responses, [item.id]: choice })} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${responses[item.id] === choice ? choice === "Complaint" ? "border-destructive bg-destructive/10 text-destructive" : "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>{choice}</button>)}</div>{responses[item.id] === "Complaint" && <Textarea value={findings[item.id] ?? ""} onChange={(e) => setFindings({ ...findings, [item.id]: e.target.value })} className="mt-3 min-h-20" placeholder="Describe the complaint or safety concern…" />}</div>)}</div>; }
function Evidence({ files, setFiles, input, notes, setNotes, location, locationText, setLocationText, captureLocation }: any) { return <div className="space-y-5"><div><h2 className="font-semibold">Evidence, notes & location</h2><p className="mt-1 text-sm text-muted-foreground">Images and inspector text are packaged as evidence input for the Evidence AI review queue.</p></div><input ref={input} className="hidden" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? []).map((file: any) => ({ name: file.name, type: file.type || "Document", size: file.size }))])} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => input.current?.click()}><Upload className="mr-2 h-4 w-4" />Add image or document</Button><Button variant="outline" onClick={captureLocation}><MapPin className="mr-2 h-4 w-4" />Capture GPS</Button></div><div><label className="text-sm font-medium">Inspection location</label><Input className="mt-2" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Enter establishment, street, locality, city, or landmark" /></div>{location && <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800">GPS captured: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</div>}{files.map((file: EvidenceFile, index: number) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-md border p-3"><FileText className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><Badge variant="secondary">Evidence AI</Badge><button onClick={() => setFiles(files.filter((_: EvidenceFile, i: number) => i !== index))}><X className="h-4 w-4" /></button></div>)}<div><label className="text-sm font-medium">Inspector observations for Evidence AI</label><Textarea className="mt-2 min-h-32" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe what is visible in the images and the observed safety concern…" /></div></div>; }
function Review({ items, responses, files, location, locationText, notes }: any) {
  const complaints = items.filter((item: any) => responses[item.id] === "Complaint").length;
  const images = files.filter((file: EvidenceFile) => file.type.startsWith("image/")).length;
  const displayedLocation = locationText?.trim() || (location ? `GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "No inspection location captured");
  return <div className="space-y-4"><h2 className="font-semibold">Review before submission</h2><div className="grid grid-cols-3 gap-3"><Metric label="Responses" value={`${Object.keys(responses).length}/${items.length}`} /><Metric label="Complaints" value={complaints} /><Metric label="Evidence" value={files.length} /></div><div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm"><div className="font-medium">Inspection location</div><p className="mt-1 text-muted-foreground">{displayedLocation}</p>{location && <p className="mt-1 text-xs text-muted-foreground">GPS coordinates: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>}</div><div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"><div className="font-medium text-primary">Evidence AI handoff</div><p className="mt-1 text-muted-foreground">{images} image(s), {notes ? "inspector observations" : "no observations"}, and the saved location are ready to accompany this inspection for AI analysis.</p></div></div>;
}
function checklistItems(json: any) { const raw = Array.isArray(json) ? json : json?.items ?? json?.checklist ?? []; return raw.length ? raw.map((item: any, index: number) => ({ id: String(item.id ?? `item-${index + 1}`), label: item.label ?? item.question ?? item.title ?? `Checkpoint ${index + 1}` })) : [{ id: "premises", label: "Are the premises clean and safe?" }, { id: "records", label: "Are required licences and records available?" }]; }
function Stat({ label, value, icon: Icon, tone }: any) { const colour = tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-primary"; return <Card><CardContent className="p-4"><div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>{label}</span><Icon className={`h-4 w-4 ${colour}`} /></div><div className="mt-3 text-2xl font-semibold">{value}</div></CardContent></Card>; }
function InspectionCard({ inspection, onOpen }: any) { return <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm hover:border-primary/40"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex gap-2"><h3 className="truncate font-semibold">{inspection.establishment?.name}</h3><Status status={inspection.status} /></div><p className="mt-1 text-sm text-muted-foreground">{inspection.department?.name} · {format(parseISO(inspection.scheduled_date), "dd MMM yyyy")}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>; }
function Status({ status }: any) { return <Badge variant="secondary" className="capitalize">{String(status).replace("_", " ")}</Badge>; }
function Step({ label, value, active, set }: any) { return <button onClick={() => set(value)} className={`flex-1 px-2 py-3 text-xs font-medium ${active === value ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>{label}</button>; }
function Metric({ label, value }: any) { return <div className="rounded-lg border p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>; }
function Empty({ label }: { label: string }) { return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{label}</div>; }
