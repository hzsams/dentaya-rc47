"use client";
import UiNode from "@/lib/i18n/UiNode";
import {useTranslation} from '@/lib/i18n';
import { useMemo, useState, type CSSProperties, type PointerEvent, } from "react";
import Image from "next/image";
import { dy } from "@/app/dentaya-theme";
export type AyaRobotState = "idle" | "thinking" | "ready" | "alert";
type Tilt = {
    x: number;
    y: number;
};
const STATE_ASSET: Record<AyaRobotState, string> = {
    idle: "/aya/aya-idle.png",
    thinking: "/aya/aya-thinking.png",
    ready: "/aya/aya-ready.png",
    alert: "/aya/aya-alert.png",
};
const STATE_COPY: Record<AyaRobotState, {
    title: string;
    detail: string;
}> = {
    idle: {
        title: "Hazır",
        detail: "Platform bağlamını dinliyor.",
    },
    thinking: {
        title: "Analiz ediyor",
        detail: "Sinyalleri birleştiriyor.",
    },
    ready: {
        title: "Yanıt hazır",
        detail: "Sonraki adımı açıklıyor.",
    },
    alert: {
        title: "Dikkat gerekiyor",
        detail: "Önemli bir operasyon sinyali var.",
    },
};
export default function AyaRobot({ state, score, modelMode, statusText, }: {
    state: AyaRobotState;
    score: number;
    modelMode: "local" | "model";
    statusText: string;
}) {
    const {t:uiText}=useTranslation();
    const [tilt, setTilt] = useState<Tilt>({
        x: 0,
        y: 0,
    });
    const riskColor = score >= 70
        ? "#ff7487"
        : score >= 45
            ? "#e8bd73"
            : score >= 22
                ? "#72b8ff"
                : "#63cc98";
    const copy = STATE_COPY[state];
    const imageStyle = useMemo<CSSProperties>(() => ({
        ...ui.robotImage,
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(18px) scale(1.02)`,
    }), [tilt]);
    function onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX -
            rect.left) /
            Math.max(rect.width, 1);
        const py = (event.clientY -
            rect.top) /
            Math.max(rect.height, 1);
        setTilt({
            x: (0.5 - py) * 5.5,
            y: (px - 0.5) * 8,
        });
    }
    function resetTilt() {
        setTilt({
            x: 0,
            y: 0,
        });
    }
    return (<UiNode as="div" style={ui.wrap}>
      <style>{`
        @keyframes aya3d-enter{
          0%{opacity:0;transform:translateY(14px) scale(.975);filter:blur(7px)}
          100%{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}
        }
        @keyframes aya3d-bg-shift{
          0%,100%{transform:scale(1) translate3d(0,0,0)}
          50%{transform:scale(1.03) translate3d(0,-4px,0)}
        }
        @keyframes aya3d-float{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-7px)}
        }
        @keyframes aya3d-orbit{
          from{transform:rotate(0deg)}
          to{transform:rotate(360deg)}
        }
        @keyframes aya3d-orbit-reverse{
          from{transform:rotate(360deg)}
          to{transform:rotate(0deg)}
        }
        @keyframes aya3d-scan{
          0%{transform:translateY(-110%);opacity:0}
          12%{opacity:.8}
          88%{opacity:.55}
          100%{transform:translateY(650%);opacity:0}
        }
        @keyframes aya3d-pulse{
          0%,100%{opacity:.38;transform:scale(.96)}
          50%{opacity:.88;transform:scale(1.04)}
        }
        @keyframes aya3d-breath{
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-2px) scale(1.01)}
        }
        @keyframes aya3d-halo{
          0%,100%{opacity:.35;transform:translate(-50%,-50%) scale(.96)}
          50%{opacity:.85;transform:translate(-50%,-50%) scale(1.04)}
        }
        @keyframes aya3d-sheen-sweep{
          0%{transform:translateX(-130%) rotate(18deg)}
          100%{transform:translateX(180%) rotate(18deg)}
        }
        @keyframes aya3d-speak{
          0%,100%{transform:scaleX(.5);opacity:.32}
          50%{transform:scaleX(1);opacity:1}
        }
        @keyframes aya3d-alert{
          0%,100%{box-shadow:0 0 0 0 rgba(255,116,135,0)}
          50%{box-shadow:0 0 0 10px rgba(255,116,135,.08)}
        }
        @keyframes aya3d-thinking-dot{
          0%,100%{transform:translateY(0);opacity:.4}
          50%{transform:translateY(-5px);opacity:1}
        }
        @media (prefers-reduced-motion: reduce){
          .aya-motion,.aya-orbit,.aya-scan,.aya-pulse,.aya-wave,.aya-thinking-dot{
            animation:none!important;
            transition:none!important;
          }
        }
      `}</style>

      <UiNode as="div" className="aya-motion" data-state={state} onPointerMove={onPointerMove} onPointerLeave={resetTilt} style={{
            ...ui.stage,
            animation: state === "alert"
                ? "aya3d-alert 1.5s ease-in-out infinite"
                : "aya3d-breath 5s ease-in-out infinite",
        }}>
        <UiNode as="div" className="aya-motion" style={ui.backgroundStage}/>

        <UiNode as="div" style={{
            ...ui.backGlow,
            background: `radial-gradient(circle,${riskColor}2f 0%,${riskColor}10 35%,transparent 72%)`,
        }}/>

        <UiNode as="div" className="aya-pulse" style={{
            ...ui.haloRing,
            borderColor: `${riskColor}52`,
            boxShadow: `0 0 40px ${riskColor}24`,
        }}/>

        <UiNode as="div" style={{
            ...ui.floorGlow,
            background: `radial-gradient(circle, ${riskColor}30 0%, ${riskColor}08 45%, transparent 70%)`,
        }}/>

        <UiNode as="div" style={ui.pedestal}/>

        <UiNode as="div" className="aya-orbit" style={{
            ...ui.orbit,
            borderColor: `${riskColor}58`,
        }}>
          <UiNode as="span" style={{
            ...ui.orbitNode,
            background: riskColor,
        }}/>
        </UiNode>

        <UiNode as="div" className="aya-orbit" style={{
            ...ui.orbit,
            ...ui.orbitInner,
            borderColor: `${riskColor}28`,
            animation: "aya3d-orbit-reverse 12s linear infinite",
        }}>
          <UiNode as="span" style={{
            ...ui.orbitNode,
            width: 5,
            height: 5,
            background: dy.accent,
        }}/>
        </UiNode>

        <UiNode as="div" style={ui.imageWell}>
          <Image key={state} src={STATE_ASSET[state]} alt={`AYA ${uiText(copy.title)}`} draggable={false} className="aya-motion" fill sizes="(max-width: 720px) 80vw, 420px" priority={state === "idle"} style={imageStyle}/>

          <UiNode as="div" className="aya-scan" style={{
            ...ui.scanLine,
            display: state ===
                "thinking"
                ? "block"
                : "none",
        }}/>

          {state ===
            "thinking" && (<UiNode as="div" style={ui.thinkingDots}>
              {[0, 1, 2].map((index) => (<UiNode as="span" key={index} className="aya-thinking-dot" style={{
                    ...ui.thinkingDot,
                    animationDelay: `${index * 0.14}s`,
                    background: riskColor,
                }}/>))}
            </UiNode>)}

          {state === "ready" && (<UiNode as="div" style={ui.voiceWaves}>
              {[0, 1, 2, 3].map((index) => (<UiNode as="span" key={index} className="aya-wave" style={{
                    ...ui.voiceWave,
                    animationDelay: `${index * 0.1}s`,
                    background: riskColor,
                }}/>))}
            </UiNode>)}

          <UiNode as="div" style={ui.sheenSweep}/>
          <UiNode as="div" style={ui.glassSheen}/>
        </UiNode>

        <UiNode as="div" style={ui.topHud}>
          <UiNode as="div">
            <UiNode as="span" style={ui.kicker}>
              AYA · AKILLI YARDIM ASİSTANI
            </UiNode>

            <UiNode as="strong" style={ui.stateTitle}>
              {copy.title}
            </UiNode>
          </UiNode>

          <UiNode as="span" style={{
            ...ui.liveDot,
            background: modelMode ===
                "model"
                ? "#63cc98"
                : "#72b8ff",
            boxShadow: `0 0 16px ${modelMode === "model" ? "#63cc98" : "#72b8ff"}`,
        }}/>
        </UiNode>

        <UiNode as="div" style={ui.bottomHud}>
          <UiNode as="div" style={ui.riskBlock}>
            <UiNode as="span">
              OPERASYON RİSKİ
            </UiNode>

            <UiNode as="strong" style={{
            color: riskColor,
        }}>
              {score}
            </UiNode>
          </UiNode>

          <UiNode as="div" style={ui.riskTrack}>
            <UiNode as="i" style={{
            ...ui.riskFill,
            width: `${Math.max(0, Math.min(100, score))}%`,
            background: `linear-gradient(90deg,${dy.accent},${riskColor})`,
        }}/>
          </UiNode>
        </UiNode>
      </UiNode>

      <UiNode as="div" style={ui.statusCard}>
        <UiNode as="div" style={ui.statusTop}>
          <UiNode as="span" className="aya-pulse" style={{
            ...ui.statusDot,
            background: modelMode ===
                "model"
                ? "#63cc98"
                : "#72b8ff",
        }}/>

          <UiNode as="strong">
            {modelMode ===
            "model"
            ? "AYA · Model bağlı"
            : "AYA · Yerel"}
          </UiNode>

          <UiNode as="span" style={ui.statusState}>
            {copy.detail}
          </UiNode>
        </UiNode>

        <UiNode as="p" style={ui.statusText}>
          {statusText}
        </UiNode>
      </UiNode>
    </UiNode>);
}
const ui: Record<string, CSSProperties> = {
    wrap: {
        width: "min(100%,330px)",
        minWidth: 220,
        display: "grid",
        justifyItems: "center",
        gap: 10,
    },
    stage: {
        position: "relative",
        isolation: "isolate",
        width: "100%",
        aspectRatio: "1 / 1.16",
        minHeight: 300,
        overflow: "hidden",
        border: `1px solid ${dy.border}`,
        borderRadius: 28,
        background: `linear-gradient(180deg,rgba(6,18,28,.96),rgba(3,10,16,.98))`,
        boxShadow: `0 34px 85px ${dy.shadow}, inset 0 1px 0 rgba(255,255,255,.06)`,
        transformStyle: "preserve-3d",
        perspective: 1100,
    },
    backgroundStage: {
        position: "absolute",
        inset: 0,
        zIndex: -3,
        background: "radial-gradient(circle at 22% 18%, rgba(111, 233, 255, .16), transparent 26%), radial-gradient(circle at 78% 24%, rgba(91, 214, 202, .14), transparent 28%), linear-gradient(180deg, rgba(14, 29, 42, .96), rgba(6, 13, 20, .99))",
        animation: "aya3d-bg-shift 8s ease-in-out infinite",
    },
    backGlow: {
        position: "absolute",
        inset: "8% 2% 9%",
        zIndex: -2,
        filter: "blur(9px)",
    },
    haloRing: {
        position: "absolute",
        left: "50%",
        top: "51%",
        width: "62%",
        aspectRatio: "1",
        transform: "translate(-50%,-50%)",
        border: "1px solid",
        borderRadius: "999px",
        animation: "aya3d-halo 2.6s ease-in-out infinite",
        zIndex: -1,
    },
    floorGlow: {
        position: "absolute",
        left: "10%",
        right: "10%",
        bottom: "9%",
        height: "18%",
        filter: "blur(18px)",
        borderRadius: "999px",
        zIndex: -1,
    },
    pedestal: {
        position: "absolute",
        left: "20%",
        right: "20%",
        bottom: "10%",
        height: 16,
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(255,255,255,.02), rgba(255,255,255,.13), rgba(255,255,255,.02))",
        boxShadow: "0 8px 34px rgba(0,0,0,.28)",
        opacity: .65,
        zIndex: 0,
    },
    orbit: {
        position: "absolute",
        zIndex: -1,
        left: "50%",
        top: "49%",
        width: "83%",
        aspectRatio: "1",
        marginLeft: "-41.5%",
        marginTop: "-41.5%",
        border: "1px solid",
        borderRadius: "999px",
        transform: "rotate(18deg)",
        animation: "aya3d-orbit 18s linear infinite",
    },
    orbitInner: {
        width: "67%",
        marginLeft: "-33.5%",
        marginTop: "-33.5%",
        transform: "rotate(-31deg)",
    },
    orbitNode: {
        position: "absolute",
        top: -4,
        left: "50%",
        width: 7,
        height: 7,
        borderRadius: 999,
        boxShadow: `0 0 14px ${dy.accent}`,
    },
    imageWell: {
        position: "absolute",
        inset: "5% 4% 9%",
        zIndex: 2,
        overflow: "visible",
        borderRadius: 23,
        background: "transparent",
        boxShadow: "none",
        transformStyle: "preserve-3d",
    },
    robotImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center bottom",
        userSelect: "none",
        pointerEvents: "none",
        transformOrigin: "50% 72%",
        transition: "transform 140ms ease-out,filter 220ms ease",
        animation: "aya3d-enter .45s ease both, aya3d-float 3.8s ease-in-out .45s infinite",
        filter: "saturate(1.04) contrast(1.03) drop-shadow(0 22px 36px rgba(0,0,0,.32))",
    },
    scanLine: {
        position: "absolute",
        zIndex: 4,
        left: "7%",
        right: "7%",
        top: "8%",
        height: 2,
        borderRadius: 999,
        background: `linear-gradient(90deg,transparent,${dy.accent},transparent)`,
        boxShadow: `0 0 22px ${dy.accent}`,
        animation: "aya3d-scan 2.1s ease-in-out infinite",
    },
    thinkingDots: {
        position: "absolute",
        zIndex: 5,
        right: 16,
        top: 22,
        display: "flex",
        gap: 5,
        padding: "7px 9px",
        border: `1px solid ${dy.border}`,
        borderRadius: 999,
        background: "rgba(3,10,16,.68)",
        backdropFilter: "blur(12px)",
    },
    thinkingDot: {
        width: 5,
        height: 5,
        borderRadius: 999,
        animation: "aya3d-thinking-dot .9s ease-in-out infinite",
    },
    voiceWaves: {
        position: "absolute",
        zIndex: 5,
        right: 16,
        top: 20,
        height: 28,
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "4px 8px",
        border: `1px solid ${dy.border}`,
        borderRadius: 999,
        background: "rgba(3,10,16,.68)",
        backdropFilter: "blur(12px)",
    },
    voiceWave: {
        width: 3,
        height: 17,
        borderRadius: 999,
        transformOrigin: "center",
        animation: "aya3d-speak .65s ease-in-out infinite",
    },
    sheenSweep: {
        position: "absolute",
        top: -20,
        bottom: -20,
        width: "35%",
        zIndex: 5,
        pointerEvents: "none",
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)",
        filter: "blur(2px)",
        animation: "aya3d-sheen-sweep 4.6s ease-in-out infinite",
        opacity: .75,
    },
    glassSheen: {
        position: "absolute",
        inset: 0,
        zIndex: 6,
        pointerEvents: "none",
        background: "linear-gradient(120deg,rgba(255,255,255,.045),transparent 22%,transparent 76%,rgba(255,255,255,.025))",
        mixBlendMode: "screen",
    },
    topHud: {
        position: "absolute",
        zIndex: 8,
        left: 14,
        right: 14,
        top: 13,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
        pointerEvents: "none",
    },
    kicker: {
        display: "block",
        marginBottom: 2,
        color: dy.accent,
        fontSize: 9,
        fontWeight: 950,
        letterSpacing: ".16em",
    },
    stateTitle: {
        display: "block",
        color: dy.text,
        fontSize: 13,
        textShadow: "0 2px 12px rgba(0,0,0,.55)",
    },
    liveDot: {
        width: 8,
        height: 8,
        marginTop: 4,
        borderRadius: 999,
    },
    bottomHud: {
        position: "absolute",
        zIndex: 8,
        left: 14,
        right: 14,
        bottom: 12,
        padding: "9px 10px",
        display: "grid",
        gap: 7,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: "rgba(3,10,16,.72)",
        backdropFilter: "blur(14px)",
    },
    riskBlock: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        color: dy.muted,
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: ".08em",
    },
    riskTrack: {
        height: 4,
        overflow: "hidden",
        borderRadius: 999,
        background: "rgba(255,255,255,.08)",
    },
    riskFill: {
        display: "block",
        height: "100%",
        borderRadius: 999,
        boxShadow: `0 0 15px ${dy.accent}`,
        transition: "width .35s ease",
    },
    statusCard: {
        width: "100%",
        padding: "10px 11px",
        display: "grid",
        gap: 5,
        border: `1px solid ${dy.border}`,
        borderRadius: 12,
        background: `linear-gradient(180deg,${dy.surface2},${dy.surface})`,
        color: dy.muted,
        boxShadow: `0 14px 40px ${dy.shadow}`,
    },
    statusTop: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        fontSize: 11,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        animation: "aya3d-pulse 1.8s ease-in-out infinite",
    },
    statusState: {
        marginLeft: "auto",
        color: dy.muted,
    },
    statusText: {
        margin: 0,
        color: dy.text,
        fontSize: 11,
        lineHeight: 1.45,
    },
};
