"use client";

// בקרת תצוגת טבלה — זום (+/-) ורווח בין עמודות (+/-), עם איפוס.
// הערכים נשמרים ב-localStorage כך שהתצוגה נשמרת בין כניסות.

export const ZOOM_MIN = 0.7;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

export const PAD_MIN = 4;
export const PAD_MAX = 26;
export const PAD_STEP = 2;
export const PAD_DEFAULT = 14;

export const FONT_MIN = 0.8;
export const FONT_MAX = 1.6;
export const FONT_STEP = 0.1;
export const FONT_DEFAULT = 1;

interface Props {
  zoom: number;
  pad: number;
  font: number;
  onZoom: (z: number) => void;
  onPad: (p: number) => void;
  onFont: (f: number) => void;
  onReset: () => void;
}

export default function ViewControls({ zoom, pad, font, onZoom, onPad, onFont, onReset }: Props) {
  const zoomPct = Math.round(zoom * 100);
  const fontPct = Math.round(font * 100);
  const canReset = zoom !== ZOOM_DEFAULT || pad !== PAD_DEFAULT || font !== FONT_DEFAULT;

  return (
    <div className="flex items-center gap-2 text-sm select-none flex-wrap">
      {/* גודל פונט — הגדלה/הקטנה של הטקסט לקריאות */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-soft">
        <span className="text-xs text-slate-400 px-1">פונט</span>
        <CtrlBtn
          label="הקטן פונט"
          disabled={font <= FONT_MIN + 0.001}
          onClick={() => onFont(Math.max(FONT_MIN, +(font - FONT_STEP).toFixed(2)))}
        >
          <span className="text-xs">A</span>
        </CtrlBtn>
        <span className="w-12 text-center font-bold text-slate-700 tabular-nums text-xs">{fontPct}%</span>
        <CtrlBtn
          label="הגדל פונט"
          disabled={font >= FONT_MAX - 0.001}
          onClick={() => onFont(Math.min(FONT_MAX, +(font + FONT_STEP).toFixed(2)))}
        >
          <span className="text-lg leading-none">A</span>
        </CtrlBtn>
      </div>

      {/* זום — גודל הטבלה */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-soft">
        <span className="text-xs text-slate-400 px-1">גודל טבלה</span>
        <CtrlBtn
          label="הקטן"
          disabled={zoom <= ZOOM_MIN + 0.001}
          onClick={() => onZoom(Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2)))}
        >
          −
        </CtrlBtn>
        <span className="w-12 text-center font-bold text-slate-700 tabular-nums text-xs">{zoomPct}%</span>
        <CtrlBtn
          label="הגדל"
          disabled={zoom >= ZOOM_MAX - 0.001}
          onClick={() => onZoom(Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2)))}
        >
          +
        </CtrlBtn>
      </div>

      {/* רווח בין עמודות */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-soft">
        <span className="text-xs text-slate-400 px-1">רווח עמודות</span>
        <CtrlBtn
          label="צמצם רווח"
          disabled={pad <= PAD_MIN}
          onClick={() => onPad(Math.max(PAD_MIN, pad - PAD_STEP))}
        >
          −
        </CtrlBtn>
        {/* מחוון ויזואלי לרמת הרווח */}
        <span className="w-12 flex items-center justify-center gap-[2px]" title={`${pad}px`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-1 bg-slate-400 rounded-full"
              style={{ height: 10, marginInline: Math.max(1, (pad - PAD_MIN) / 4) }}
            />
          ))}
        </span>
        <CtrlBtn
          label="הרחב רווח"
          disabled={pad >= PAD_MAX}
          onClick={() => onPad(Math.min(PAD_MAX, pad + PAD_STEP))}
        >
          +
        </CtrlBtn>
      </div>

      {canReset && (
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
          title="חזרה לברירת המחדל"
        >
          איפוס תצוגה
        </button>
      )}
    </div>
  );
}

function CtrlBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 text-slate-600 font-bold text-base leading-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
