import type { SVGProps } from 'react';

/** Original 24 px CAD glyphs. Tonal faces distinguish volumes from active edges. */
export type CadIconName = 'orbit' | 'add' | 'reduce' | 'smooth' | 'flatten' | 'margin' | 'measure' | 'connector' | 'scan' | 'design' | 'contacts' | 'thickness' | 'review' | 'eye' | 'eye-off' | 'isolate' | 'layers' | 'undo' | 'redo' | 'fit' | 'save' | 'export' | 'tools' | 'settings' | 'close' | 'collapse' | 'expand' | 'grip' | 'back' | 'next' | 'help' | 'section' | 'wireframe' | 'natural' | 'undercut' | 'top' | 'bottom' | 'front' | 'rear' | 'left' | 'right' | 'iso' | 'round' | 'pointed' | 'flat' | 'symmetry' | 'lock' | 'check' | 'file' | 'camera' | 'reset';

const paths: Record<CadIconName, React.ReactNode> = {
  orbit: <><path d="m8 8 4-2 4 2v7l-4 2-4-2ZM8 8l4 2 4-2M12 10v7"/><path d="M5.3 5.4C1 8.9 2.2 15.7 7 19c4.5 3.1 10.6 1.9 13.2-2.4M18 12l2.7 4.6-5.1.7"/></>,
  add: <><path d="M3 17c2.5 0 3.2-7 7-7s4.4 5 7 5c1.7 0 2.6-1.1 4-2M3 21h18"/><path d="M17 2v6M14 5h6"/><path d="M6 18c1.3-1.2 1.9-3.6 4-4.2" opacity=".55"/></>,
  reduce: <><path d="M3 12c3 0 3.4 5 7 5s4.5-7 7-7c1.5 0 2.8 1 4 2M3 21h18M14 5h6"/><path d="M5 17c1.2 1.6 2.7 2.2 5 2.2" opacity=".55"/></>,
  smooth: <><path d="M3 16c2-5.5 5-7.5 9-5s5.5 2.5 9-.5M3 21h18"/><path d="m14 3 1.7 2.3M19 2l-.6 2.7M22 5l-2.3 1.5"/><path d="M5 18c2-3.5 4.1-4.3 7-2.8s4.9 1.9 7.5.6" opacity=".55"/></>,
  flatten: <><path d="M3 16h18M5 21h14M7 8l5 4 5-4M12 2v10"/><path d="M5 18.5h14" opacity=".55"/></>,
  margin: <><path d="M7.5 3.5c-3.8-1-5 2.7-4 6.5l3 9.5c.8 2.5 3 2.5 3-1v-4h5v4c0 3.5 2.2 3.5 3 1l3-9.5c1-3.8-.2-7.5-4-6.5-1.5.4-3 .9-4.5.9S9 3.9 7.5 3.5Z"/><path d="m4.1 11.9 3.8-1.8 4.1 2 4.1-2 3.8 1.8" strokeDasharray="1.2 2.2" strokeWidth="2"/></>,
  measure: <><path d="m3 16 13-13 5 5L8 21Z"/><path d="m6.5 12.5 2 2M9.5 9.5l3 3M12.5 6.5l2 2"/><path d="m5.5 17 1.5 1.5" opacity=".55"/></>,
  connector: <><path d="M3 9c0-3 1.5-5 4-5s4 2 4 5v9H3ZM13 9c0-3 1.5-5 4-5s4 2 4 5v9h-8Z"/><path d="M10 10h4v5h-4M5.5 8h3M15.5 8h3"/></>,
  scan: <><path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M2 12h20"/><path d="M7 9c.6-2.5 2.3-4 5-4s4.4 1.5 5 4M7 15c.6 2.5 2.3 4 5 4s4.4-1.5 5-4"/><path d="M9.5 8.5 12 7l2.5 1.5M9.5 15.5 12 17l2.5-1.5" opacity=".55"/></>,
  design: <><path d="M7.5 3.5c-3.8-1-5 2.7-4 6.5l3 9.5c.8 2.5 3 2.5 3-1v-4h5v4c0 3.5 2.2 3.5 3 1l3-9.5c1-3.8-.2-7.5-4-6.5-1.5.4-3 .9-4.5.9S9 3.9 7.5 3.5Z"/><path d="M7.2 7.8 10 7l2 2 2-2 2.8.8M12 9v3" opacity=".7"/></>,
  contacts: <><path d="M3 8c0-2.5 1.5-4 4-4s4 1.5 4 4v9H3ZM13 8c0-2.5 1.5-4 4-4s4 1.5 4 4v9h-8Z"/><path d="m9 21 3-2 3 2M12 2v3M10 11h4"/><circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none"/></>,
  thickness: <><path d="M4 4h16v16H4ZM8 8h8v8H8"/><path d="M4 12h4M16 12h4M12 4v4M12 16v4"/></>,
  review: <><path d="M14 3H5v18h14V8ZM14 3v5h5M8 14l3 3 5-6"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  'eye-off': <><path d="M3 3 21 21M9 5a12 12 0 0 1 3 0c6 0 10 7 10 7a21 21 0 0 1-4 4M6 6a21 21 0 0 0-4 6s4 7 10 7a12 12 0 0 0 5-1M10 10a3 3 0 0 0 4 4"/></>,
  isolate: <><path d="M8 2H2v6M16 2h6v6M22 16v6h-6M8 22H2v-6"/><circle cx="12" cy="12" r="4"/></>,
  layers: <><path d="m2 8 10-5 10 5-10 5ZM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
  undo: <><path d="M9 5 3 10l6 5M3 10h11c8 0 8 10 0 10h-3"/></>,
  redo: <><path d="m15 5 6 5-6 5M21 10H10c-8 0-8 10 0 10h3"/></>,
  fit: <><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8"/></>,
  save: <><path d="M3 3h15l3 3v15H3ZM7 3v6h10V3M7 21v-8h10v8"/></>,
  export: <><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/></>,
  tools: <><path d="m4 3 17 17-3 3L1 6ZM17 3l4-1-1 4-5 5-3-3ZM10 14l-7 7"/></>,
  settings: <><path d="M4 3v18M12 3v18M20 3v18"/><path d="M1 8h6M9 16h6M17 9h6" strokeWidth="4"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>, collapse: <path d="m6 15 6-6 6 6"/>, expand: <path d="m6 9 6 6 6-6"/>,
  grip: <><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" strokeWidth="3.5"/></>,
  back: <path d="m14 5-7 7 7 7"/>, next: <path d="m10 5 7 7-7 7"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9 9c0-4 6-4 6 0 0 2-3 2-3 5M12 17h.01"/></>,
  section: <><path d="m4 5 8-3 8 3v14l-8 3-8-3ZM4 5l8 3 8-3M12 8v14M2 13h20" strokeDasharray="0"/></>,
  wireframe: <><path d="m4 5 8-3 8 3v14l-8 3-8-3ZM4 5l8 3 8-3M12 8v14M4 5l8 17 8-17M4 19 12 8l8 11"/></>,
  natural: <><circle cx="12" cy="12" r="9"/><path d="M6 8c2-3 5-4 8-3M7 18c4 3 9 0 10-3"/></>,
  undercut: <><path d="M5 20V5l7-3 7 3v15M12 2v8m-3-3 3 3 3-3M5 15l7-3 7 3"/><path d="M5 20h14" strokeDasharray="2 2"/></>,
  top: <><path d="M4 10h16v11H4ZM12 2v6m-3-3 3 3 3-3"/><path d="M7 14h10M7 17h10"/></>,
  bottom: <><path d="M4 3h16v11H4ZM12 16v6m-3-3 3 3 3-3"/></>,
  front: <><path d="m4 5 8-3 8 3v14l-8 3-8-3ZM4 5l8 3 8-3M12 8v14"/><path d="m7 9 2 1v6l-2-1Z" fill="currentColor" stroke="none"/></>,
  rear: <><path d="m4 5 8-3 8 3v14l-8 3-8-3ZM4 5l8 3 8-3M12 8v14"/><path d="m15 10 2-1v6l-2 1Z" fill="currentColor" stroke="none"/></>,
  left: <><path d="M10 4h11v16H10ZM2 12h6m-3-3 3 3-3 3"/></>,
  right: <><path d="M3 4h11v16H3ZM16 12h6m-3-3 3 3-3 3"/></>,
  iso: <path d="m4 5 8-3 8 3v14l-8 3-8-3ZM4 5l8 3 8-3M12 8v14"/>,
  round: <><path d="M3 18c0-14 18-14 18 0M3 21h18"/></>,
  pointed: <path d="m3 18 9-14 9 14M3 21h18"/>, flat: <path d="m3 18 3-12h12l3 12M3 21h18"/>,
  symmetry: <><path d="M12 2v20M8 5 3 12l5 7M16 5l5 7-5 7"/></>,
  lock: <><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5Z"/><path d="M12 14v4"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  file: <path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h5"/>,
  camera: <><path d="M3 6h5l2-3h4l2 3h5v15H3Z"/><circle cx="12" cy="13" r="4"/></>,
  reset: <><path d="M18 6A8 8 0 1 1 4 9M18 2v4h-4M8 12h8"/></>,
};

