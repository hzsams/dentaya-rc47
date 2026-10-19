"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import {vehicleLabel} from '@/lib/display-labels';
import UiMessage from "@/lib/i18n/UiMessage";
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import NotificationCenter from "@/app/NotificationCenter";
import EmptyStateCard from "@/app/EmptyStateCard";
import { dentayaError } from "@/lib/dentaya-errors";
import { supabase } from "@/lib/supabase";
import { fetchWithRetry } from "@/lib/retry";
import { reportOperationalEvent } from "@/lib/operational-telemetry";
import { dy, useDentayaThemeRuntime } from "@/app/dentaya-theme";
type Org = {
    id: string;
    name: string;
    org_type: "clinic" | "laboratory" | "courier";
};
type ShipmentStatus = "created" | "pickup_requested" | "picked_up" | "in_transit" | "delivered" | "cancelled";
type Shipment = {
    id: string;
    case_id: string;
    from_org_id: string;
    to_org_id: string;
    courier_org_id: string | null;
    courier_driver_id: string | null;
    courier_name: string | null;
    tracking_code: string | null;
    status: ShipmentStatus;
    pickup_at: string | null;
    delivered_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    pickup_label: string | null;
    dropoff_label: string | null;
    pickup_address_text: string | null;
    dropoff_address_text: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    planned_distance_meters: number | null;
    planned_duration_seconds: number | null;
    remaining_distance_meters: number | null;
    remaining_duration_seconds: number | null;
    route_calculated_at: string | null;
    eta_at: string | null;
    actual_distance_meters: number | null;
    actual_duration_seconds: number | null;
};
type CaseRow = {
    id: string;
    case_number: string;
    patient_reference: string;
    title: string;
    status: string;
};
type Driver = {
    id: string;
    full_name: string;
    phone: string | null;
    vehicle_type: string;
    plate: string | null;
    status: string;
};
type Location = {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    heading_deg: number | null;
    speed_kmh: number | null;
    recorded_at: string;
};
type MapPoint = {
    latitude: number;
    longitude: number;
    label: string;
    kind: "pickup" | "courier" | "dropoff";
};
type DeliveryProof = {
    id: string;
    recipient_name: string;
    confirmation_code_last4: string | null;
    delivery_note: string | null;
    photo_path: string | null;
    created_at: string;
    created_by: string | null;
};
type RouteLeg = {
    distanceMeters: number;
    durationSeconds: number;
    staticDurationSeconds: number | null;
    encodedPolyline: string | null;
};
type RouteResponse = {
    planned: RouteLeg;
    active: RouteLeg;
    activeTarget: "pickup" | "dropoff";
    calculatedAt: string;
    etaAt: string | null;
    courierLocationAt: string | null;
};
const FLOW: ShipmentStatus[] = ["created", "pickup_requested", "picked_up", "in_transit", "delivered"];
const SHIPMENT_SELECT = "id,case_id,from_org_id,to_org_id,courier_org_id,courier_driver_id,courier_name,tracking_code,status,pickup_at,delivered_at,notes,created_at,updated_at,pickup_label,dropoff_label,pickup_address_text,dropoff_address_text,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng,planned_distance_meters,planned_duration_seconds,remaining_distance_meters,remaining_duration_seconds,route_calculated_at,eta_at,actual_distance_meters,actual_duration_seconds";
function distanceMeters(a: Pick<Location, "latitude" | "longitude">, b: Pick<Location, "latitude" | "longitude">) {
    const toRad = (value: number) => value * Math.PI / 180;
    const earth = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}
