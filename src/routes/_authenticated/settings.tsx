import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings } from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Rules & Settings — InvigilateOS" },
      { name: "description", content: "Configure reporting time, standby reserve and invigilator thresholds." },
      { property: "og:title", content: "Rules & Settings — InvigilateOS" },
      { property: "og:description", content: "Configure reporting time, standby reserve and invigilator thresholds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const getFn = useServerFn(getSettings);
  const saveFn = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => getFn() });

  const [form, setForm] = useState({
    reporting_minutes: 30,
    standby_percentage: 10,
    two_invigilator_threshold: 40,
    max_duties: 12,
  });

  useEffect(() => {
    if (data) {
      setForm({
        reporting_minutes: data.reporting_minutes,
        standby_percentage: data.standby_percentage,
        two_invigilator_threshold: data.two_invigilator_threshold,
        max_duties: data.max_duties,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("Allocation rules updated");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields = [
    ["reporting_minutes", "Reporting time before exam (minutes)"],
    ["standby_percentage", "Standby reserve (% of halls)"],
    ["two_invigilator_threshold", "Students above which a hall needs two invigilators"],
    ["max_duties", "Default maximum duties per faculty"],
  ] as const;

  return (
    <AppShell title="Rules & Settings" description="These values drive the allocation engine">
      <div className="max-w-xl space-y-4 glass rounded-2xl p-6">
        {fields.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type="number"
              min={0}
              disabled={!isAdmin}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
            />
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending || !isAdmin}>
          {isAdmin ? "Save rules" : "View only — admins edit rules"}
        </Button>
      </div>
    </AppShell>
  );
}