/* Shared-color faces stay legible in light, dark and custom accent palettes. */
const volumes: Partial<Record<CadIconName, React.ReactNode>> = {
  orbit: <path d="m8 8 4 2v7l-4-2Z"/>,
  add: <path d="M3 17c2.5 0 3.2-7 7-7s4.4 5 7 5c1.7 0 2.6-1.1 4-2v8H3Z"/>,
  reduce: <path d="M3 12c3 0 3.4 5 7 5s4.5-7 7-7c1.5 0 2.8 1 4 2v9H3Z"/>,
  smooth: <path d="M3 16c2-5.5 5-7.5 9-5s5.5 2.5 9-.5V21H3Z"/>,
  flatten: <path d="M3 16h18l-2 5H5Z"/>,
  margin: <path d="m4.1 11.9 3.8-1.8 4.1 2 4.1-2 3.8 1.8-2.4 7.6c-.8 2.5-3 2.5-3-1v-4h-5v4c0 3.5-2.2 3.5-3 1Z"/>,
  measure: <path d="m3 16 13-13 5 5L8 21Z"/>,
  connector: <><path d="M3 9c0-3 1.5-5 4-5s4 2 4 5v9H3ZM13 9c0-3 1.5-5 4-5s4 2 4 5v9h-8Z"/><path d="M10 10h4v5h-4Z" fillOpacity=".55"/></>,
  scan: <path d="M7 9c.6-2.5 2.3-4 5-4s4.4 1.5 5 4v6c-.6 2.5-2.3 4-5 4s-4.4-1.5-5-4Z"/>,
  design: <path d="M7.5 3.5c-3.8-1-5 2.7-4 6.5l3 9.5c.8 2.5 3 2.5 3-1v-4h5v4c0 3.5 2.2 3.5 3 1l3-9.5c1-3.8-.2-7.5-4-6.5-1.5.4-3 .9-4.5.9S9 3.9 7.5 3.5Z"/>,
  contacts: <path d="M3 8c0-2.5 1.5-4 4-4s4 1.5 4 4v9H3ZM13 8c0-2.5 1.5-4 4-4s4 1.5 4 4v9h-8Z"/>,
  thickness: <path d="M4 4h16v16H4ZM8 8v8h8V8Z" fillRule="evenodd"/>,
  review: <path d="M5 3h9v5h5v13H5Z"/>,
  layers: <path d="m2 8 10-5 10 5-10 5Z"/>,
  isolate: <circle cx="12" cy="12" r="4"/>,
  fit: <path d="M8 8h8v8H8Z"/>,
  section: <path d="m4 13 8 3 8-3v6l-8 3-8-3Z"/>,
  natural: <path d="M12 3a9 9 0 0 1 0 18 14 14 0 0 0 0-18Z"/>,
  undercut: <path d="m5 15 7-3 7 3v5H5Z"/>,
  top: <path d="M4 10h16v11H4Z"/>,
  bottom: <path d="M4 3h16v11H4Z"/>,
  front: <path d="m4 5 8 3v14l-8-3Z"/>,
  rear: <path d="m12 8 8-3v14l-8 3Z"/>,
  left: <path d="M10 4h11v16H10Z"/>,
  right: <path d="M3 4h11v16H3Z"/>,
  iso: <path d="m4 5 8-3 8 3-8 3Z"/>,
  round: <path d="M3 18c0-14 18-14 18 0Z"/>,
  pointed: <path d="m3 18 9-14 9 14Z"/>,
  flat: <path d="m3 18 3-12h12l3 12Z"/>,
};

export default function CadIcon({ name, size = 22, className, ...props }: SVGProps<SVGSVGElement> & { name: CadIconName; size?: number }) {
  return <svg className={`cad-icon cad-icon--${name}${className ? ` ${className}` : ''}`} data-cad-icon={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    {volumes[name] && <g className="cad-icon-volume" fill="currentColor" fillOpacity=".15" stroke="none">{volumes[name]}</g>}
    <g className="cad-icon-edges">{paths[name]}</g>
  </svg>;
}
