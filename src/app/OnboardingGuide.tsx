"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { supabase } from "@/lib/supabase";
import { dy } from "@/app/dentaya-theme";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type Membership = {
    organization_id: string;
    role: string;
};
type OnboardingRow = {
    completed: boolean;
    dismissed: boolean;
    current_step: number;
};
type Step = {
    id: string;
    number: string;
    title: string;
    description: string;
    href: string;
    action: string;
    done: boolean;
};
type Props = {
    variant?: "compact" | "full";
};
export default function OnboardingGuide({ variant = "compact", }: Props) {
    const { t: uiText } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");
    const [membership, setMembership] = useState<Membership | null>(null);
    const [org, setOrg] = useState<Org | null>(null);
    const [state, setState] = useState<OnboardingRow>({
        completed: false,
        dismissed: false,
        current_step: 0,
    });
    const [steps, setSteps] = useState<Step[]>([]);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let active = true;
        async function boot() {
            const { data: auth } = await supabase.auth
                .getSession();
            const user = auth.session?.user;
            if (!user) {
                setLoading(false);
                return;
            }
            setUserId(user.id);
            const { data: membershipData, } = await supabase
                .from("memberships")
                .select("organization_id,role")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle();
            if (!membershipData) {
                setLoading(false);
                return;
            }
            const currentMembership = membershipData as Membership;
            const { data: orgData, } = await supabase
                .from("organizations")
                .select("id,name,org_type")
                .eq("id", currentMembership.organization_id)
                .maybeSingle();
            if (!orgData) {
                setLoading(false);
                return;
            }
            const currentOrg = orgData as Org;
            if (!active)
                return;
            setMembership(currentMembership);
            setOrg(currentOrg);
            const { data: onboardingData, } = await supabase
                .from("user_onboarding")
                .select("completed,dismissed,current_step")
                .eq("user_id", user.id)
                .eq("organization_id", currentOrg.id)
                .maybeSingle();
            const currentState = (onboardingData ??
                {
                    completed: false,
                    dismissed: false,
                    current_step: 0,
                }) as OnboardingRow;
            setState(currentState);
            if (!onboardingData) {
                await supabase
                    .from("user_onboarding")
                    .upsert({
                    user_id: user.id,
                    organization_id: currentOrg.id,
                    role_snapshot: currentMembership.role,
                    completed: false,
                    dismissed: false,
                    current_step: 0,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "user_id,organization_id",
                });
            }
            const nextSteps = await buildSteps(currentOrg);
            if (!active)
                return;
            setSteps(nextSteps);
            const firstIncomplete = nextSteps.findIndex((item) => !item.done);
            const inferredStep = firstIncomplete ===
                -1
                ? nextSteps.length
                : firstIncomplete;
            if (inferredStep !==
                currentState.current_step) {
                await supabase
                    .from("user_onboarding")
                    .update({
                    current_step: inferredStep,
                    updated_at: new Date().toISOString(),
                })
                    .eq("user_id", user.id)
                    .eq("organization_id", currentOrg.id);
                setState((current) => ({
                    ...current,
                    current_step: inferredStep,
                }));
            }
            setLoading(false);
        }
        void boot();
        return () => {
            active = false;
        };
        // Boot is intentionally one-shot; buildSteps only queries Supabase and has no render-state dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    async function buildSteps(currentOrg: Org): Promise<Step[]> {
        if (currentOrg.org_type ===
            "clinic") {
            const [patients, scans, cases, finance,] = await Promise.all([
                count("patients", "owning_org_id", currentOrg.id),
                countWithFilters("scan_sessions", [
                    [
                        "captured_by_org_id",
                        currentOrg.id,
                    ],
                    [
                        "scan_origin",
                        "clinic",
                    ],
                ]),
                count("cases", "clinic_org_id", currentOrg.id),
                count("clinic_case_finance", "clinic_org_id", currentOrg.id),
            ]);
            return [
                {
                    id: "patient",
                    number: "01",
                    title: "İlk hastanı oluştur",
                    description: "Ad ve soyad ile hızlı kayıt aç; diğer bilgileri sonra tamamlayabilirsin.",
                    href: "/patients",
                    action: "Hasta Ekle",
                    done: patients > 0,
                },
                {
                    id: "scan",
                    number: "02",
                    title: "Hastaya tarama bağla",
                    description: "STL veya PLY taramasını hastaya bağlayıp 3D geçmişi başlat.",
                    href: "/scan-studio",
                    action: "Tarama Stüdyosu",
                    done: scans > 0,
                },
                {
                    id: "case",
                    number: "03",
                    title: "Laboratuvara vaka gönder",
                    description: "Hasta, diş, materyal ve laboratuvarı seçerek ortak iş kaydını oluştur.",
                    href: "/cases",
                    action: "Vaka Oluştur",
                    done: cases > 0,
                },
                {
                    id: "finance",
                    number: "04",
                    title: "Hasta fiyatını ayır",
                    description: "Laboratuvar maliyeti ile hastaya verdiğin fiyatı ayrı kaydet.",
                    href: "/finance",
                    action: "Muhasebeyi Aç",
                    done: finance > 0,
                },
            ];
        }
        if (currentOrg.org_type ===
            "laboratory") {
            const [cases, scans, projects, quotes,] = await Promise.all([
                count("cases", "lab_org_id", currentOrg.id),
                countWithFilters("scan_sessions", [
                    [
                        "captured_by_org_id",
                        currentOrg.id,
                    ],
                    [
                        "scan_origin",
                        "laboratory",
                    ],
                ]),
                count("design_projects", "lab_org_id", currentOrg.id),
                count("lab_case_quotes", "lab_org_id", currentOrg.id),
            ]);
            return [
                {
                    id: "case",
                    number: "01",
                    title: "Gelen işi aç",
                    description: "Klinikten gelen vakayı Vaka Komuta Merkezi'nde incele ve kabul et.",
                    href: "/cases",
                    action: "İş Kuyruğunu Aç",
                    done: cases > 0,
                },
                {
                    id: "scan",
                    number: "02",
                    title: "Lab taramasını bağla",
                    description: "Ana model, karşıt çene veya preparasyon taramasını vakaya ekle.",
                    href: "/scan-studio",
                    action: "Lab Tarama",
                    done: scans > 0,
                },
                {
                    id: "cad",
                    number: "03",
                    title: "DentAYA Design'da çalış",
                    description: "Tarama → marjin → anatomi → temas → kalınlık → klinik onayı akışını başlat.",
                    href: "/design",
                    action: "CAD'i Aç",
                    done: projects > 0,
                },
                {
                    id: "price",
                    number: "04",
                    title: "Kliniğe lab fiyatını ver",
                    description: "Vakaya özel laboratuvar fiyatını kaydet; hasta fiyatı klinik tarafında kalır.",
                    href: "/finance",
                    action: "Fiyatlandırmayı Aç",
                    done: quotes > 0,
                },
            ];
        }
        const [shipments, active, delivered,] = await Promise.all([
            count("shipments", "courier_org_id", currentOrg.id),
            countWithIn("shipments", "courier_org_id", currentOrg.id, "status", [
                "picked_up",
                "in_transit",
            ]),
            countWithFilters("shipments", [
                [
                    "courier_org_id",
                    currentOrg.id,
                ],
                [
                    "status",
                    "delivered",
                ],
            ]),
        ]);
        return [
            {
                id: "queue",
                number: "01",
                title: "Gönderi kuyruğunu aç",
                description: "Sana atanmış alım ve teslimat görevlerini tek listede gör.",
                href: "/logistics",
                action: "Canlı Takibi Aç",
                done: shipments > 0,
            },
            {
                id: "pickup",
                number: "02",
                title: "Ürünü teslim al",
                description: "Alım tamamlandığında durumu güncelle ve canlı teslimat akışını başlat.",
                href: "/logistics",
                action: "Gönderileri Aç",
                done: active > 0,
            },
            {
                id: "deliver",
                number: "03",
                title: "Teslimatı tamamla",
                description: "Ürün kliniğe veya laboratuvara ulaştığında teslim edildi olarak kapat.",
                href: "/logistics",
                action: "Teslimatları Aç",
                done: delivered > 0,
            },
        ];
    }
    async function count(table: string, field: string, value: string) {
        const { count: result, } = await supabase
            .from(table)
            .select("id", {
            count: "exact",
            head: true,
        })
            .eq(field, value);
        return result ?? 0;
    }
    async function countWithFilters(table: string, filters: Array<[
        string,
        string
    ]>) {
        let query = supabase
            .from(table)
            .select("id", {
            count: "exact",
            head: true,
        });
        for (const [field, value] of filters) {
            query = query.eq(field, value);
        }
        const { count: result, } = await query;
        return result ?? 0;
    }
    async function countWithIn(table: string, matchField: string, matchValue: string, inField: string, values: string[]) {
        const { count: result, } = await supabase
            .from(table)
            .select("id", {
            count: "exact",
            head: true,
        })
            .eq(matchField, matchValue)
            .in(inField, values);
        return result ?? 0;
    }
    async function dismiss() {
        if (!userId ||
            !org) {
            return;
        }
        setSaving(true);
        await supabase
            .from("user_onboarding")
            .update({
            dismissed: true,
            dismissed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq("user_id", userId)
            .eq("organization_id", org.id);
        setState((current) => ({
            ...current,
            dismissed: true,
        }));
        setSaving(false);
    }
    async function finish() {
        if (!userId ||
            !org) {
            return;
        }
        setSaving(true);
        await supabase
            .from("user_onboarding")
            .update({
            completed: true,
            dismissed: false,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq("user_id", userId)
            .eq("organization_id", org.id);
        setState((current) => ({
            ...current,
            completed: true,
            dismissed: false,
        }));
        setSaving(false);
    }
    const doneCount = useMemo(() => steps.filter((item) => item.done).length, [steps]);
    const allDone = steps.length > 0 &&
        doneCount === steps.length;
    const nextStep = steps.find((item) => !item.done) ?? steps[0];
    if (loading ||
        !org ||
        !membership) {
        return null;
    }
    if (variant ===
        "compact" &&
        (state.completed ||
            state.dismissed)) {
        return null;
    }
    if (variant ===
        "compact") {
        return (<>
      <style>{`
        @media(max-width:760px){
          .onboarding-compact{grid-template-columns:1fr!important}
          .onboarding-actions{justify-content:flex-start!important}
        }
        @media(max-width:560px){
          .onboarding-actions a,.onboarding-actions button{width:100%!important}
          .onboarding-full-top{flex-direction:column!important;align-items:flex-start!important}
          .onboarding-progress{width:100%!important}
        }
      `}</style>
      <UiNode as="section" className="onboarding-compact" style={styles.compact}>
        <UiNode as="div" style={styles.compactCopy}>
          <UiNode as="div" style={styles.progressLine}>
            <UiNode as="span" style={styles.eyebrow}>
              BAŞLANGIÇ REHBERİ
            </UiNode>

            <UiNode as="span" style={styles.progressText}>
              {doneCount}/{steps.length}
            </UiNode>
          </UiNode>

          <UiNode as="strong" style={styles.compactTitle}>
            {allDone
                ? "Kurulum akışın hazır."
                : nextStep?.title ??
                    "DentAYA'ya başla"}
          </UiNode>

          <UiNode as="span" style={styles.compactText}>
            {allDone
                ? "Temel akışı tamamladın. Rehberi kapatabilir veya tekrar gözden geçirebilirsin."
                : nextStep?.description ??
                    "Rolüne göre ilk adımları tamamla."}
          </UiNode>

          <UiNode as="div" style={styles.progressTrack}>
            <UiNode as="i" style={{
                ...styles.progressFill,
                width: steps.length
                    ? `${Math.round(doneCount /
                        steps.length *
                        100)}%`
                    : "0%",
            }}/>
          </UiNode>
        </UiNode>

        <UiNode as="div" className="onboarding-actions" style={styles.compactActions}>
          {allDone ? (<UiNode as="button" type="button" disabled={saving} onClick={() => void finish()} style={styles.primaryButton}>
              Rehberi Tamamla
            </UiNode>) : nextStep ? (<Link href={nextStep.href} style={styles.primaryLink}>
              {nextStep.action}
            </Link>) : null}

          <Link href="/start" style={styles.secondaryLink}>
            Tüm Adımlar
          </Link>

          <UiNode as="button" type="button" disabled={saving} onClick={() => void dismiss()} style={styles.ghostButton}>
            Daha Sonra
          </UiNode>
        </UiNode>
      </UiNode>
      </>);
    }
    return (<UiNode as="section" style={styles.full}>
      <UiNode as="div" className="onboarding-full-top" style={styles.fullTop}>
        <UiNode as="div">
          <UiNode as="span" style={styles.eyebrow}>
            {org.org_type ===
            "clinic"
            ? "KLİNİK BAŞLANGICI"
            : org.org_type ===
                "laboratory"
                ? "LABORATUVAR BAŞLANGICI"
                : "KURYE BAŞLANGICI"}
          </UiNode>

          <UiNode as="h2" style={styles.fullTitle}>
            DentAYA&apos;yı dört adımda çalıştır
          </UiNode>

          <UiNode as="p" style={styles.fullText}>
            {roleIntro(org.org_type)}
          </UiNode>
        </UiNode>

        <UiNode data-dy-copy-stack as="div" className="onboarding-progress" style={styles.fullProgress}>
          <UiNode as="strong">
            {doneCount}/{steps.length}
          </UiNode>

          <UiNode as="span">
            temel adım tamamlandı
          </UiNode>
        </UiNode>
      </UiNode>

      <UiNode as="div" style={styles.stepGrid}>
        {steps.map((step) => (<UiNode as="article" key={step.id} style={{
                ...styles.step,
                borderColor: step.done
                    ? dy.accent
                    : dy.border,
                background: step.done
                    ? dy.accentSoft
                    : dy.surface,
            }}>
              <UiNode as="div" style={styles.stepTop}>
                <UiNode as="span" style={styles.stepNumber}>
                  {step.number}
                </UiNode>

                <UiNode as="span" style={{
                ...styles.stepState,
                color: step.done
                    ? "#63cc98"
                    : dy.muted,
            }}>
                  {step.done
                ? uiText("Tamamlandı")
                : "Sıradaki"}
                </UiNode>
              </UiNode>

              <UiNode as="strong" style={styles.stepTitle}>
                {step.title}
              </UiNode>

              <UiNode as="p" style={styles.stepText}>
                {step.description}
              </UiNode>

              <Link href={step.href} style={step.done
                ? styles.secondaryLink
                : styles.primaryLink}>
                {step.done
                ? "Tekrar Aç"
                : step.action}
              </Link>
            </UiNode>))}
      </UiNode>

      <UiNode data-dy-copy-stack as="div" style={styles.boundary}>
        <UiNode as="strong">
          Rol sınırı
        </UiNode>

        <UiNode as="span">
          {roleBoundary(org.org_type)}
        </UiNode>
      </UiNode>

      <UiNode as="div" style={styles.fullActions}>
        {allDone && (<UiNode as="button" type="button" disabled={saving} onClick={() => void finish()} style={styles.primaryButton}>
            Başlangıç Rehberini Tamamla
          </UiNode>)}

        <Link href={org.org_type ===
            "clinic"
            ? "/clinic"
            : org.org_type ===
                "laboratory"
                ? "/lab"
                : "/logistics"} style={styles.secondaryLink}>
          Çalışma Alanına Dön
        </Link>
      </UiNode>
    </UiNode>);
}
function roleIntro(type: Org["org_type"]) {
    if (type ===
        "clinic") {
        return "Önce hastayı oluştur, taramayı bağla, vakayı laboratuvara gönder ve hasta fiyatını ayrı kaydet. Tasarım üretimi laboratuvarda; klinik onayı sende.";
    }
    if (type ===
        "laboratory") {
        return "Gelen vakayı kabul et, gerektiğinde laboratuvar taramasını ekle, DentAYA Design'da tasarla ve kliniğe onaya gönder.";
    }
    return "Gönderi kuyruğunu aç, ürünü teslim al, yol durumunu güncelle ve teslimatı vaka kaydından koparmadan tamamla.";
}
function roleBoundary(type: Org["org_type"]) {
    if (type ===
        "clinic") {
        return "Klinik hasta kaydı, klinik karar, tasarım onayı ve hasta fiyatından sorumludur. Laboratuvar CAD üretimini ve lab fiyatını yönetir.";
    }
    if (type ===
        "laboratory") {
        return "Laboratuvar yalnız vakaya yetkili olduğu verileri görür. Hastaya verilen klinik fiyatı ve klinik hasta yönetimi laboratuvar tarafında gösterilmez.";
    }
    return "Kurye yalnız teslimat için gereken gönderi ve rota bilgisini görür; klinik ve CAD verileri kurye çalışma alanına açılmaz.";
}
const styles: Record<string, CSSProperties> = {
    compact: {
        maxWidth: 1460,
        margin: "0 auto 12px",
        padding: 14,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto",
        alignItems: "center",
        gap: 16,
        border: `1px solid ${dy.accent}`,
        borderRadius: 14,
        background: `linear-gradient(135deg,${dy.surface},${dy.accentSoft})`,
    },
    compactCopy: {
        minWidth: 0,
        display: "grid",
        gap: 5,
    },
    progressLine: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    eyebrow: {
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".13em",
    },
    progressText: {
        color: dy.muted,
        fontSize: 12,
        fontWeight: 800,
    },
    compactTitle: {
        fontSize: 17,
    },
    compactText: {
        color: dy.muted,
        fontSize: 13,
        lineHeight: 1.5,
    },
    progressTrack: {
        width: "min(520px,100%)",
        height: 6,
        marginTop: 4,
        overflow: "hidden",
        borderRadius: 999,
        background: dy.input,
    },
    progressFill: {
        display: "block",
        height: "100%",
        borderRadius: 999,
        background: dy.accent,
    },
    compactActions: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap",
        justifyContent: "flex-end",
    },
    primaryLink: {
        minHeight: 40,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 12px",
        borderRadius: 9,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 900,
    },
    secondaryLink: {
        minHeight: 40,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 12px",
        border: `1px solid ${dy.border}`,
        borderRadius: 9,
        background: dy.surface,
        color: dy.text,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 850,
    },
    primaryButton: {
        minHeight: 40,
        padding: "0 12px",
        border: 0,
        borderRadius: 9,
        background: dy.accent,
        color: dy.accentContrast,
        fontSize: 13,
        fontWeight: 900,
        cursor: "pointer",
    },
    ghostButton: {
        minHeight: 40,
        padding: "0 9px",
        border: 0,
        background: "transparent",
        color: dy.muted,
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
    },
    full: {
        display: "grid",
        gap: 16,
    },
    fullTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 18,
    },
    fullTitle: {
        margin: "7px 0 8px",
        fontSize: "clamp(28px,4vw,44px)",
        letterSpacing: "-.04em",
    },
    fullText: {
        maxWidth: 820,
        margin: 0,
        color: dy.muted,
        lineHeight: 1.6,
    },
    fullProgress: {
        minWidth: 150,
        minHeight: 78,
        padding: 12,
        display: "grid",
        alignContent: "center",
        gap: 3,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.surface2,
        color: dy.muted,
    },
    stepGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
        gap: 9,
    },
    step: {
        minHeight: 260,
        padding: 15,
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderRadius: 14,
    },
    stepTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    stepNumber: {
        color: dy.accent,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: ".08em",
    },
    stepState: {
        fontSize: 12,
        fontWeight: 850,
    },
    stepTitle: {
        marginTop: 18,
        fontSize: 18,
    },
    stepText: {
        margin: "8px 0 18px",
        color: dy.muted,
        fontSize: 14,
        lineHeight: 1.55,
    },
    boundary: {
        padding: 13,
        display: "grid",
        gap: 5,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: dy.surface2,
        color: dy.muted,
    },
    fullActions: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },
};
