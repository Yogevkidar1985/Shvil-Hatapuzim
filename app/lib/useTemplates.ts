"use client";

import { useEffect, useState } from "react";
import { api } from "./api-client";
import { DEFAULT_TEMPLATES } from "./template";
import type { TemplateDTO } from "./types";

const FALLBACK: TemplateDTO[] = DEFAULT_TEMPLATES.map((t, i) => ({
  id: `default-${i}`,
  name: t.name,
  body: t.text,
  order: i,
}));

/** טוען את תבניות ההודעה מהמערכת; נופל לברירות המחדל אם אין/שגיאה. */
export function useTemplates(): { templates: TemplateDTO[]; loading: boolean } {
  const [templates, setTemplates] = useState<TemplateDTO[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .listTemplates()
      .then(({ templates }) => {
        if (alive && templates.length > 0) setTemplates(templates);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { templates, loading };
}
