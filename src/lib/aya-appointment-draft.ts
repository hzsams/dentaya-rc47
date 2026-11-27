const route = '/appointments';
const draftParam = 'aya-draft';
let approvedDraft: string | undefined;

export function approveAyaAppointmentDraft() {
    approvedDraft = crypto.randomUUID();
    return `${route}?${draftParam}=${approvedDraft}`;
}

export function consumeAyaAppointmentDraft() {
    const url = new URL(window.location.href);
    if (url.pathname !== route || !url.searchParams.has(draftParam)) return false;

    const intents = url.searchParams.getAll(draftParam);
    const accepted = Boolean(approvedDraft && intents.includes(approvedDraft));
    if (accepted) approvedDraft = undefined;
    url.searchParams.delete(draftParam);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    return accepted && intents.length === 1;
}
