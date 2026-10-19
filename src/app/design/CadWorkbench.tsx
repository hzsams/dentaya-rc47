'use client';
import UiNode from '@/lib/i18n/UiNode';
import { useTranslation } from '@/lib/i18n';
import { useState, type RefObject } from 'react';
import type { CadCameraBookmark, DesignViewportHandle } from './DesignViewport';
import CadWorkspaceSettings from './CadWorkspaceSettings';
export default function CadWorkbench({ viewport, ready }: { viewport: RefObject<DesignViewportHandle | null>; ready: boolean }) {
    const { t: uiText } = useTranslation();
    const [slots, setSlots] = useState<(CadCameraBookmark | null)[]>([null, null, null]);
    const [message, setMessage] = useState('');
    async function capture() {
        try {
            const blob = await viewport.current?.captureImage();
            if (!blob) throw Error();
            const url = URL.createObjectURL(blob), link = document.createElement('a');
            link.href = url;
            link.download = 'DentAYA-CAD-gorunum.png';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
            setMessage('Sahne görüntüsü PNG olarak indirildi.');
        } catch { setMessage('Görüntü alınamadı. Modelin yüklenmesini bekleyin.'); }
    }
    return <UiNode as="details" className="cad-workbench">
        <UiNode as="summary">Kamera konumları</UiNode>
        <UiNode as="div" className="cad-workbench-body">
            <UiNode as="section"><UiNode as="p">Bu model açıkken üç farklı bakış açısını saklayın.</UiNode>
                {slots.map((slot, index) => <UiNode as="div" className="cad-bookmark-row" key={index}>
                    <UiNode as="span">Konum {index + 1}</UiNode>
                    <UiNode as="button" type="button" disabled={!ready} onClick={() => {
                        const value = viewport.current?.captureCamera();
                        if (value) { setSlots(current => current.map((item, i) => i === index ? value : item)); setMessage(`Konum ${index + 1} kaydedildi.`); }
                    }}>{slot ? 'Üzerine kaydet' : uiText('Kaydet')}</UiNode>
                    <UiNode as="button" type="button" disabled={!ready || !slot} onClick={() => { if (slot) viewport.current?.restoreCamera(slot); }}>Git</UiNode>
                    <UiNode as="button" type="button" disabled={!slot} aria-label={`Konum ${index + 1} sil`} onClick={() => setSlots(current => current.map((item, i) => i === index ? null : item))} uiMessages={{ 'aria-label': { source: 'Konum {0} sil', values: [index + 1], userValues: [] } }}>{uiText('Sil')}</UiNode>
                </UiNode>)}
                <UiNode as="button" type="button" disabled={!ready} onClick={() => void capture()}>Sahneyi PNG olarak indir</UiNode>
            </UiNode>
            <CadWorkspaceSettings /><UiNode as="p" role="status">{message}</UiNode>
        </UiNode>
    </UiNode>;
}
