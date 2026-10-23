/** Portable local filename: the export remains explicitly scoped to one unit. */
export function cadWorkingStlFilename(caseNumber: string, unit: string) {
    const safe = caseNumber.normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '-').replace(/\s+/g, '-').replace(/^[. -]+|[. -]+$/g, '').slice(0, 60) || 'DentAYA';
    return `${safe}-DentAYA-unit-${/^\d{2}$/.test(unit) ? unit : 'active'}.stl`;
}
