import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar,
} from "@mui/material";
import { Sparkles } from "lucide-react";
import { parseAIResponse } from "./types";

interface Props { text: string; }

export function AIResponseRenderer({ text }: Props) {
  const parsed = parseAIResponse(text);

  if (!parsed) return <PlainText text={text} />;

  const vm = { // CSS variable aliases
    primary: "var(--vm-primary-600)",
    muted: "var(--vm-text-muted)",
    text: "var(--vm-text-primary)",
    secondary: "var(--vm-text-secondary)",
    bg: "var(--vm-bg-primary)",
    bg2: "var(--vm-bg-secondary)",
    border: "var(--vm-border-subtle)",
    gold: "#10b981",
  };

  return (
    <Box sx={{ my: 1 }}>
      {parsed.title && (
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: vm.gold, mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
          <Sparkles size={14} /> {parsed.title}
        </Typography>
      )}

      {parsed.type === "text" && <PlainText text={(parsed as any).content || text} />}

      {parsed.type === "table" && (
        <Paper sx={{ bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
          <TableContainer>
            <Table size="small">
              {(parsed as any).columns?.length > 0 && (
                <TableHead>
                  <TableRow>
                    {(parsed as any).columns.map((col: string, i: number) => (
                      <TableCell key={i} sx={{ fontWeight: 700, fontSize: "0.68rem", color: vm.gold, borderBottom: `1px solid ${vm.border}`, textTransform: "uppercase" }}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
              )}
              <TableBody>
                {(parsed as any).rows.map((row: string[], i: number) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} sx={{ fontSize: "0.73rem", color: vm.secondary, borderBottom: `1px solid ${vm.border}40`, py: 1 }}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {parsed.type === "metrics" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: `repeat(${Math.min((parsed as any).metrics.length, 4)}, 1fr)` }, gap: 1, mb: 1.5 }}>
          {(parsed as any).metrics.map((m: any, i: number) => (
            <Paper key={i} sx={{ p: 1.5, textAlign: "center", bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2 }}>
              {m.icon && <Box sx={{ fontSize: "1.2rem", mb: 0.25 }}>{m.icon}</Box>}
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: vm.muted, textTransform: "uppercase", mb: 0.25 }}>{m.label}</Typography>
              <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: m.color || vm.text }}>{m.value}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {parsed.type === "people" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mb: 1.5 }}>
          {(parsed as any).people.map((p: any, i: number) => (
            <Paper key={i} sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1.5, bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2 }}>
              <Avatar src={p.avatar} sx={{ width: 40, height: 40, fontSize: "0.85rem", fontWeight: 700, bgcolor: p.statusColor || `${vm.gold}30`, color: p.statusColor || vm.gold }}>
                {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: vm.text }}>{p.name}</Typography>
                {p.subtitle && <Typography sx={{ fontSize: "0.7rem", color: vm.muted }}>{p.subtitle}</Typography>}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {parsed.type === "chart" && <SimpleChart data={parsed as any} vm={vm} />}

      {parsed.type === "confirmation" && (
        <Paper sx={{ p: 2, textAlign: "center", bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2, mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: vm.text }}>{(parsed as any).title || "Confirmation Required"}</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: vm.muted, mt: 0.5 }}>{(parsed as any).message}</Typography>
        </Paper>
      )}
    </Box>
  );
}

function PlainText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <Box>
      {lines.map((line, i) => {
        if (!line.trim()) return <Box key={i} sx={{ height: 6 }} />;
        const t = line.trim();
        if (/^#{1,3}\s/.test(t) || (t.length < 50 && t.endsWith(":"))) {
          return <Typography key={i} sx={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--vm-text-primary)", mt: 1, mb: 0.25 }}>{t.replace(/^#+\s*/, "")}</Typography>;
        }
        if (/^[-*•]\s/.test(t)) {
          return (
            <Box key={i} sx={{ display: "flex", gap: 0.75, pl: 1 }}>
              <Typography sx={{ color: "var(--vm-primary-600)", fontSize: "0.75rem" }}>•</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "var(--vm-text-secondary)", lineHeight: 1.5 }}>{t.replace(/^[-*•]\s*/, "")}</Typography>
            </Box>
          );
        }
        const parts = t.split(/(\*\*[^*]+\*\*)/g);
        if (parts.length > 1) {
          return <Typography key={i} sx={{ fontSize: "0.8rem", color: "var(--vm-text-secondary)", lineHeight: 1.5, mb: 0.25 }}>{parts.map((p, j) => p.startsWith("**") && p.endsWith("**") ? <strong key={j} style={{ color: "var(--vm-text-primary)" }}>{p.slice(2, -2)}</strong> : p.replace(/\*\*/g, ""))}</Typography>;
        }
        // No bold markers — strip any stray ** for safety
        return <Typography key={i} sx={{ fontSize: "0.8rem", color: "var(--vm-text-secondary)", lineHeight: 1.5, mb: 0.25 }}>{t.replace(/\*\*/g, "")}</Typography>;
      })}
    </Box>
  );
}

function SimpleChart({ data, vm }: { data: any; vm: any }) {
  const maxVal = Math.max(...data.datasets.flatMap((d: any) => d.values), 1);
  return (
    <Paper sx={{ p: 2, bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2, mb: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, minHeight: 100, pt: 1, pb: 0.5, overflowX: "auto" }}>
        {data.labels.map((label: string, i: number) => {
          const val = data.datasets[0]?.values[i] || 0;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36, flex: 1 }}>
              <Box sx={{ width: "100%", maxWidth: 44, borderRadius: "4px 4px 0 0", height: `${Math.max(pct, 2)}%`, minHeight: 6, background: `linear-gradient(180deg, ${vm.gold}, ${vm.gold}88)` }} />
              <Typography sx={{ fontSize: "0.6rem", color: vm.muted, mt: 0.5, textAlign: "center" }}>{label}</Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default AIResponseRenderer;
