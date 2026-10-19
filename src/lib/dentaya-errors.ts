export type DentayaErrorLike = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

const CUSTOM_MESSAGES: Array<[RegExp, string]> = [
  [/AUTH_REQUIRED/i, "Oturum süren dolmuş olabilir. Tekrar giriş yap."],
  [/PATIENT_CLINIC_REQUIRED/i, "Hasta kaydı yalnız klinik çalışma alanından oluşturulabilir."],
  [/PATIENT_OWNERSHIP_IMMUTABLE/i, "Hasta kaydının bağlı olduğu klinik sonradan değiştirilemez."],
  [/PATIENT_ACCESS_DENIED/i, "Bu hasta kaydı için işlem yetkin yok."],
  [/PATIENT_NOT_FOUND/i, "Hasta kaydı bulunamadı."],
  [/LAB_NOT_FOUND/i, "Seçilen laboratuvar bulunamadı veya aktif değil."],
  [/CASE_OWNERSHIP_IMMUTABLE/i, "Vakanın hasta, klinik veya laboratuvar bağlantısı sonradan değiştirilemez."],
  [/CASE_UPDATE_DENIED/i, "Bu vakada değişiklik yapma yetkin yok."],
  [/LAB_CANNOT_CHANGE_CLINICAL_ORDER/i, "Laboratuvar klinik iş emri alanlarını değiştiremez."],
  [/CLINIC_CANNOT_CHANGE_LAB_NOTE/i, "Klinik laboratuvar iç notunu değiştiremez."],
  [/INVALID_CASE_STATUS_TRANSITION/i, "Bu vaka mevcut durumdan seçilen aşamaya geçirilemez."],
  [/SCAN_CAPTURE_ORG_REQUIRED/i, "Taramanın kaynak kurumu belirlenemedi."],
  [/SCAN_CLINIC_ORIGIN_MISMATCH/i, "Klinik taramasının kaynak bilgisi geçersiz."],
  [/SCAN_LAB_ORIGIN_MISMATCH/i, "Laboratuvar taraması vaka ve laboratuvar kaynağıyla eşleşmelidir."],
  [/SCAN_OWNERSHIP_IMMUTABLE/i, "Taramanın hasta veya kaynak kurum bağlantısı sonradan değiştirilemez."],
  [/SENDER_ORG_ACCESS_DENIED/i, "Bu kurum adına mesaj gönderme yetkin yok."],
  [/DESIGN_REVIEW_ALREADY_DECIDED/i, "Bu tasarım sürümü için karar daha önce verilmiş."],
  [/INVALID_DESIGN_REVIEW_DECISION/i, "Geçersiz tasarım kararı."],
  [/DESIGN_REVIEW_SUBMISSION_IMMUTABLE/i, "Gönderilmiş tasarım sürümünün kimliği değiştirilemez."],
  [/DESIGN_PROJECT_OWNERSHIP_IMMUTABLE/i, "CAD projesinin vaka veya laboratuvar bağlantısı değiştirilemez."],
  [/DESIGN_VERSION_IDENTITY_IMMUTABLE/i, "CAD sürüm kimliği değiştirilemez."],
  [/NOTIFICATION_CONTENT_IMMUTABLE/i, "Bildirim içeriği istemci tarafından değiştirilemez."],
  [/SHIPMENT_IDENTITY_IMMUTABLE/i, "Gönderinin vaka ve rota kimliği değiştirilemez."],
  [/COURIER_ASSIGNMENT_DENIED/i, "Bu aşamada kurye ataması değiştirilemez."],
  [/DRIVER_ORG_MISMATCH/i, "Seçilen sürücü bu kurye kuruluşuna ait değil."],
  [/COURIER_CANNOT_CHANGE_ROUTE/i, "Kurye alım ve teslimat adreslerini değiştiremez."],
  [/INVALID_SHIPMENT_STATUS_TRANSITION/i, "Gönderi bu aşamadan seçilen duruma geçirilemez."],
  [/INVALID_INVITE_EMAIL/i, "Geçerli bir ekip davet e-postası yaz."],
  [/TEAM_ADMIN_REQUIRED/i, "Ekip yönetimi için kurum sahibi veya yönetici olmalısın."],
  [/OWNER_ROLE_CANNOT_BE_INVITED/i, "Kurum sahibi rolü davetle verilemez."],
  [/INVALID_ROLE_FOR_CLINIC/i, "Bu rol klinik çalışma alanında kullanılamaz."],
  [/INVALID_ROLE_FOR_LAB/i, "Bu rol laboratuvar çalışma alanında kullanılamaz."],
  [/INVALID_ROLE_FOR_COURIER/i, "Bu rol kurye çalışma alanında kullanılamaz."],
  [/USER_ALREADY_MEMBER/i, "Bu e-posta zaten kurumun aktif bir üyesi."],
  [/INVITE_TOKEN_REQUIRED/i, "Davet bağlantısı eksik."],
  [/ACCOUNT_EMAIL_REQUIRED/i, "Hesabında doğrulanabilir bir e-posta adresi bulunamadı."],
  [/INVITE_NOT_FOUND/i, "Davet bağlantısı bulunamadı veya geçersiz."],
  [/INVITE_REVOKED/i, "Bu ekip daveti iptal edilmiş."],
  [/INVITE_ALREADY_ACCEPTED/i, "Bu ekip daveti daha önce başka bir hesap tarafından kabul edilmiş."],
  [/INVITE_EXPIRED/i, "Bu ekip davetinin süresi dolmuş. Kurum yöneticisinden yeni bağlantı iste."],
  [/INVITE_EMAIL_MISMATCH/i, "Bu davet başka bir e-posta adresi için oluşturulmuş. Davet edilen e-postayla giriş yap."],
  [/USER_ALREADY_HAS_ACTIVE_ORG/i, "Bu hesap zaten başka bir aktif çalışma alanına bağlı. Pilot sürümde aynı anda tek aktif kurum destekleniyor."],
  [/TEAM_MEMBER_NOT_FOUND/i, "Ekip üyesi bulunamadı."],
  [/CANNOT_CHANGE_SELF_STATUS/i, "Kendi üyeliğini bu ekrandan pasifleştiremezsin."],
  [/OWNER_CANNOT_BE_SUSPENDED/i, "Kurum sahibi pasifleştirilemez."],
  [/ADMIN_CANNOT_MANAGE_ADMIN/i, "Yönetici başka bir yöneticinin durumunu değiştiremez; bu işlem kurum sahibi tarafından yapılmalı."],
  [/INVALID_MEMBER_STATUS/i, "Geçersiz ekip üyeliği durumu."],
  [/OWNER_REQUIRED/i, "Bu işlem yalnız kurum sahibi tarafından yapılabilir."],
  [/OWNER_ROLE_IMMUTABLE/i, "Kurum sahibi rolü bu ekrandan değiştirilemez."],
  [/ORGANIZATION_IDENTITY_IMMUTABLE/i, "Kurum türü, slug ve demo kimliği sonradan değiştirilemez."],
  [/INVALID_ORGANIZATION_NAME/i, "Kurum adı 2 ile 120 karakter arasında olmalı."],
];