export default function LogisticsPage() {
    const { t: uiText, intlLocale } = useTranslation();
    useDentayaThemeRuntime();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Org | null>(null);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [orgMap, setOrgMap] = useState<Map<string, Org>>(new Map());
    const [caseMap, setCaseMap] = useState<Map<string, CaseRow>>(new Map());
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [location, setLocation] = useState<Location | null>(null);
    const [filter, setFilter] = useState<"active" | "all" | "delivered">("active");
    const [search, setSearch] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [locationBusy, setLocationBusy] = useState(false);
    const [trackingActive, setTrackingActive] = useState(false);
    const [userId, setUserId] = useState("");
    const [route, setRoute] = useState<RouteResponse | null>(null);
    const [routeBusy, setRouteBusy] = useState(false);
    const [routeError, setRouteError] = useState("");
    const [proof, setProof] = useState<DeliveryProof | null>(null);
    const [proofPhotoUrl, setProofPhotoUrl] = useState("");
    const [deliveryFormOpen, setDeliveryFormOpen] = useState(false);
    const [recipientName, setRecipientName] = useState("");
    const [confirmationCode, setConfirmationCode] = useState("");
    const [deliveryNote, setDeliveryNote] = useState("");
    const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const operationLock = useRef(false);
    const locationWatch = useRef<number | null>(null);
    const lastLocationSentAt = useRef(0);
    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        let active = true;
        let shipmentChannel: RealtimeChannel | null = null;
        async function init() {
            const { data: auth } = await supabase.auth.getSession();
            const user = auth.session?.user;
            if (!user) {
                router.replace("/workspace");
                return;
            }
            setUserId(user.id);
            const { data: membership } = await supabase.from("memberships").select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
            if (!membership) {
                setNotice("Aktif kurum bulunamadı.");
                setLoading(false);
                return;
            }
            const { data: orgData } = await supabase.from("organizations").select("id,name,org_type").eq("id", membership.organization_id).maybeSingle();
            if (!orgData) {
                setNotice("Kurum bilgisi alınamadı.");
                setLoading(false);
                return;
            }
            const current = orgData as Org;
            if (!active)
                return;
            setOrg(current);
            await loadShipments();
            if (current.org_type === "courier")
                await loadDrivers(current.id);
            shipmentChannel = supabase.channel(`logistics-rc8-${current.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => void loadShipments())
                .subscribe();
            setLoading(false);
        }
        void init();
        return () => {
            active = false;
            if (shipmentChannel)
                void supabase.removeChannel(shipmentChannel);
        };
    }, [router]);
    useEffect(() => {
        if (!selectedId)
            return;
        if (locationWatch.current !== null && typeof navigator !== "undefined") {
            navigator.geolocation.clearWatch(locationWatch.current);
            locationWatch.current = null;
            setTrackingActive(false);
        }
        setLocation(null);
        setRoute(null);
        setRouteError("");
        setProof(null);
        setProofPhotoUrl("");
        setDeliveryFormOpen(false);
        setRecipientName("");
        setConfirmationCode("");
        setDeliveryNote("");
        setDeliveryPhoto(null);
        let channel: RealtimeChannel | null = null;
        async function run() {
            await Promise.all([loadLocation(selectedId), loadDeliveryProof(selectedId)]);
            channel = supabase.channel(`shipment-location-${selectedId}`)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "courier_locations", filter: `shipment_id=eq.${selectedId}` }, payload => {
                setLocation(payload.new as Location);
            }).subscribe();
        }
        void run();
        return () => {
            if (channel)
                void supabase.removeChannel(channel);
        };
    }, [selectedId]);
    const selected = shipments.find(x => x.id === selectedId) ?? null;
    useEffect(() => {
        if (!selectedId || !selected)
            return;
        if (selected.pickup_lat == null || selected.pickup_lng == null || selected.dropoff_lat == null || selected.dropoff_lng == null)
            return;
        const timer = window.setTimeout(() => void loadRoute(selectedId, false), 350);
        return () => window.clearTimeout(timer);
    }, [selectedId, selected?.status, selected?.pickup_lat, selected?.pickup_lng, selected?.dropoff_lat, selected?.dropoff_lng]);
    useEffect(() => {
        if (!trackingActive || !selectedId)
            return;
        const timer = window.setInterval(() => void loadRoute(selectedId, false), 90000);
        return () => window.clearInterval(timer);
    }, [trackingActive, selectedId]);
    async function loadShipments() {
        const { data, error } = await supabase.from("shipments")
            .select(SHIPMENT_SELECT)
            .order("updated_at", { ascending: false }).limit(250);
        if (error) {
            setNotice(dentayaError(error));
            return;
        }
        const rows = (data ?? []) as Shipment[];
        setShipments(rows);
        setSelectedId(currentId => rows.some(x => x.id === currentId) ? currentId : (rows[0]?.id ?? ""));
        const orgIds = [...new Set(rows.flatMap(x => [x.from_org_id, x.to_org_id, x.courier_org_id].filter(Boolean) as string[]))];
        const caseIds = [...new Set(rows.map(x => x.case_id))];
        const tasks: PromiseLike<unknown>[] = [];
        if (orgIds.length)
            tasks.push(supabase.from("organizations").select("id,name,org_type").in("id", orgIds).then(({ data }) => setOrgMap(new Map(((data ?? []) as Org[]).map(x => [x.id, x])))));
        if (caseIds.length)
            tasks.push(supabase.from("cases").select("id,case_number,patient_reference,title,status").in("id", caseIds).then(({ data }) => setCaseMap(new Map(((data ?? []) as CaseRow[]).map(x => [x.id, x])))));
        await Promise.all(tasks);
    }
    async function loadDrivers(orgId: string) {
        const { data } = await supabase.from("courier_drivers").select("id,full_name,phone,vehicle_type,plate,status").eq("organization_id", orgId).order("full_name").limit(100);
        setDrivers((data ?? []) as Driver[]);
    }
    async function loadLocation(shipmentId: string) {
        const { data } = await supabase.from("courier_locations").select("latitude,longitude,accuracy_m,heading_deg,speed_kmh,recorded_at").eq("shipment_id", shipmentId).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
        setLocation((data as Location | null) ?? null);
    }
    async function loadDeliveryProof(shipmentId: string) {
        const { data } = await supabase.from("shipment_delivery_proofs")
            .select("id,recipient_name,confirmation_code_last4,delivery_note,photo_path,created_at,created_by")
            .eq("shipment_id", shipmentId).maybeSingle();
        const next = (data as DeliveryProof | null) ?? null;
        setProof(next);
        setProofPhotoUrl("");
        if (next?.photo_path) {
            const { data: signed } = await supabase.storage.from("dentaya-files").createSignedUrl(next.photo_path, 600);
            if (signed?.signedUrl)
                setProofPhotoUrl(signed.signedUrl);
        }
    }
    async function loadRoute(shipmentId: string, announce = true) {
        const target = shipments.find(item => item.id === shipmentId);
        if (!target || target.pickup_lat == null || target.pickup_lng == null || target.dropoff_lat == null || target.dropoff_lng == null) {
            setRouteError("Rota için klinik ve laboratuvar koordinatları gerekli.");
            return;
        }
        setRouteBusy(true);
        if (announce)
            setRouteError("");
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
            setRouteBusy(false);
            setRouteError("Oturum doğrulaması bulunamadı.");
            return;
        }
        try {
            const response = await fetchWithRetry("/api/maps/route", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ shipmentId }),
            }, { attempts: 3 });
            const payload = (await response.json()) as RouteResponse & {
                error?: string;
            };
            if (!response.ok)
                throw new Error(payload.error || "Rota hesaplanamadı.");
            setRoute(payload);
            setRouteError("");
            if (announce)
                setNotice("Google Routes ile trafik duyarlı rota yenilendi.");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Rota hesaplanamadı.";
            setRouteError(message);
            void reportOperationalEvent({
                eventType: "route_refresh_failed",
                severity: "warning",
                source: "api",
                message,
                route: "/logistics",
                details: { shipmentId },
            });
        }
        finally {
            setRouteBusy(false);
        }
    }
    async function persistLocation(position: GeolocationPosition, announce = true) {
        if (!org || !selectedId || !userId)
            return false;
        const selectedShipment = shipments.find(item => item.id === selectedId);
        if (selectedShipment && ["delivered", "cancelled"].includes(selectedShipment.status))
            return false;
        const next: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_m: position.coords.accuracy || null,
            heading_deg: position.coords.heading == null ? null : position.coords.heading,
            speed_kmh: position.coords.speed == null ? null : position.coords.speed * 3.6,
            recorded_at: new Date().toISOString(),
        };
        if (!announce && location) {
            const ageMs = Date.now() - new Date(location.recorded_at).getTime();
            const moved = distanceMeters(location, next);
            if (Number.isFinite(ageMs) && ageMs < 60000 && moved < 8) {
                return true;
            }
        }
        const { error } = await supabase.from("courier_locations").insert({
            shipment_id: selectedId,
            courier_org_id: org.id,
            courier_driver_id: selectedShipment?.courier_driver_id ?? null,
            latitude: next.latitude,
            longitude: next.longitude,
            accuracy_m: next.accuracy_m,
            heading_deg: next.heading_deg,
            speed_kmh: next.speed_kmh,
            recorded_at: next.recorded_at,
            created_by: userId,
        });
        if (error) {
            setNotice(dentayaError(error, "Konum gönderilemedi."));
            void reportOperationalEvent({
                eventType: "courier_location_failed",
                severity: "warning",
                source: "client",
                message: dentayaError(error, "Konum gönderilemedi."),
                route: "/logistics",
                details: { shipmentId: selectedId },
            });
            return false;
        }
        setLocation(next);
        if (announce)
            setNotice("Konum gönderiye işlendi.");
        return true;
    }
    function locationPreflight() {
        if (org?.org_type !== "courier" || !selectedId || !userId) {
            setNotice("Konum paylaşımı yalnızca seçili kurye gönderisinde kullanılabilir.");
            return false;
        }
        const selectedShipment = shipments.find(item => item.id === selectedId);
        if (!selectedShipment?.courier_driver_id) {
            setNotice("Canlı takibi başlatmadan önce sürücü seç.");
            return false;
        }
        if (["delivered", "cancelled"].includes(selectedShipment.status)) {
            setNotice("Tamamlanmış veya iptal edilmiş gönderi için yeni konum paylaşılmaz.");
            return false;
        }
        if (!navigator.geolocation) {
            setNotice("Bu cihaz konum bilgisini desteklemiyor.");
            return false;
        }
        return true;
    }
    function shareCurrentLocation() {
        if (!locationPreflight())
            return;
        setLocationBusy(true);
        setNotice("");
        navigator.geolocation.getCurrentPosition(async (position) => { await persistLocation(position); setLocationBusy(false); }, error => { setLocationBusy(false); setNotice(error.code === 1 ? "Konum izni verilmedi." : "Konum alınamadı. Lütfen tekrar deneyin."); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
    }
    function toggleLiveTracking() {
        if (trackingActive) {
            if (locationWatch.current !== null)
                navigator.geolocation.clearWatch(locationWatch.current);
            locationWatch.current = null;
            setTrackingActive(false);
            setNotice("Canlı konum takibi durduruldu.");
            return;
        }
        if (!locationPreflight())
            return;
        setTrackingActive(true);
        setNotice("Canlı konum takibi başladı. Son konum yaklaşık 15 saniyede bir işlenir.");
        locationWatch.current = navigator.geolocation.watchPosition(position => {
            const now = Date.now();
            if (now - lastLocationSentAt.current < 15000)
                return;
            lastLocationSentAt.current = now;
            void persistLocation(position, false);
        }, error => {
            if (locationWatch.current !== null)
                navigator.geolocation.clearWatch(locationWatch.current);
            locationWatch.current = null;
            setTrackingActive(false);
            setNotice(error.code === 1 ? "Konum izni verilmedi; canlı takip durduruldu." : "Konum alınamadı; canlı takip durduruldu.");
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    }
    useEffect(() => () => {
        if (locationWatch.current !== null && typeof navigator !== "undefined")
            navigator.geolocation.clearWatch(locationWatch.current);
    }, []);
    useEffect(() => {
        function recover() {
            if (org) {
                void loadShipments();
                if (selectedId) {
                    void loadLocation(selectedId);
                    void loadRoute(selectedId, false);
                }
            }
        }
        window.addEventListener("dentaya-network-restored", recover);
        return () => window.removeEventListener("dentaya-network-restored", recover);
    }, [org, selectedId]);
    async function updateShipment(patch: Partial<Pick<Shipment, "status" | "courier_driver_id" | "courier_name" | "pickup_at" | "delivered_at">>) {
        if (!selectedId || org?.org_type !== "courier" || operationLock.current)
            return;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setNotice("İnternet bağlantısı yok. Kurye durumunu değiştirmeden önce bağlantının gelmesini bekle.");
            return;
        }
        operationLock.current = true;
        setBusy(true);
        setNotice("");
        const { error } = await supabase.from("shipments").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", selectedId);
        setBusy(false);
        operationLock.current = false;
        if (error) {
            const message = dentayaError(error, "Gönderi güncellenemedi.");
            setNotice(message);
            void reportOperationalEvent({
                eventType: "shipment_update_failed",
                severity: "error",
                source: "client",
                message,
                route: "/logistics",
                details: { shipmentId: selectedId, status: patch.status ?? null },
            });
            return;
        }
        await loadShipments();
    }
    function setStatus(next: ShipmentStatus) {
        if (next === "delivered") {
            setDeliveryFormOpen(true);
            return;
        }
        const patch: Partial<Shipment> = { status: next };
        if (next === "picked_up")
            patch.pickup_at = new Date().toISOString();
        void updateShipment(patch);
    }
    async function assignDriver(id: string) {
        const d = drivers.find(x => x.id === id);
        await updateShipment({ courier_driver_id: id || null, courier_name: d?.full_name ?? null });
    }
    async function completeDelivery() {
        if (!selected || org?.org_type !== "courier" || busy)
            return;
        const recipient = recipientName.trim();
        if (recipient.length < 2) {
            setNotice("Teslim alan kişinin adını gir.");
            return;
        }
        if (deliveryPhoto && deliveryPhoto.size > 8 * 1024 * 1024) {
            setNotice("Teslimat fotoğrafı en fazla 8 MB olabilir.");
            return;
        }
        if (deliveryPhoto && !['image/jpeg', 'image/png'].includes(deliveryPhoto.type)) {
            setNotice("Teslimat fotoğrafı JPG veya PNG olmalı.");
            return;
        }
        operationLock.current = true;
        setBusy(true);
        setNotice("");
        let uploadedPath: string | null = null;
        try {
            if (deliveryPhoto) {
                const cleanName = deliveryPhoto.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-120) || "proof.jpg";
                uploadedPath = `shipments/${selected.id}/proof/${crypto.randomUUID()}-${cleanName}`;
                const { error: uploadError } = await supabase.storage.from("dentaya-files").upload(uploadedPath, deliveryPhoto, { contentType: deliveryPhoto.type, upsert: false });
                if (uploadError)
                    throw uploadError;
            }
            const { error } = await supabase.rpc("dentaya_complete_delivery", {
                p_shipment_id: selected.id,
                p_recipient_name: recipient,
                p_confirmation_code: confirmationCode.trim() || null,
                p_delivery_note: deliveryNote.trim() || null,
                p_photo_path: uploadedPath,
            });
            if (error)
                throw error;
            setNotice("Teslimat tamamlandı ve teslimat kanıtı kaydedildi.");
            setDeliveryFormOpen(false);
            setRecipientName("");
            setConfirmationCode("");
            setDeliveryNote("");
            setDeliveryPhoto(null);
            await Promise.all([loadShipments(), loadDeliveryProof(selected.id)]);
        }
        catch (error) {
            if (uploadedPath)
                await supabase.storage.from("dentaya-files").remove([uploadedPath]);
            const message = dentayaError(error, "Teslimat tamamlanamadı.");
            setNotice(message);
            void reportOperationalEvent({
                eventType: "delivery_completion_failed",
                severity: "critical",
                source: "client",
                message,
                route: "/logistics",
                details: { shipmentId: selected.id, hadPhoto: Boolean(deliveryPhoto) },
            });
        }
        finally {
            setBusy(false);
            operationLock.current = false;
        }
    }
    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("tr-TR");
        return shipments.filter(shipment => {
            const matchesFilter = filter === "all" ? true : filter === "delivered" ? shipment.status === "delivered" : !["delivered", "cancelled"].includes(shipment.status);
            if (!matchesFilter)
                return false;
            if (!query)
                return true;
            const caseRow = caseMap.get(shipment.case_id);
            const searchable = [shipment.tracking_code, caseRow?.case_number, caseRow?.title, shipment.pickup_label, shipment.dropoff_label, shipment.pickup_address_text, shipment.dropoff_address_text].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
            return searchable.includes(query);
        });
    }, [shipments, filter, search, caseMap]);
    const activeCount = shipments.filter(x => !["delivered", "cancelled"].includes(x.status)).length;
    const transitCount = shipments.filter(x => x.status === "in_transit").length;
    const deliveredToday = shipments.filter(x => x.status === "delivered" && x.delivered_at && sameDay(new Date(x.delivered_at), new Date())).length;
    const pickupPending = shipments.filter(x => x.status === "created" || x.status === "pickup_requested").length;
    const nextStatus = selected ? nextShipmentStatus(selected.status) : null;
    const nextActionBlockedByDriver = Boolean(selected && nextStatus === "picked_up" && !selected.courier_driver_id);
    const selectedMapPoints = selected ? buildMapPoints(selected, location, orgMap) : [];
    const locationAgeMs = location ? Math.max(0, nowMs - new Date(location.recorded_at).getTime()) : null;
    const freshness = locationAgeMs == null ? "Konum yok" : locationAgeMs <= 120000 ? "Canlı" : locationAgeMs <= 600000 ? "Gecikmiş" : "Eski / offline";
    const navigationHref = selected ? buildNavigationHref(selected, location) : null;
    if (loading) return <LoadingExperience title="Lojistik verileri yükleniyor…"/>;
    return <UiNode as="main" style={ui.page}>
    <style>{`
      *{box-sizing:border-box}.shipment-row{transition:transform var(--dy-motion-fast,150ms),border-color var(--dy-motion-fast,150ms)}.shipment-row:hover{transform:translateX(3px);border-color:var(--dy-accent,#6de2cf)!important}
      input,select,textarea,button{font:inherit}button:disabled{opacity:.55;cursor:not-allowed!important}
      @media(max-width:980px){.logistics-shell{grid-template-columns:360px minmax(0,1fr)!important}.logistics-stats{grid-template-columns:repeat(2,1fr)!important}.logistics-head{flex-direction:column!important;align-items:flex-start!important}}
      @media(max-width:720px){.logistics-shell{grid-template-columns:1fr!important}.logistics-stats{grid-template-columns:1fr!important}.route-card{grid-template-columns:1fr!important}.route-card .route-line{height:28px!important;width:2px!important;margin-left:7px!important}.detail-grid,.route-metrics{grid-template-columns:1fr!important}.action-row{grid-template-columns:1fr 1fr!important}}
      @media(max-width:480px){.action-row{grid-template-columns:1fr!important}}
    `}</style>

    <UiNode as="header" className="logistics-head" style={ui.header}>
      <UiNode as="div">
        <Link href={org?.org_type === "clinic" ? "/clinic" : org?.org_type === "laboratory" ? "/lab" : "/"} style={ui.back}>{uiText("← Çalışma Alanı")}</Link>
        <UiNode as="p" style={ui.eyebrow}>TESLİMAT & KURYE</UiNode>
        <UiNode as="h1" style={ui.title}>Kurye Operasyon Merkezi</UiNode>
        <UiNode as="p" style={ui.subtitle}>Gerçek rota, trafik duyarlı ETA, sürücü canlı konumu ve teslimat kanıtını vaka kaydıyla birlikte yönet.</UiNode>
      </UiNode>
      <UiNode as="div" style={ui.headerActions}><NotificationCenter /><Link href="/start" style={ui.secondaryLink}>Başlangıç</Link><Link href="/cases" style={ui.secondaryLink}>{uiText("Vakalar")}</Link>{org?.org_type === "courier" && <UiNode as="span" style={ui.roleBadge}>KURYE OPERASYONU</UiNode>}</UiNode>
    </UiNode>

    {notice && <UiNode as="div" style={ui.notice}>{notice}</UiNode>}

    <UiNode as="section" className="logistics-stats" style={ui.stats}>
      <Stat label="Aktif Gönderi" value={activeCount} detail="teslim edilmemiş"/>
      <Stat label="Yolda" value={transitCount} detail="aktif taşıma"/>
      <Stat label="Alım Bekliyor" value={pickupPending} detail="alım bekleyen"/>
      <Stat label="Bugün Teslim" value={deliveredToday} detail="tamamlanan"/>
    </UiNode>

    <UiNode as="section" style={ui.commandBar}>
      <UiNode as="label" style={ui.searchField}><UiNode as="span">Gönderi ara</UiNode><UiNode as="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Takip no, vaka veya kurum…" style={ui.searchInput}/></UiNode>
      <UiNode as="div" style={ui.commandMeta}><UiNode as="i" style={ui.liveDot}/><UiNode as="span"><UserText>{org?.name ?? "Kurum"}</UserText> · {org?.org_type === "courier" ? "Kurye ağı" : "Gönderi katılımcısı"}</UiNode></UiNode>
      {org?.org_type === "courier" && <UiNode as="div" style={ui.commandActions}>
        <UiNode as="button" type="button" style={ui.primaryButton} onClick={shareCurrentLocation} disabled={locationBusy || busy || trackingActive}>{locationBusy ? "Konum alınıyor…" : "Konumumu paylaş"}</UiNode>
        <UiNode as="button" type="button" style={{ ...ui.secondaryButton, ...(trackingActive ? ui.trackingButtonActive : {}) }} onClick={toggleLiveTracking} disabled={busy}>{trackingActive ? "Canlı takibi durdur" : "Canlı takibi başlat"}</UiNode>
      </UiNode>}
    </UiNode>

    <UiNode as="section" className="logistics-shell" style={ui.shell}>
      <UiNode as="aside" style={ui.listPanel}>
        <UiNode as="div" style={ui.listTop}><UiNode data-dy-copy-stack as="div" className="dy-title-detail"><UiNode as="strong">Gönderiler</UiNode><UiNode as="span">{filtered.length} kayıt</UiNode></UiNode><UiNode as="div" style={ui.filterTabs}>{(["active", "all", "delivered"] as const).map(x => <UiNode as="button" key={x} type="button" onClick={() => setFilter(x)} style={{ ...ui.filterButton, background: filter === x ? dy.accentSoft : "transparent", color: filter === x ? dy.accent : dy.muted }}>{x === "active" ? uiText("Aktif") : x === "all" ? uiText("Tümü") : "Teslim"}</UiNode>)}</UiNode></UiNode>
        <UiNode as="div" style={ui.shipmentList}>{filtered.map(s => {
            const c = caseMap.get(s.case_id);
            const active = s.id === selectedId;
            return <UiNode as="button" key={s.id} type="button" className="shipment-row" onClick={() => setSelectedId(s.id)} style={{ ...ui.shipmentRow, background: active ? dy.accentSoft : dy.surface2, borderColor: active ? dy.accent : dy.border }}>
            <UiNode as="div" style={ui.shipmentTop}><UiNode as="strong">{s.tracking_code || shortId(s.id)}</UiNode><Status value={s.status}/></UiNode>
            <UiNode as="div" style={ui.caseName}>{c?.case_number ?? "Vaka"} · <UserText>{c?.title ?? "—"}</UserText></UiNode>
            <UiNode as="div" style={ui.routeMini}><UiNode as="span">{orgMap.get(s.from_org_id)?.name ?? s.pickup_label ?? "Başlangıç"}</UiNode><UiNode as="b">→</UiNode><UiNode as="span">{orgMap.get(s.to_org_id)?.name ?? s.dropoff_label ?? "Varış"}</UiNode></UiNode>
            {s.eta_at && !["delivered", "cancelled"].includes(s.status) && <UiNode as="small" style={{ color: dy.muted }}>ETA {fmtTime(s.eta_at, intlLocale())}</UiNode>}
          </UiNode>;
        })}</UiNode>
        {!filtered.length && <EmptyStateCard eyebrow="TESLİMAT" title={shipments.length === 0 ? "Henüz gönderi yok" : "Bu filtrede gönderi yok"} description={shipments.length === 0 ? "Vaka teslimata hazır olduğunda kurye görevi burada görünür." : "Farklı bir gönderi filtresi seçerek diğer kayıtları görüntüleyebilirsin."} actionLabel="Başlangıç Rehberi" actionHref="/start"/>}
      </UiNode>

      <UiNode as="section" style={ui.detail}>
        {selected ? <>
          <UiNode as="div" style={ui.detailHead}>
            <UiNode as="div"><UiNode as="p" style={ui.eyebrow}>GÖNDERİ DETAYI</UiNode><UiNode as="h2" style={ui.detailTitle}>{selected.tracking_code || shortId(selected.id)}</UiNode><UiNode as="p" style={ui.detailSub}>{caseMap.get(selected.case_id)?.case_number} · <UserText>{caseMap.get(selected.case_id)?.patient_reference}</UserText> · <UserText>{caseMap.get(selected.case_id)?.title}</UserText></UiNode></UiNode>
            <Status value={selected.status} large/>
          </UiNode>

          <CourierRouteMap points={selectedMapPoints} shipment={selected} pickupLabel={selected.pickup_label || orgMap.get(selected.from_org_id)?.name || "Başlangıç kurumu"} dropoffLabel={selected.dropoff_label || orgMap.get(selected.to_org_id)?.name || "Teslim kurumu"} trackingCode={selected.tracking_code || shortId(selected.id)} route={route} routeBusy={routeBusy} routeError={routeError} onRefresh={() => { void loadLocation(selected.id); void loadRoute(selected.id, true); }}/>

          <UiNode as="div" className="route-metrics" style={ui.routeMetrics}>
            <MetricCard label="PLANLANAN LAB → KLİNİK" value={route ? formatDistance(route.planned.distanceMeters) : formatDistance(selected.planned_distance_meters)} detail={route ? formatDuration(route.planned.durationSeconds) : formatDuration(selected.planned_duration_seconds)}/>
            <MetricCard label={route?.activeTarget === "pickup" ? "KURYE → ALIM" : "KALAN ROTA"} value={route ? formatDistance(route.active.distanceMeters) : formatDistance(selected.remaining_distance_meters)} detail={route ? formatDuration(route.active.durationSeconds) : formatDuration(selected.remaining_duration_seconds)}/>
            <MetricCard label="TAHMİNİ VARIŞ" value={(route?.etaAt || selected.eta_at) ? fmtTime(route?.etaAt || selected.eta_at || "", intlLocale()) : "—"} detail={(route?.calculatedAt || selected.route_calculated_at) ? `hesap ${relativeTime(route?.calculatedAt || selected.route_calculated_at || "")}` : "rota hesaplanmadı"}/>
          </UiNode>

          <UiNode as="div" className="route-card" style={ui.routeCard}>
            <UiNode as="div" style={ui.routePoint}><UiNode as="span" style={ui.routeDot}/><UiNode as="div" className="dy-title-detail"><UiNode as="small">ALIM NOKTASI</UiNode><UiNode as="strong">{selected.pickup_label || orgMap.get(selected.from_org_id)?.name || "Başlangıç kurum"}</UiNode><UiNode as="span">{selected.pickup_address_text || "Kurum adresi henüz eklenmedi"}</UiNode><UiNode as="span">{selected.pickup_at ? fmt(selected.pickup_at, intlLocale()) : "Henüz alınmadı"}</UiNode></UiNode></UiNode>
            <UiNode as="div" className="route-line" style={ui.routeLine}><UiNode as="span"/></UiNode>
            <UiNode as="div" style={ui.routePoint}><UiNode as="span" style={{ ...ui.routeDot, background: selected.status === "delivered" ? dy.accent : dy.border }}/><UiNode as="div" className="dy-title-detail"><UiNode as="small">TESLİM NOKTASI</UiNode><UiNode as="strong">{selected.dropoff_label || orgMap.get(selected.to_org_id)?.name || "Varış kurum"}</UiNode><UiNode as="span">{selected.dropoff_address_text || "Kurum adresi henüz eklenmedi"}</UiNode><UiNode as="span">{selected.delivered_at ? fmt(selected.delivered_at, intlLocale()) : "Teslim bekleniyor"}</UiNode></UiNode></UiNode>
          </UiNode>

          <UiNode as="div" className="detail-grid" style={ui.detailGrid}>
            <Info label="Kurye" value={selected.courier_name || orgMap.get(selected.courier_org_id ?? "")?.name || "Atanmadı"}/>
            <Info label="Son güncelleme" value={fmt(selected.updated_at, intlLocale())}/>
            <Info label="Vaka durumu" value={caseMap.get(selected.case_id)?.status ?? "—"}/>
            <Info label="Rota koordinatları" value={selected.pickup_lat != null && selected.dropoff_lat != null ? "Kurum adreslerinden hazır" : "Adres koordinatı eksik"}/>
            <Info label="Canlı konum" value={location ? `${freshness} · ${relativeTime(location.recorded_at)}` : "Konum paylaşılmadı"}/>
            {selected.status === "delivered" && <Info label="Gerçek taşıma" value={`${formatDistance(selected.actual_distance_meters)} · ${formatDuration(selected.actual_duration_seconds)}`}/>} 
          </UiNode>

          {location && <UiNode as="div" style={ui.locationCard}><UiNode as="div"><UiNode as="p" style={ui.eyebrow}>CANLI KONUM · {freshness.toUpperCase()}</UiNode><UiNode as="strong">{location.speed_kmh != null ? <UiMessage source="{0} km/sa" values={[location.speed_kmh.toFixed(0)]} userValues={[]}/> : "Konum güncellendi"}</UiNode><UiNode as="span">{fmt(location.recorded_at, intlLocale())} · doğruluk {location.accuracy_m != null ? <UiMessage source="{0} m" values={[location.accuracy_m.toFixed(0)]} userValues={[]}/> : "—"}</UiNode></UiNode><UiNode as="div" style={ui.coordinate}>{location.latitude.toFixed(5)}<UiNode as="br"/>{location.longitude.toFixed(5)}</UiNode></UiNode>}

          <UiNode as="div" style={ui.progress}>{FLOW.map((step, index) => { const currentIndex = FLOW.indexOf(selected.status); const done = currentIndex >= index && selected.status !== "cancelled"; return <UiNode as="div" key={step} style={ui.progressStep}><UiNode as="span" style={{ ...ui.progressDot, background: done ? dy.accent : dy.surface2, borderColor: done ? dy.accent : dy.border }}>{index + 1}</UiNode><UiNode as="strong">{statusLabel(step)}</UiNode></UiNode>; })}</UiNode>

          {org?.org_type === "courier" && <UiNode as="section" style={ui.operatorPanel}>
            <UiNode as="div"><UiNode as="p" style={ui.eyebrow}>KURYE KONTROLÜ</UiNode><UiNode as="h3" style={ui.operatorTitle}>Operasyon aksiyonları</UiNode></UiNode>
            <UiNode as="label" style={ui.field}><UiNode as="span">Sürücü</UiNode><UiNode as="select" value={selected.courier_driver_id ?? ""} onChange={e => void assignDriver(e.target.value)} disabled={busy || !["created", "pickup_requested"].includes(selected.status)} style={ui.select}><UiNode as="option" value="">Sürücü seç</UiNode>{drivers.map(d => <UiNode as="option" key={d.id} value={d.id}><UserText>{d.full_name}</UserText> · {vehicleLabel(d.vehicle_type)} {d.plate ? <UiMessage source="· {0}" values={[d.plate]} userValues={[0]}/> : ""}</UiNode>)}</UiNode></UiNode>
            <UiNode as="div" className="action-row" style={ui.actionRow}>
              {nextStatus && <UiNode as="button" type="button" disabled={busy || nextActionBlockedByDriver} onClick={() => setStatus(nextStatus)} style={ui.primaryButton}>{nextActionBlockedByDriver ? "Önce sürücü seç" : nextStatusLabel(nextStatus)}</UiNode>}
              <UiNode as="button" type="button" disabled={busy || locationBusy || !selected.courier_driver_id} onClick={trackingActive ? toggleLiveTracking : shareCurrentLocation} style={{ ...ui.secondaryButton, ...(trackingActive ? ui.trackingButtonActive : {}) }}>{trackingActive ? "Canlı takibi durdur" : locationBusy ? "Konum alınıyor…" : "Konumumu paylaş"}</UiNode>
              {navigationHref && <UiNode as="a" href={navigationHref} target="_blank" rel="noreferrer" style={ui.navigationLink}>Google Maps navigasyon ↗</UiNode>}
              <UiNode as="button" type="button" disabled={routeBusy} onClick={() => void loadRoute(selected.id, true)} style={ui.secondaryButton}>{routeBusy ? "Rota hesaplanıyor…" : "ETA / rotayı yenile"}</UiNode>
            </UiNode>
          </UiNode>}

          {org?.org_type === "courier" && selected.status === "in_transit" && deliveryFormOpen && <UiNode as="section" style={ui.proofForm}>
            <UiNode as="div"><UiNode as="p" style={ui.eyebrow}>TESLİMAT KANITI</UiNode><UiNode as="h3" style={ui.operatorTitle}>Teslimatı kapat</UiNode><UiNode as="p" style={ui.formHint}>Teslim alan kişi zorunlu. Kod, fotoğraf ve not opsiyoneldir.</UiNode></UiNode>
            <UiNode as="div" style={ui.formGrid}>
              <UiNode as="label" style={ui.field}><UiNode as="span">Teslim alan kişi *</UiNode><UiNode as="input" style={ui.searchInput} value={recipientName} onChange={e => setRecipientName(e.target.value)} maxLength={160} placeholder="Ad Soyad / Resepsiyon"/></UiNode>
              <UiNode as="label" style={ui.field}><UiNode as="span">Teslim kodu / PIN</UiNode><UiNode as="input" style={ui.searchInput} value={confirmationCode} onChange={e => setConfirmationCode(e.target.value)} maxLength={12} inputMode="numeric" placeholder="Opsiyonel"/></UiNode>
            </UiNode>
            <UiNode as="label" style={ui.field}><UiNode as="span">Kurye notu</UiNode><UiNode as="textarea" style={ui.textarea} value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} maxLength={2000} placeholder="Teslimatla ilgili not…"/></UiNode>
            <UiNode as="label" style={ui.fileField}><UiNode as="span">Fotoğraf kanıtı (JPG/PNG, max 8 MB)</UiNode><UiNode as="input" type="file" accept="image/jpeg,image/png" onChange={e => setDeliveryPhoto(e.target.files?.[0] ?? null)}/>{deliveryPhoto && <UiNode as="small">{deliveryPhoto.name} · {(deliveryPhoto.size / 1024 / 1024).toFixed(1)} MB</UiNode>}</UiNode>
            <UiNode as="div" className="action-row" style={ui.actionRow}><UiNode as="button" type="button" disabled={busy} onClick={() => void completeDelivery()} style={ui.primaryButton}>{busy ? uiText("Kaydediliyor…") : "Teslimatı kanıtla ve tamamla"}</UiNode><UiNode as="button" type="button" disabled={busy} onClick={() => setDeliveryFormOpen(false)} style={ui.secondaryButton}>Vazgeç</UiNode></UiNode>
          </UiNode>}

          {proof && <UiNode as="section" style={ui.proofCard}>
            <UiNode as="div" style={ui.proofHead}><UiNode as="div"><UiNode as="p" style={ui.eyebrow}>TESLİMAT KANITI</UiNode><UiNode as="h3" style={ui.operatorTitle}>{proof.recipient_name}</UiNode><UiNode as="span">{fmt(proof.created_at, intlLocale())}</UiNode></UiNode><UiNode as="strong" style={ui.proofBadge}>DOĞRULANDI</UiNode></UiNode>
            <UiNode as="div" className="detail-grid" style={ui.detailGrid}><Info label="Teslim alan" value={proof.recipient_name}/><Info label="Kod" value={proof.confirmation_code_last4 ? `•••• ${proof.confirmation_code_last4}` : "Kullanılmadı"}/></UiNode>
            {proof.delivery_note && <UiNode data-dy-copy-stack as="div" style={ui.notes}><UiNode as="strong">Kurye notu</UiNode><UiNode as="span">{proof.delivery_note}</UiNode></UiNode>}
            {proofPhotoUrl && <UiNode as="a" href={proofPhotoUrl} target="_blank" rel="noreferrer" style={ui.proofPhotoLink}>Teslimat fotoğrafını aç ↗</UiNode>}
          </UiNode>}

          {selected.notes && <UiNode data-dy-copy-stack as="div" style={ui.notes}><UiNode as="strong">Gönderi notu</UiNode><UiNode as="span">{selected.notes}</UiNode></UiNode>}
        </> : <UiNode as="div" style={ui.empty}>Bir gönderi seç.</UiNode>}
      </UiNode>
    </UiNode>
  </UiNode>;
}
function Stat({ label, value, detail }: {
    label: string;
    value: number;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="div" style={ui.stat}><UiNode as="span">{uiText(label)}</UiNode><UiNode as="strong">{value}</UiNode><UiNode as="small">{detail}</UiNode></UiNode>;
}
function Info({ label, value }: {
    label: string;
    value: string;
}) { return <UiNode as="div" style={ui.info}><UiNode as="span">{label}</UiNode><UiNode as="strong">{value}</UiNode></UiNode>; }
function MetricCard({ label, value, detail }: {
    label: string;
    value: string;
    detail: string;
}) {
    const { t: uiText } = useTranslation();
    return <UiNode as="div" style={ui.metricCard}><UiNode as="small">{uiText(label)}</UiNode><UiNode as="strong">{value}</UiNode><UiNode as="span">{detail}</UiNode></UiNode>;
}
function Status({ value, large = false }: {
    value: ShipmentStatus;
    large?: boolean;
}) { return <UiNode as="span" style={{ ...ui.status, fontSize: large ? 14 : 12, padding: large ? "7px 10px" : "5px 7px" }}>{statusLabel(value)}</UiNode>; }
function statusLabel(v: ShipmentStatus) { return { created: "Oluşturuldu", pickup_requested: "Alım Bekliyor", picked_up: "Teslim Alındı", in_transit: "Yolda", delivered: "Teslim Edildi", cancelled: "İptal" }[v]; }
function nextShipmentStatus(v: ShipmentStatus): ShipmentStatus | null { const next: Record<ShipmentStatus, ShipmentStatus | null> = { created: "pickup_requested", pickup_requested: "picked_up", picked_up: "in_transit", in_transit: "delivered", delivered: null, cancelled: null }; return next[v]; }
function nextStatusLabel(v: ShipmentStatus) { return ({ pickup_requested: "Alım talebini başlat", picked_up: "Teslim aldım", in_transit: "Yola çıktım", delivered: "Teslimatı tamamla" } as Partial<Record<ShipmentStatus, string>>)[v] ?? "Sonraki adım"; }
function fmt(v: string, localeTag: string = "tr-TR") {
    try {
        return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
    }
    catch {
        return v;
    }
}
function fmtTime(v: string, localeTag: string = "tr-TR") {
    try {
        return new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(new Date(v));
    }
    catch {
        return v;
    }
}
function shortId(v: string) { return `SHP-${v.slice(0, 8).toUpperCase()}`; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function relativeTime(value: string) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60)
        return "az önce";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60)
        return `${minutes} dk önce`;
    const hours = Math.round(minutes / 60);
    if (hours < 24)
        return `${hours} sa önce`;
    return `${Math.round(hours / 24)} gün önce`;
}
function formatDistance(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value))
        return "—";
    return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(value < 10000 ? 1 : 0)} km`;
}
function formatDuration(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value))
        return "—";
    const minutes = Math.max(0, Math.round(value / 60));
    if (minutes < 60)
        return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}
function buildNavigationHref(shipment: Shipment, location: Location | null) {
    if (shipment.status === "delivered" || shipment.status === "cancelled")
        return null;
    const target = (shipment.status === "created" || shipment.status === "pickup_requested")
        ? shipment.pickup_lat != null && shipment.pickup_lng != null ? [shipment.pickup_lat, shipment.pickup_lng] : null
        : shipment.dropoff_lat != null && shipment.dropoff_lng != null ? [shipment.dropoff_lat, shipment.dropoff_lng] : null;
    if (!target)
        return null;
    const params = new URLSearchParams({ api: "1", destination: `${target[0]},${target[1]}`, travelmode: "driving", dir_action: "navigate" });
    if (location)
        params.set("origin", `${location.latitude},${location.longitude}`);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}
function buildMapPoints(shipment: Shipment, location: Location | null, orgMap: Map<string, Org>): MapPoint[] {
    const points: MapPoint[] = [];
    if (shipment.pickup_lat != null && shipment.pickup_lng != null)
        points.push({ latitude: shipment.pickup_lat, longitude: shipment.pickup_lng, label: shipment.pickup_label || orgMap.get(shipment.from_org_id)?.name || "Alım noktası", kind: "pickup" });
    if (location)
        points.push({ latitude: location.latitude, longitude: location.longitude, label: shipment.courier_name || "Kurye konumu", kind: "courier" });
    if (shipment.dropoff_lat != null && shipment.dropoff_lng != null)
        points.push({ latitude: shipment.dropoff_lat, longitude: shipment.dropoff_lng, label: shipment.dropoff_label || orgMap.get(shipment.to_org_id)?.name || "Teslim noktası", kind: "dropoff" });
    return points;
}
function CourierRouteMap({ points, shipment, pickupLabel, dropoffLabel, trackingCode, route, routeBusy, routeError, onRefresh }: {
    points: MapPoint[];
    shipment: Shipment;
    pickupLabel: string;
    dropoffLabel: string;
    trackingCode: string;
    route: RouteResponse | null;
    routeBusy: boolean;
    routeError: string;
    onRefresh: () => void;
}) {
    const { intlLocale } = useTranslation();
    const width = 800;
    const height = 320;
    const padding = 52;
    const latitudes = points.map(point => point.latitude);
    const longitudes = points.map(point => point.longitude);
    const rawMinLat = latitudes.length ? Math.min(...latitudes) : 0;
    const rawMaxLat = latitudes.length ? Math.max(...latitudes) : 1;
    const rawMinLng = longitudes.length ? Math.min(...longitudes) : 0;
    const rawMaxLng = longitudes.length ? Math.max(...longitudes) : 1;
    const latSpan = Math.max(rawMaxLat - rawMinLat, 0.01);
    const lngSpan = Math.max(rawMaxLng - rawMinLng, 0.01);
    const minLat = (rawMinLat + rawMaxLat) / 2 - latSpan / 2;
    const minLng = (rawMinLng + rawMaxLng) / 2 - lngSpan / 2;
    const project = (point: MapPoint) => ({ x: padding + ((point.longitude - minLng) / lngSpan) * (width - padding * 2), y: height - padding - ((point.latitude - minLat) / latSpan) * (height - padding * 2) });
    const projected = points.map(project);
    const path = projected.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();
    const pickupPoint = points.find(point => point.kind === "pickup");
    const dropoffPoint = points.find(point => point.kind === "dropoff");
    const courierPoint = points.find(point => point.kind === "courier");
    let origin = pickupPoint ? `${pickupPoint.latitude},${pickupPoint.longitude}` : pickupLabel;
    let destination = dropoffPoint ? `${dropoffPoint.latitude},${dropoffPoint.longitude}` : dropoffLabel;
    if ((shipment.status === "created" || shipment.status === "pickup_requested") && courierPoint && pickupPoint) {
        origin = `${courierPoint.latitude},${courierPoint.longitude}`;
        destination = `${pickupPoint.latitude},${pickupPoint.longitude}`;
    }
    if ((shipment.status === "picked_up" || shipment.status === "in_transit") && courierPoint && dropoffPoint) {
        origin = `${courierPoint.latitude},${courierPoint.longitude}`;
        destination = `${dropoffPoint.latitude},${dropoffPoint.longitude}`;
    }
    const googleEmbedHref = googleMapsKey ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(googleMapsKey)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&units=metric&language=tr&region=TR` : null;
    return <UiNode as="section" style={ui.mapShell} aria-label={`Gönderi haritası ${trackingCode}`} uiMessages={{ "aria-label": { source: "G\u00F6nderi haritas\u0131 {0}", values: [trackingCode], userValues: [] } }}>
    <UiNode as="div" style={ui.mapHeader}>
      <UiNode as="div" style={ui.mapHeaderText}><UiNode as="p" style={ui.eyebrow}>{googleEmbedHref ? "GOOGLE MAPS CANLI ROTA" : "ROTA GÖRÜNÜMÜ"}</UiNode><UiNode as="strong">{route?.activeTarget === "pickup" ? "Kurye → alım noktası" : "Alım / kurye → teslim"}</UiNode><UiNode as="span" style={ui.mapHeaderSpan}>{route ? <UiMessage source="{0} · {1}{2}" values={[formatDistance(route.active.distanceMeters), formatDuration(route.active.durationSeconds), route.etaAt ? ` · ETA ${fmtTime(route.etaAt, intlLocale())}` : ""]} userValues={[]}/> : routeError || "Rota verisi bekleniyor"}</UiNode></UiNode>
      <UiNode as="div" style={ui.mapActions}><UiNode as="button" type="button" style={ui.mapButton} onClick={onRefresh} disabled={routeBusy}>{routeBusy ? "Hesaplanıyor…" : "↻ Rota / ETA"}</UiNode></UiNode>
    </UiNode>
    <UiNode as="div" style={ui.mapCanvas}>
      {googleEmbedHref ? <UiNode as="iframe" title={`${trackingCode} Google Maps rotası`} src={googleEmbedHref} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={ui.googleMapFrame} uiMessages={{ "title": { source: "{0} Google Maps rotas\u0131", values: [trackingCode], userValues: [] } }}/> : <UiNode as="svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${trackingCode} rota haritası`} uiMessages={{ "aria-label": { source: "{0} rota haritas\u0131", values: [trackingCode], userValues: [] } }}>
        <defs><linearGradient id="courier-map-bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#102a39"/><stop offset="1" stopColor="#0a1a27"/></linearGradient><filter id="courier-map-glow"><feGaussianBlur stdDeviation="3" result="blur"/><UiNode as="feMerge"><UiNode as="feMergeNode" in="blur"/><UiNode as="feMergeNode" in="SourceGraphic"/></UiNode></filter></defs>
        <rect width={width} height={height} rx="18" fill="url(#courier-map-bg)"/>
        {[1, 2, 3, 4, 5, 6, 7].map(line => <line key={`h-${line}`} x1={0} x2={width} y1={line * height / 8} y2={line * height / 8} stroke="#29485a" strokeOpacity=".34" strokeDasharray="4 10"/>)}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(line => <line key={`v-${line}`} y1={0} y2={height} x1={line * width / 10} x2={line * width / 10} stroke="#29485a" strokeOpacity=".24" strokeDasharray="3 12"/>)}
        {path && <path d={path} fill="none" stroke="#6de2cf" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#courier-map-glow)"/>}
        {projected.map((point, index) => { const source = points[index]; const color = source.kind === "courier" ? "#ffffff" : source.kind === "pickup" ? "#72b8ff" : "#6de2cf"; return <g key={`${source.kind}-${source.latitude}-${source.longitude}`}><circle cx={point.x} cy={point.y} r={source.kind === "courier" ? 17 : 13} fill={color} opacity=".16"/><circle cx={point.x} cy={point.y} r={source.kind === "courier" ? 8 : 6} fill={color} stroke="#07131d" strokeWidth="3"/><UiNode as="text" x={point.x + 13} y={point.y - 12} fill="#f2f6f8" fontSize="13" fontWeight="700">{source.kind === "courier" ? "Kurye" : source.kind === "pickup" ? "Alım" : "Teslim"}</UiNode></g>; })}
        {!points.length && <g><circle cx={width / 2} cy={height / 2} r="26" fill="#6de2cf" opacity=".12"/><UiNode as="text" x={width / 2} y={height / 2 + 5} fill="#96a9b6" textAnchor="middle" fontSize="14">Konum verisi bekleniyor</UiNode></g>}
      </UiNode>}
      {!googleEmbedHref && <UiNode as="div" style={ui.mapLegend}><UiNode as="span"><UiNode as="i" style={{ ...ui.legendDot, background: "#72b8ff" }}/>Alım</UiNode><UiNode as="span"><UiNode as="i" style={{ ...ui.legendDot, background: "#ffffff" }}/>Kurye</UiNode><UiNode as="span"><UiNode as="i" style={{ ...ui.legendDot, background: "#6de2cf" }}/>Teslim</UiNode></UiNode>}
    </UiNode>
  </UiNode>;
}
const ui: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", padding: "24px clamp(18px,4vw,52px) 60px", background: dy.bg, color: dy.text, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 15 }, center: { width: "min(760px,100%)", margin: "100px auto", padding: 28, border: `1px solid ${dy.border}`, borderRadius: dy.radius, background: dy.surface, textAlign: "center" }, header: { maxWidth: 1460, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }, back: { color: dy.muted, textDecoration: "none", fontSize: 13 }, eyebrow: { margin: "14px 0 7px", color: dy.accent, fontSize: 13, fontWeight: 900, letterSpacing: ".15em" }, title: { margin: "0 0 9px", fontSize: "clamp(38px,5vw,58px)", letterSpacing: "-.045em" }, subtitle: { maxWidth: 860, margin: 0, color: dy.muted, fontSize: 15, lineHeight: 1.65 }, headerActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, secondaryLink: { minHeight: 42, display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.surface, color: dy.text, textDecoration: "none", fontWeight: 850, fontSize: 13 }, roleBadge: { padding: "8px 10px", borderRadius: 999, background: dy.accentSoft, color: dy.accent, border: `1px solid ${dy.border}`, fontSize: 13, fontWeight: 900 }, notice: { maxWidth: 1460, margin: "0 auto 12px", padding: "12px 14px", borderRadius: 12, border: `1px solid ${dy.border}`, background: dy.surface2, color: dy.muted, fontSize: 13 }, stats: { maxWidth: 1460, margin: "0 auto 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 9 }, stat: { minHeight: 104, padding: 15, display: "grid", alignContent: "space-between", gap: 5, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface }, commandBar: { maxWidth: 1460, margin: "0 auto 12px", padding: "11px 13px", display: "flex", alignItems: "end", gap: 12, flexWrap: "wrap", border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface }, searchField: { display: "grid", gap: 5, minWidth: "min(100%,290px)", flex: "1 1 290px", color: dy.muted, fontSize: 12, fontWeight: 800 }, searchInput: { minHeight: 42, padding: "0 12px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, outline: "none" }, commandMeta: { display: "flex", alignItems: "center", gap: 7, minHeight: 42, padding: "0 11px", borderRadius: 10, background: dy.surface2, color: dy.muted, fontSize: 12, flex: "1 1 220px" }, commandActions: { display: "flex", alignItems: "center", gap: 7, flex: "0 1 auto", flexWrap: "wrap" }, liveDot: { width: 8, height: 8, borderRadius: 999, background: dy.accent, boxShadow: `0 0 0 4px ${dy.accentSoft}` },
    shell: { maxWidth: 1460, margin: "0 auto", display: "grid", gridTemplateColumns: "360px minmax(0,1fr)", gap: 12 }, listPanel: { padding: 11, border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface }, listTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 9, padding: "5px 4px 11px" }, filterTabs: { display: "flex", gap: 3 }, filterButton: { minHeight: 32, padding: "0 8px", border: 0, borderRadius: 8, fontSize: 13, fontWeight: 850, cursor: "pointer" }, shipmentList: { display: "grid", gap: 7 }, shipmentRow: { width: "100%", padding: 11, display: "grid", gap: 8, border: "1px solid", borderRadius: 12, color: dy.text, textAlign: "left", cursor: "pointer" }, shipmentTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }, caseName: { fontSize: 14, fontWeight: 800 }, routeMini: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "center", gap: 7, color: dy.muted, fontSize: 13, lineHeight: 1.4 }, empty: { minHeight: 180, display: "grid", placeItems: "center", color: dy.muted }, status: { borderRadius: 999, background: dy.accentSoft, color: dy.accent, fontWeight: 900, whiteSpace: "nowrap" },
    detail: { minHeight: 640, padding: 18, border: `1px solid ${dy.border}`, borderRadius: 16, background: dy.surface }, detailHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 15, paddingBottom: 14, borderBottom: `1px solid ${dy.border}` }, detailTitle: { margin: "4px 0 5px", fontSize: 28 }, detailSub: { margin: 0, color: dy.muted, fontSize: 14, lineHeight: 1.5 }, mapShell: { marginTop: 14, padding: 10, border: `1px solid ${dy.border}`, borderRadius: 15, background: dy.surface2 }, mapHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "3px 5px 10px" }, mapHeaderText: { display: "grid", gap: 3 }, mapHeaderSpan: { color: dy.muted, fontSize: 12 }, mapActions: { display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }, mapButton: { minHeight: 34, padding: "0 10px", border: `1px solid ${dy.border}`, borderRadius: 9, background: dy.input, color: dy.text, fontSize: 12, fontWeight: 800, cursor: "pointer" }, mapCanvas: { position: "relative", overflow: "hidden", borderRadius: 12 }, googleMapFrame: { width: "100%", height: 320, display: "block", border: 0, borderRadius: 12 }, mapLegend: { position: "absolute", left: 12, bottom: 10, display: "flex", gap: 10, padding: "6px 8px", borderRadius: 8, background: "rgba(7,19,29,.8)", color: dy.muted, fontSize: 11 }, legendDot: { width: 7, height: 7, display: "inline-block", marginRight: 4, borderRadius: 999 }, routeMetrics: { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }, metricCard: { minHeight: 92, padding: 12, display: "grid", gap: 5, alignContent: "center", border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.input }, routeCard: { marginTop: 10, padding: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr) 100px minmax(0,1fr)", alignItems: "center", gap: 10, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface2 }, routePoint: { display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }, routeDot: { width: 14, height: 14, marginTop: 5, borderRadius: 999, background: dy.accent, boxShadow: `0 0 0 5px ${dy.accentSoft}` }, routeLine: { height: 2, background: dy.border, position: "relative" }, detailGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }, info: { minHeight: 76, padding: 11, display: "grid", gap: 5, border: `1px solid ${dy.border}`, borderRadius: 11, background: dy.input, color: dy.muted, fontSize: 13 }, locationCard: { marginTop: 10, padding: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", border: `1px solid ${dy.border}`, borderRadius: 12, background: dy.accentSoft }, coordinate: { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", color: dy.accent, fontSize: 13, textAlign: "right", whiteSpace: "nowrap" }, progress: { marginTop: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(115px,1fr))", gap: 7 }, progressStep: { minHeight: 78, padding: 8, display: "grid", placeItems: "center", alignContent: "center", gap: 6, border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.surface2, textAlign: "center", fontSize: 13 }, progressDot: { width: 27, height: 27, display: "grid", placeItems: "center", borderRadius: 999, border: "1px solid", color: dy.accentContrast, fontWeight: 900 }, operatorPanel: { marginTop: 14, padding: 14, display: "grid", gap: 11, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface2 }, operatorTitle: { margin: "2px 0 0", fontSize: 19 }, field: { display: "grid", gap: 5, color: dy.muted, fontSize: 13, fontWeight: 750 }, select: { minHeight: 42, padding: "0 10px", borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, fontSize: 13 }, actionRow: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }, primaryButton: { minHeight: 40, border: 0, borderRadius: 10, background: dy.accent, color: dy.accentContrast, fontWeight: 900, fontSize: 13, cursor: "pointer" }, secondaryButton: { minHeight: 40, border: `1px solid ${dy.border}`, borderRadius: 10, background: dy.input, color: dy.text, fontWeight: 850, fontSize: 13, cursor: "pointer" }, trackingButtonActive: { borderColor: dy.accent, background: dy.accentSoft, color: dy.accent }, navigationLink: { minHeight: 40, display: "grid", placeItems: "center", borderRadius: 10, background: dy.accentSoft, color: dy.accent, textDecoration: "none", fontWeight: 900, fontSize: 13 }, notes: { marginTop: 10, padding: 11, display: "grid", gap: 5, borderRadius: 11, border: `1px solid ${dy.border}`, background: dy.input, color: dy.muted, fontSize: 13 },
    proofForm: { marginTop: 14, padding: 14, display: "grid", gap: 11, border: `1px solid ${dy.accent}`, borderRadius: 14, background: dy.accentSoft }, formHint: { margin: "6px 0 0", color: dy.muted, fontSize: 13 }, formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }, textarea: { minHeight: 96, padding: 12, borderRadius: 10, border: `1px solid ${dy.border}`, background: dy.input, color: dy.text, resize: "vertical", outline: "none" }, fileField: { display: "grid", gap: 6, padding: 12, border: `1px dashed ${dy.border}`, borderRadius: 10, color: dy.muted, fontSize: 13 }, proofCard: { marginTop: 14, padding: 14, display: "grid", gap: 10, border: `1px solid ${dy.border}`, borderRadius: 14, background: dy.surface2 }, proofHead: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }, proofBadge: { padding: "7px 9px", borderRadius: 999, background: dy.accentSoft, color: dy.accent, fontSize: 11, letterSpacing: ".08em" }, proofPhotoLink: { display: "inline-flex", width: "fit-content", padding: "9px 11px", borderRadius: 9, background: dy.accentSoft, color: dy.accent, textDecoration: "none", fontWeight: 900, fontSize: 13 },
};
