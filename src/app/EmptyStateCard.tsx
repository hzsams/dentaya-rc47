"use client";
import UiNode from "@/lib/i18n/UiNode";
import type { CSSProperties, } from "react";
import Link from "@/lib/i18n/UiLink";
import { dy } from "@/app/dentaya-theme";
type Props = {
    eyebrow?: string;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    secondaryLabel?: string;
    secondaryHref?: string;
};
export default function EmptyStateCard({ eyebrow = "BAŞLANGIÇ", title, description, actionLabel, actionHref, onAction, secondaryLabel, secondaryHref, }: Props) {
    return (<UiNode as="section" style={styles.card}>
      <UiNode as="span" style={styles.eyebrow}>
        {eyebrow}
      </UiNode>

      <UiNode as="strong" style={styles.title}>
        {title}
      </UiNode>

      <UiNode as="p" style={styles.text}>
        {description}
      </UiNode>

      {(actionLabel ||
            secondaryLabel) && (<UiNode as="div" style={styles.actions}>
          {actionLabel &&
                actionHref ? (<Link href={actionHref} style={styles.primary}>
              {actionLabel}
            </Link>) : actionLabel &&
                onAction ? (<UiNode as="button" type="button" onClick={onAction} style={styles.primaryButton}>
              {actionLabel}
            </UiNode>) : null}

          {secondaryLabel &&
                secondaryHref && (<Link href={secondaryHref} style={styles.secondary}>
                {secondaryLabel}
              </Link>)}
        </UiNode>)}
    </UiNode>);
}
const styles: Record<string, CSSProperties> = {
    card: {
        width: "100%",
        minHeight: 210,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 7,
        padding: 24,
        border: `1px dashed ${dy.border}`,
        borderRadius: 15,
        background: dy.surface,
        textAlign: "center",
    },
    eyebrow: {
        color: dy.accent,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: ".13em",
    },
    title: {
        maxWidth: 600,
        fontSize: 19,
    },
    text: {
        maxWidth: 620,
        margin: 0,
        color: dy.muted,
        fontSize: 14,
        lineHeight: 1.55,
    },
    actions: {
        display: "flex",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 7,
    },
    primary: {
        minHeight: 41,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 13px",
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 900,
    },
    primaryButton: {
        minHeight: 41,
        padding: "0 13px",
        border: 0,
        borderRadius: 10,
        background: dy.accent,
        color: dy.accentContrast,
        fontSize: 13,
        fontWeight: 900,
        cursor: "pointer",
    },
    secondary: {
        minHeight: 41,
        display: "inline-grid",
        placeItems: "center",
        padding: "0 13px",
        border: `1px solid ${dy.border}`,
        borderRadius: 10,
        background: dy.surface2,
        color: dy.text,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 850,
    },
};
