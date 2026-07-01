"use client";

import { clsx } from "clsx";

/** סמל המערכת — קובייה תלת־ממדית בזהב על רקע ירוק (מתאר / מקרקעין) */
export default function Logo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl flex items-center justify-center shrink-0 border border-white/15",
        className
      )}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0))",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.5l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5z"
          stroke="#d8b35f"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M12 2.5v19M12 12l8-4.5M12 12l-8-4.5" stroke="#d8b35f" strokeWidth="1.3" strokeLinejoin="round" opacity="0.9" />
      </svg>
    </div>
  );
}
