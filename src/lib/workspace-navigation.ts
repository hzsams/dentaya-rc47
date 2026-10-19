export function canonicalModuleDestination(href: string): string {
    const [route, query] = href.split('?');
    const path = route.replace(/\/+$/, '') || '/';
    const canonical = path === '/cad' ? '/design' : path;
    return query ? `${canonical}?${query}` : canonical;
}
export function uniqueModuleDestinations<T extends { href: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const destination = canonicalModuleDestination(item.href);
        if (seen.has(destination)) return false;
        seen.add(destination);
        return true;
    });
}