export function dentayaError(
  error: unknown,
  fallback = "İşlem tamamlanamadı. Lütfen tekrar dene."
): string {
  const normalized = normalizeDentayaError(error);
  const raw = normalized.message ?? "";

  for (const [pattern, text] of CUSTOM_MESSAGES) {
    if (pattern.test(raw)) return text;
  }

  const code = normalized.code ?? null;

  if (code === "23505") {
    return "Bu işlem zaten kaydedilmiş. Sayfayı yenileyip devam edebilirsin.";
  }

  if (code === "23514") {
    return "Girilen bilgiler izin verilen sınırlarla uyuşmuyor. Alanları kontrol et.";
  }

  if (code === "23503") {
    return "Bağlı kayıt bulunamadı veya artık kullanılamıyor.";
  }

  if (code === "42501" || /row-level security|permission denied|not authorized/i.test(raw)) {
    return "Bu işlem için yetkin yok.";
  }

  if (/failed to fetch|network|networkerror|fetch failed|load failed/i.test(raw)) {
    return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
  }

  if (/jwt|token|session/i.test(raw)) {
    return "Oturum bilgisi yenilenemedi. Sayfayı yenileyip tekrar giriş yapman gerekebilir.";
  }

  if (/timeout|timed out/i.test(raw)) {
    return "İşlem beklenenden uzun sürdü. Tekrar deneyebilirsin.";
  }

  return raw.trim() || fallback;
}

function normalizeDentayaError(error: unknown): DentayaErrorLike {
  if (error == null) return {};

  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    return {
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : null,
      code:
        typeof candidate.code === "string"
          ? candidate.code
          : candidate.code != null
            ? String(candidate.code)
            : null,
      details:
        typeof candidate.details === "string"
          ? candidate.details
          : null,
      hint:
        typeof candidate.hint === "string"
          ? candidate.hint
          : null,
    };
  }

  return { message: String(error) };
}

export function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isReasonablePhone(value: string): boolean {
  if (!value.trim()) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function isFutureDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T23:59:59`);
  return Number.isFinite(date.getTime()) && date.getTime() >= Date.now();
}

export function isNonFutureDate(value: string): boolean {
  if (!value) return true;
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return false;
  const tomorrow = new Date();
  tomorrow.setHours(23, 59, 59, 999);
  return date.getTime() <= tomorrow.getTime();
}
