"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from "@/lib/i18n/UiLink";
import DentayaIcon from './DentayaIcon';
import { filterModuleTree, isCurrentModule, MODULE_TREE, moduleAncestorIds, moduleFolderIds, type ModuleNode } from '@/lib/module-navigation';
import { moduleNavigationText } from '@/lib/i18n/module-navigation';

export default function ModuleNavigation({ pathname }: { pathname: string }) {
  const { t: uiText, locale } = useTranslation();
  const copy = moduleNavigationText(locale);
  const tree = useRef<HTMLElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(() => new Set(moduleAncestorIds(MODULE_TREE, pathname)));
  const [search, setSearch] = useState({ query: '', collapsed: new Set<string>() });
  useEffect(() => {
    // A new destination reveals its path without discarding other open folders.
    // Closing and reopening the same menu leaves the user's search and folds alone.
    setExpanded(current => new Set([...current, ...moduleAncestorIds(MODULE_TREE, pathname)]));
    setSearch({ query: '', collapsed: new Set() });
  }, [pathname]);
  const searching = Boolean(search.query.trim());
  const label = (node: ModuleNode) => node.kind === 'folder' ? copy.folders[node.label] : uiText(node.label);
  const visible = filterModuleTree(MODULE_TREE, search.query, label);
  const openFolders = searching ? new Set(moduleFolderIds(visible).filter(folder => !search.collapsed.has(folder))) : expanded;

  function toggle(folder: string) {
    if (searching) setSearch(current => {
      const collapsed = new Set(current.collapsed);
      if (collapsed.has(folder)) collapsed.delete(folder); else collapsed.add(folder);
      return { ...current, collapsed };
    });
    else setExpanded(current => {
      const next = new Set(current);
      if (next.has(folder)) next.delete(folder); else next.add(folder);
      return next;
    });
  }
  const controls = () => Array.from(tree.current?.querySelectorAll<HTMLElement>('[data-module-control]') ?? []).filter(control => control.getClientRects().length > 0);
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-module-control]');
    if (!target) return;
    const items = controls(), index = items.indexOf(target), folder = target.dataset.folderId;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      items[next]?.focus();
    } else if (event.key === 'ArrowRight' && folder) {
      event.preventDefault();
      if (!openFolders.has(folder)) toggle(folder);
      else target.parentElement?.querySelector<HTMLElement>(':scope > ul > li > [data-module-control]')?.focus();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (folder && openFolders.has(folder)) toggle(folder);
      else items.find(item => item.dataset.folderId === target.dataset.parentFolder)?.focus();
    }
  }
  function render(nodes: ModuleNode[], parent?: string) {
    return nodes.map(node => {
      if (node.kind === 'module') return <UiNode as="li" key={node.href}><Link className="desktop-module-leaf" data-module-control="" data-parent-folder={parent} href={node.href} aria-current={isCurrentModule(pathname, node.href) ? 'page' : undefined} translateChildren={false}><DentayaIcon name={node.icon} size={17}/><UiNode as="span" translateChildren={false}>{label(node)}</UiNode></Link></UiNode>;
      const open = openFolders.has(node.id), childrenId = `${id}-${node.id.replaceAll('/', '-')}`;
      return <UiNode as="li" key={node.id} className={node.label === 'system' ? 'module-system-tools' : undefined}>
        <UiNode as="button" type="button" className="desktop-module-folder" data-module-control="" data-folder-id={node.id} data-parent-folder={parent} aria-expanded={open} aria-controls={childrenId} onClick={() => toggle(node.id)} translateChildren={false}>
          <svg className="module-folder-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 2 4 4-4 4"/></svg>
          <svg className="module-folder-icon" width="19" height="18" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={open ? 'M3 7V4h7l2 3h9v3M2 10h21l-3 10H5L2 10Z' : 'M3 5h7l2 3h9v12H3V5Z'}/></svg>
          <UiNode as="span" translateChildren={false}>{label(node)}</UiNode>
        </UiNode>
        <UiNode as="ul" id={childrenId} hidden={!open}>{render(node.children, node.id)}</UiNode>
      </UiNode>;
    });
  }
  return <>
    <UiNode as="label" className="module-search" translateChildren={false}><UiNode as="span" translateChildren={false}>{copy.search}</UiNode><UiNode as="input" type="search" placeholder={copy.placeholder} value={search.query} onChange={event => setSearch({ query: event.target.value, collapsed: new Set() })} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); controls()[0]?.focus(); } }}/></UiNode>
    <UiNode as="nav" ref={tree} className="desktop-module-tree-nav" aria-label={copy.navigation} onKeyDown={keyboard} translateChildren={false}>
      <UiNode as="ul" className="desktop-module-tree">{render(visible)}</UiNode>
      {!visible.length && <UiNode as="p" className="module-no-results" role="status" translateChildren={false}>{copy.noResults}</UiNode>}
    </UiNode>
    <UiNode as="p" className="module-tree-keyboard-hint" translateChildren={false}>{copy.keyboardHint}</UiNode>
  </>;
}
