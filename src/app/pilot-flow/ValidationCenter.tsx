"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import UiNode from "@/lib/i18n/UiNode";
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import Link from "@/lib/i18n/UiLink";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { DENTAYA_RELEASE } from "@/lib/release";
import { VALIDATION_REQUIREMENTS, VALIDATION_SCOPES, VALIDATION_OUTCOMES, VALIDATION_SEVERITIES, latestValidationRuns, validationDraftError, validationReport, validationCsv, type ValidationRun, type ValidationScope, type ValidationOutcome, type ValidationSeverity } from "@/lib/validation-center";

const PAGE_SIZE = 200;
export default function ValidationCenter({ organizationId, role, caseId }: { organizationId:string; role:string; caseId?:string }) {
  const { t, intlLocale } = useTranslation();
  const [runs,setRuns] = useState<ValidationRun[]>([]);
  const [loading,setLoading] = useState(true);
  const [hasMore,setHasMore] = useState(false);
  const [schemaMissing,setSchemaMissing] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [loadError,setLoadError] = useState("");
  const [requirement,setRequirement] = useState<string>("D-01");
  const [version,setVersion] = useState<string>(DENTAYA_RELEASE.version);
  const [protocol,setProtocol] = useState("");
  const [scope,setScope] = useState<ValidationScope>("synthetic");
  const [outcome,setOutcome] = useState<ValidationOutcome>("blocked");
  const [expected,setExpected] = useState("");
  const [observed,setObserved] = useState("");
  const [evidence,setEvidence] = useState("");
  const [authorization,setAuthorization] = useState("");
  const [duration,setDuration] = useState("");
  const [severity,setSeverity] = useState<ValidationSeverity>("none");
  const [action,setAction] = useState("");
  const canWrite = ["owner","admin","dentist","technician"].includes(role);
  const load = useCallback(async (offset=0) => {
    setLoading(true); setLoadError("");
    try {
      const {data,error} = await supabase.from("validation_runs").select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+PAGE_SIZE-1);
      if (error) {
        const missing = ["PGRST205","42P01"].includes(error.code);
        setSchemaMissing(missing);
        throw new Error(missing ? "Doğrulama kayıtları için veritabanı güncellemesi gerekli." : "Doğrulama kayıtları yüklenemedi.");
      }
      setSchemaMissing(false);
      const rows=(data ?? []) as ValidationRun[];
      setRuns(previous => offset === 0 ? rows : [...new Map([...previous,...rows].map(r=>[r.id,r])).values()]);
      setHasMore(rows.length===PAGE_SIZE);
    } catch(error) { setLoadError(error instanceof Error ? error.message : "Doğrulama kayıtları yüklenemedi."); }
    finally { setLoading(false); }
  },[organizationId]);
  useEffect(()=>{ setRuns([]); void load(); },[load]);
  const latest=useMemo(()=>latestValidationRuns(runs,version.trim(),protocol,scope),[runs,version,protocol,scope]);
  const selected=VALIDATION_REQUIREMENTS.find(r=>r.id===requirement)!;
  const current=latest.find(r=>r.requirement_id===requirement);
  const count={ passed:latest.filter(r=>r.outcome==="passed").length, failed:latest.filter(r=>r.outcome==="failed").length, blocked:latest.filter(r=>r.outcome==="blocked").length };
  async function save() {
    if (busy || !canWrite || schemaMissing || loading || loadError) return;
    const draft={requirement_id:requirement,protocol_ref:protocol.trim(),release_version:version.trim(),data_scope:scope,outcome,expected_result:expected.trim(),observed_result:observed.trim(),evidence_ref:evidence.trim(),authorization_ref:authorization.trim(),duration_seconds:duration.trim() ? Number(duration):null,issue_severity:severity,corrective_action:action.trim(),case_id:caseId || null,supersedes:current?.id ?? null};
    const error=validationDraftError(draft);if(error){setMessage(error);return;}
    setBusy(true);setMessage("");
    try {
      const {error:saveError}=await supabase.rpc("dentaya_record_validation_run",Object.fromEntries(Object.entries({organization_id:organizationId,...draft}).map(([key,value])=>["p_"+key,value])));
      if(saveError) throw saveError;
      setExpected("");setObserved("");setEvidence("");setDuration("");setAction("");setOutcome("blocked");setSeverity("none");
      setMessage("Sonuç ve kanıt referansı kaydedildi. Önceki kayıtlar korundu.");
      await load();
    } catch { setMessage("Kayıt tamamlanamadı. Bağlantıyı ve yetkinizi kontrol edip kayıtları yenileyin."); }
    finally { setBusy(false); }
  }
  function download(format:"json"|"csv") {
    const report=validationReport(runs,version.trim(),protocol,scope,t);
    const content=format==="json"?JSON.stringify(report,null,2):validationCsv(report.records);
    const url=URL.createObjectURL(new Blob([content],{type:format==="json"?"application/json;charset=utf-8":"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="DentAYA-validation-"+version.replace(/[^a-zA-Z0-9.-]/g,"-")+"."+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <UiNode as="section" className="validation-center" aria-labelledby="validation-title">
    <UiNode as="header" className="validation-heading">
      <UiNode as="div"><UiNode as="p" className="validation-eyebrow">KALİTE VE PİLOT</UiNode><UiNode as="h2" id="validation-title">Doğrulama kayıtları</UiNode><UiNode as="p">Ürün sürümü, kabul ölçütü ve pilot kanıtlarını birlikte izleyin.</UiNode></UiNode>
      <UiNode as="div" className="validation-actions"><UiNode as="button" type="button" disabled={loading||busy} onClick={()=>void load()}>Yenile</UiNode><UiNode as="button" type="button" disabled={!latest.length||loading||!!loadError} onClick={()=>download("json")}>JSON raporu</UiNode><UiNode as="button" type="button" disabled={!latest.length||loading||!!loadError} onClick={()=>download("csv")}>CSV raporu</UiNode></UiNode>
    </UiNode>
    <UiNode as="div" className="validation-context">
      <UiNode as="label">Ürün sürümü<UiNode as="input" aria-label="Ürün sürümü" value={version} onChange={e=>setVersion(e.target.value)} maxLength={80} disabled={busy}/></UiNode>
      <UiNode as="label">Protokol referansı<UiNode as="input" aria-label="Protokol referansı" value={protocol} onChange={e=>setProtocol(e.target.value)} placeholder="Protokol kodu ve revizyonu" maxLength={180} disabled={busy}/></UiNode>
      <UiNode as="label">Araştırma türü<UiNode as="select" aria-label="Araştırma türü" value={scope} onChange={e=>setScope(e.target.value as ValidationScope)} disabled={busy}>{Object.entries(VALIDATION_SCOPES).map(([key,label])=><UiNode as="option" value={key} key={key}>{t(label)}</UiNode>)}</UiNode></UiNode>
    </UiNode>
    <UiNode as="p" className="validation-note">Sonuçlar kullanıcı tarafından kaydedilir. Resmî THS değerlendirmesi, klinik doğrulama veya kurum izni yerine geçmez.</UiNode>
    {loadError && <UiNode as="div" role="alert" className="validation-notice"><UiNode as="p">{loadError}</UiNode>{schemaMissing && <UiNode as="a" href="/setup/DentAYA_RC33_Dogrulama.sql" download>Doğrulama SQL dosyasını indir</UiNode>}</UiNode>}
    <UiNode as="div" className="validation-metrics"><UiNode as="div" data-dy-copy-stack><UiNode as="strong">{count.passed} / {VALIDATION_REQUIREMENTS.length}</UiNode><UiNode as="span">Kaydedilen başarılı sonuç</UiNode></UiNode><UiNode as="div" data-dy-copy-stack><UiNode as="strong">{count.failed}</UiNode><UiNode as="span">Başarısız</UiNode></UiNode><UiNode as="div" data-dy-copy-stack><UiNode as="strong">{count.blocked}</UiNode><UiNode as="span">Engellendi</UiNode></UiNode><UiNode as="div" data-dy-copy-stack><UiNode as="strong">{VALIDATION_REQUIREMENTS.length-latest.length}</UiNode><UiNode as="span">Sonuç bekleniyor</UiNode></UiNode></UiNode>
    <UiNode as="div" className="validation-workspace">
      <UiNode as="nav" aria-label="Doğrulama gereksinimleri" className="validation-requirements">{VALIDATION_REQUIREMENTS.map(r=>{
        const last=latest.find(x=>x.requirement_id===r.id);
        return <UiNode as="button" type="button" key={r.id} aria-pressed={requirement===r.id} disabled={busy} onClick={()=>{setRequirement(r.id);setMessage("");}}><UiNode as="span" className="validation-id"><UserText>{r.id}</UserText></UiNode><UiNode as="span" data-dy-copy-stack><UiNode as="strong">{t(r.title)}</UiNode><UiNode as="small">{last?t(VALIDATION_OUTCOMES[last.outcome]):t("Sonuç bekleniyor")}</UiNode></UiNode><UiNode as="span" className={"validation-signal "+(last?.outcome ?? "pending")} aria-hidden="true"/></UiNode>;
      })}</UiNode>
      <UiNode as="div" className="validation-editor">
        <UiNode as="div"><UiNode as="h3"><UserText>{selected.id}</UserText> · {t(selected.title)}</UiNode><UiNode as="p">{t(selected.detail)}</UiNode><Link href={selected.route}>İlgili ekranı aç →</Link></UiNode>
        {!canWrite ? <UiNode as="p" className="validation-note">Kayıtlar okunabilir. Sonuç eklemek için kurum sahibi, yönetici, hekim veya teknisyen yetkisi gerekir.</UiNode> : <UiNode as="form" onSubmit={e=>{e.preventDefault();void save();}}>
          <UiNode as="fieldset" disabled={busy||loading||schemaMissing||!!loadError}>
            <UiNode as="legend">Yeni sonuç kaydı</UiNode>
            <UiNode as="label">Kabul ölçütü<UiNode as="textarea" aria-label="Kabul ölçütü" value={expected} onChange={e=>setExpected(e.target.value)} required minLength={10} maxLength={4000} rows={3}/></UiNode>
            <UiNode as="label">Gözlenen sonuç<UiNode as="textarea" aria-label="Gözlenen sonuç" value={observed} onChange={e=>setObserved(e.target.value)} required minLength={10} maxLength={4000} rows={3}/></UiNode>
            <UiNode as="label">Kanıt referansı<UiNode as="input" aria-label="Kanıt referansı" value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Rapor kodu, dosya özeti veya kayıt referansı" required minLength={5} maxLength={1000}/></UiNode>
            <UiNode as="label">İzin ve veri kullanım belgeleri<UiNode as="input" aria-label="İzin ve veri kullanım belgeleri" value={authorization} onChange={e=>setAuthorization(e.target.value)} required={scope!=="synthetic"} minLength={scope!=="synthetic"?5:undefined} maxLength={1000}/></UiNode>
            <UiNode as="div" className="validation-result-fields"><UiNode as="label">Sonuç<UiNode as="select" aria-label="Sonuç" value={outcome} onChange={e=>setOutcome(e.target.value as ValidationOutcome)}>{Object.entries(VALIDATION_OUTCOMES).map(([key,label])=><UiNode as="option" value={key} key={key}>{t(label)}</UiNode>)}</UiNode></UiNode><UiNode as="label">Bulgu önem derecesi<UiNode as="select" aria-label="Bulgu önem derecesi" value={severity} onChange={e=>setSeverity(e.target.value as ValidationSeverity)}>{Object.entries(VALIDATION_SEVERITIES).map(([key,label])=><UiNode as="option" value={key} key={key}>{t(label)}</UiNode>)}</UiNode></UiNode><UiNode as="label">İşlem süresi (saniye)<UiNode as="input" aria-label="İşlem süresi (saniye)" type="number" min={0} max={864000} step={1} value={duration} onChange={e=>setDuration(e.target.value)}/></UiNode></UiNode>
            <UiNode as="label">Düzeltme ve yeniden test planı<UiNode as="textarea" aria-label="Düzeltme ve yeniden test planı" value={action} onChange={e=>setAction(e.target.value)} required={outcome!=="passed"} minLength={outcome!=="passed"?10:undefined} maxLength={4000} rows={2}/></UiNode>
            <UiNode as="p" className="validation-note">Hasta adı veya kimlik bilgisi yazmayın; vaka ve belge kodlarını kullanın.</UiNode>
            <UiNode as="p" className="validation-note">Kayıtlar değiştirilemez. Yeni sonuç, önceki sonuca bağlı bir düzeltme kaydı oluşturur.</UiNode>
            <UiNode as="button" type="submit" className="validation-save">{busy?t("Kaydediliyor…"):t("Sonucu kaydet")}</UiNode>
          </UiNode>
        </UiNode>}
        {message && <UiNode as="p" role="status" className="validation-notice">{message}</UiNode>}
      </UiNode>
    </UiNode>
    <UiNode as="details" className="validation-history"><UiNode as="summary">Sonuç geçmişi</UiNode><UiNode as="p">Raporlar seçili sürüm, protokol ve araştırma türünün yüklenen kayıtlarını içerir.</UiNode>{runs.filter(r=>r.requirement_id===requirement&&r.release_version===version.trim()&&r.protocol_ref===protocol.trim()&&r.data_scope===scope).map(run=><UiNode as="article" key={run.id}><UiNode as="header"><UiNode as="strong">{t(VALIDATION_OUTCOMES[run.outcome])}</UiNode><UiNode as="time" dateTime={run.created_at}>{new Date(run.created_at).toLocaleString(intlLocale())}</UiNode></UiNode><UiNode as="p"><UserText>{run.observed_result}</UserText></UiNode><UiNode as="p"><UiMessage source="Kanıt: {0}" values={[run.evidence_ref]} userValues={[0]}/></UiNode><UiNode as="p"><UiMessage source="Kayıt: {0}" values={[run.id]} userValues={[0]}/></UiNode>{run.supersedes && <UiNode as="p"><UiMessage source="Önceki kayıt: {0}" values={[run.supersedes]} userValues={[0]}/></UiNode>}</UiNode>)}</UiNode>
    {hasMore && <UiNode as="button" type="button" disabled={loading} onClick={()=>void load(runs.length)}>Daha eski kayıtları yükle</UiNode>}
    {loading && <UiNode as="p" role="status">Kayıtlar yükleniyor…</UiNode>}
  </UiNode>;
}
