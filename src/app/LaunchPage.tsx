"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import Link from "@/lib/i18n/UiLink";
import { BrandLogo, BrandIcon } from "@/app/BrandLogo";
import { useEffect, useState, type FormEvent } from "react";
type InstallEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: string;
    }>;
};
export default function LaunchPage() {
    const { t: uiText } = useTranslation();
    const [install, setInstall] = useState<InstallEvent | null>(null);
    const [help, setHelp] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent); };
        window.addEventListener("beforeinstallprompt", handler);
        if ("serviceWorker" in navigator)
            void navigator.serviceWorker.register("/sw.js").catch(() => { });
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setMessage("");
        const form = new FormData(e.currentTarget);
        try {
            const response = await fetch("/api/pre-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)), signal: AbortSignal.timeout(15000) });
            if (!response.ok)
                throw new Error(response.status === 429 ? "Çok fazla deneme yaptınız. Biraz sonra tekrar deneyin." : "Ön kayıt şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.");
            setSuccess(true);
            setMessage("Ön kaydınız alındı. Açılış haberini e-posta adresinize ileteceğiz.");
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Bağlantı kurulamadı.");
        }
        finally {
            setBusy(false);
        }
    }
    return <UiNode as="main" className="launch-page">
  <UiNode as="header" className="launch-header"><Link href="/" className="launch-logo"><BrandLogo width={240} height={54} priority/></Link>
   <UiNode as="div" className="launch-actions"><Link href="/workspace">Pilot giriş</Link><UiNode as="button" onClick={async () => { if (!install) {
        setHelp(!help);
        return;
    } try {
        await install.prompt();
        await install.userChoice;
        setInstall(null);
    }
    catch {
        setHelp(true);
    } }}>{uiText("Yükle ")}<UiNode as="span" aria-hidden="true">↓</UiNode></UiNode></UiNode>
  </UiNode>
  {help && <UiNode as="aside" className="install-help" role="status"><UiNode as="strong">DentAYA’yı cihazınıza ekleyin</UiNode><UiNode as="p">iPhone / iPad: Safari’de Paylaş → Ana Ekrana Ekle. Bilgisayar ve Android: tarayıcı menüsünden “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini kullanın. Seçenek görünmüyorsa siteyi tarayıcıda kullanabilirsiniz.</UiNode><UiNode as="button" onClick={() => setHelp(false)}>{uiText("Kapat")}</UiNode></UiNode>}
  <UiNode as="section" className="launch-hero"><UiNode as="p" className="launch-kicker"><UiNode as="span"/> DENTAYA İLE YENİ BİR DÖNEM</UiNode><UiNode as="h1">Dijital diş hekimliği.<UiNode as="br"/><UiNode as="em">Birlikte, daha ileri.</UiNode></UiNode><UiNode as="p" className="launch-coming">Çok yakında hizmetinizde.</UiNode><UiNode as="p" className="launch-description">Klinik, laboratuvar ve tasarım süreçlerini aynı çalışma alanında buluşturuyoruz. Daha net iletişim. Daha düzenli iş akışı.</UiNode><UiNode as="a" href="#on-kayit" className="launch-cta">Ön kayıt yapmak için tıklayınız <UiNode as="span" aria-hidden="true">↗</UiNode></UiNode><UiNode as="small" className="launch-note">İlk haberdar olanlar arasında yerinizi alın.</UiNode></UiNode>
  <UiNode as="section" className="launch-pillars" aria-label="DentAYA çalışma alanları">{[["01", "Klinik & laboratuvar", "Vaka etrafında birleşen ekipler."], ["02", "DentAYA CAD", "Odaklı bir dental tasarım deneyimi."], ["03", "AYA AI", "Çalışma akışınıza eşlik eden asistan."]].map(([n, t, d]) => <UiNode as="article" key={n}><UiNode as="span">{n}</UiNode><UiNode as="h2">{t}</UiNode><UiNode as="p">{d}</UiNode></UiNode>)}</UiNode>
  <UiNode as="section" id="on-kayit" className="launch-register"><UiNode as="div"><UiNode as="p" className="launch-kicker">ERKEN ERİŞİM</UiNode><UiNode as="h2">İlk adımı<UiNode as="br"/>birlikte atalım.</UiNode><UiNode as="p">Açılış ve pilot katılım duyuruları için ön kayıt bırakın.</UiNode></UiNode><UiNode as="form" onSubmit={submit} aria-label="Ön kayıt formu">{!success && <><UiNode as="label">{uiText("Ad soyad")}<UiNode as="input" name="name" autoComplete="name" required maxLength={100}/></UiNode><UiNode as="label">{uiText("E-posta")}<UiNode as="input" name="email" type="email" autoComplete="email" required maxLength={254}/></UiNode><UiNode as="label">Çalışma alanınız<UiNode as="select" name="role" required><UiNode as="option" value="clinic">Klinik / Diş hekimi</UiNode><UiNode as="option" value="laboratory">Laboratuvar / Diş teknisyeni</UiNode><UiNode as="option" value="other">Diğer</UiNode></UiNode></UiNode><UiNode as="label" className="launch-consent"><UiNode as="input" name="consent" type="checkbox" required value="accepted"/> Bilgilerimin DentAYA ön kaydı ve açılış duyuruları için kullanılmasını kabul ediyorum.</UiNode><UiNode as="button" className="launch-cta" disabled={busy}>{busy ? uiText("Kaydediliyor…") : "Ön kayıt oluştur ↗"}</UiNode></>}{message && <UiNode as="p" role="status" className="launch-message">{message}</UiNode>}</UiNode></UiNode>
  <UiNode as="footer" className="launch-footer"><UiNode as="span" className="launch-footer-brand"><BrandIcon width={23} height={23}/> © {new Date().getFullYear()} DentAYA</UiNode><UiNode as="span">Klinikten tasarıma, ortak bir gelecek.</UiNode><Link href="/workspace">Çalışma alanı ↗</Link></UiNode>
 </UiNode>;
}
