import { type ReactNode } from "react";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Chip } from "@mui/material";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { parseAIResponse } from "./types";

interface Props { text: string; }

export function AIResponseRenderer({ text }: Props) {
  const parsed = parseAIResponse(text);
  if (parsed) return <StructuredResponse data={parsed} />;
  return <MarkdownText text={text} />;
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  let inCode = false;
  let codeContent = "";

  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <Paper key={`t-${elements.length}`} sx={{ bgcolor: "var(--vm-bg-secondary)", border: "1px solid var(--vm-border-subtle)", borderRadius: 2, overflow: "hidden", my: 1.5 }}>
          <TableContainer><Table size="small">
            {tableHeaders.length > 0 && (
              <TableHead><TableRow>
                {tableHeaders.map((h, i) => <TableCell key={i} sx={{ fontWeight: 700, fontSize: "0.7rem", color: "var(--vm-primary-400)", borderBottom: "1px solid var(--vm-border-subtle)", textTransform: "uppercase", py: 1 }}>{h}</TableCell>)}
              </TableRow></TableHead>
            )}
            <TableBody>
              {tableRows.map((row, i) => (
                <TableRow key={i}>{row.map((cell, j) => (
                  <TableCell key={j} sx={{ fontSize: "0.75rem", color: "var(--vm-text-secondary)", borderBottom: "1px solid rgba(255,255,255,.04)", py: 0.75 }}>{cell}</TableCell>
                ))}</TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        </Paper>
      );
      tableHeaders = [];
      tableRows = [];
    }
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    // Code blocks
    if (t.startsWith("```")) {
      if (inCode) {
        elements.push(
          <Box key={`c-${i}`} sx={{ bgcolor: "rgba(0,0,0,.3)", border: "1px solid var(--vm-border-subtle)", borderRadius: 1.5, p: 1.5, my: 1, fontFamily: "monospace", fontSize: "0.75rem", color: "var(--vm-text-secondary)", whiteSpace: "pre-wrap", overflowX: "auto" }}>
            {codeContent.trim()}
          </Box>
        );
        codeContent = "";
        inCode = false;
      } else {
        flushTable();
        inCode = true;
        codeContent = "";
      }
      continue;
    }
    if (inCode) {
      codeContent += raw + "\n";
      continue;
    }

    // Tables (pipe format)
    if (t.startsWith("|") && t.endsWith("|")) {
      const cells = t.split("|").filter(Boolean).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (cells.every(c => /^[-:]/.test(c) || c === "---" || c === ":---" || c === "---:")) {
        // Separator line - skip
      } else {
        tableRows.push(cells);
      }
      continue;
    }
    flushTable();

    // Empty lines
    if (!t) { elements.push(<Box key={`sp-${i}`} sx={{ height: 4 }} />); continue; }

    // Headers
    if (/^#{1,3}\s/.test(t)) {
      const level = t.match(/^#+/)?.[0]?.length || 1;
      const text = t.replace(/^#+\s*/, "");
      elements.push(
        <Typography key={`h-${i}`} sx={{ fontWeight: 800, fontSize: level === 1 ? "0.95rem" : level === 2 ? "0.88rem" : "0.82rem", color: "var(--vm-text-primary)", mt: 1.5, mb: 0.5 }}>
          {text}
        </Typography>
      );
      continue;
    }

    // Bullet lists
    if (/^[-*•]\s/.test(t)) {
      const itemText = t.replace(/^[-*•]\s*/, "");
      elements.push(
        <Box key={`li-${i}`} sx={{ display: "flex", gap: 0.75, pl: 1, my: 0.15 }}>
          <Typography sx={{ color: "var(--vm-primary-500)", fontSize: "0.75rem", mt: 0.2 }}>•</Typography>
          <FormattedText text={itemText} />
        </Box>
      );
      continue;
    }

    // Numbered lists
    if (/^\d+[.)]\s/.test(t)) {
      const itemText = t.replace(/^\d+[.)]\s*/, "");
      elements.push(
        <Box key={`ol-${i}`} sx={{ display: "flex", gap: 0.75, pl: 1, my: 0.15 }}>
          <Typography sx={{ color: "var(--vm-primary-500)", fontSize: "0.7rem", fontWeight: 700, minWidth: 16, textAlign: "right" }}>{t.match(/^\d+/)?.[0]}.</Typography>
          <FormattedText text={itemText} />
        </Box>
      );
      continue;
    }

    // Regular text
    elements.push(<FormattedText key={`t-${i}`} text={t} />);
  }

  flushTable();
  if (inCode) {
    elements.push(
      <Box key="c-end" sx={{ bgcolor: "rgba(0,0,0,.3)", border: "1px solid var(--vm-border-subtle)", borderRadius: 1.5, p: 1.5, my: 1, fontFamily: "monospace", fontSize: "0.75rem", color: "var(--vm-text-secondary)", whiteSpace: "pre-wrap" }}>
        {codeContent.trim()}
      </Box>
    );
  }

  return <Box sx={{ "& > *": { mb: 0.25 } }}>{elements}</Box>;
}

function FormattedText({ text, sx }: { text: string; sx?: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  if (parts.length === 1) {
    return <Typography sx={{ fontSize: "0.8rem", color: "var(--vm-text-secondary)", lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere", ...sx }}>{text}</Typography>;
  }
  return (
    <Typography sx={{ fontSize: "0.8rem", color: "var(--vm-text-secondary)", lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere", ...sx }}>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "var(--vm-text-primary)", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{ color: "var(--vm-text-primary)" }}>{p.slice(1, -1)}</em>;
        if (p.startsWith("`") && p.endsWith("`")) return <Box key={i} component="code" sx={{ bgcolor: "rgba(255,255,255,.06)", px: 0.5, py: 0.15, borderRadius: 0.5, fontFamily: "monospace", fontSize: "0.75rem" }}>{p.slice(1, -1)}</Box>;
        return <span key={i}>{p}</span>;
      })}
    </Typography>
  );
}

function StructuredResponse({ data }: { data: any }) {
  const vm = { primary: "var(--vm-primary-600)", muted: "var(--vm-text-muted)", text: "var(--vm-text-primary)", secondary: "var(--vm-text-secondary)", bg: "var(--vm-bg-primary)", bg2: "var(--vm-bg-secondary)", border: "var(--vm-border-subtle)", gold: "#10b981" };

  return (
    <Box sx={{ my: 1 }}>
      {data.title && (
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: vm.gold, mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
          <Sparkles size={14} /> {data.title}
        </Typography>
      )}

      {data.type === "text" && <MarkdownText text={data.content || data.text || ""} />}

      {data.type === "table" && (
        <Paper sx={{ bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
          <TableContainer><Table size="small">
            {data.columns?.length > 0 && (
              <TableHead><TableRow>
                {data.columns.map((col: string, i: number) => (
                  <TableCell key={i} sx={{ fontWeight: 700, fontSize: "0.7rem", color: vm.gold, borderBottom: `1px solid ${vm.border}80`, textTransform: "uppercase", py: 1 }}>{col}</TableCell>
                ))}
              </TableRow></TableHead>
            )}
            <TableBody>
              {data.rows?.map((row: string[], i: number) => (
                <TableRow key={i}>{row.map((cell, j) => (
                  <TableCell key={j} sx={{ fontSize: "0.75rem", color: vm.secondary, borderBottom: `1px solid ${vm.border}40`, py: 0.75 }}>{cell}</TableCell>
                ))}</TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        </Paper>
      )}

      {data.type === "metrics" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: `repeat(${Math.min(data.metrics?.length || 2, 4)}, 1fr)` }, gap: 1, mb: 1.5 }}>
          {data.metrics?.map((m: any, i: number) => {
            const TrendIcon = m.trendDirection === "up" ? TrendingUp : m.trendDirection === "down" ? TrendingDown : Minus;
            return (
              <Paper key={i} sx={{ p: 1.5, textAlign: "center", bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2 }}>
                {m.icon && <Box sx={{ fontSize: "1.3rem", mb: 0.25 }}>{m.icon}</Box>}
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: vm.muted, textTransform: "uppercase", mb: 0.25, letterSpacing: 0.3 }}>{m.label}</Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: m.color || vm.text }}>{m.value}</Typography>
                {m.trend && (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25, mt: 0.25 }}>
                    <TrendIcon size={12} color={m.trendDirection === "up" ? "#22c55e" : m.trendDirection === "down" ? "#ef4444" : "#94a3b8"} />
                    <Typography sx={{ fontSize: "0.6rem", color: m.trendDirection === "up" ? "#22c55e" : m.trendDirection === "down" ? "#ef4444" : "#94a3b8" }}>{m.trend}</Typography>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      {data.type === "people" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mb: 1.5 }}>
          {data.people?.map((p: any, i: number) => (
            <Paper key={i} sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1.5, bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2 }}>
              <Avatar src={p.avatar} sx={{ width: 40, height: 40, fontSize: "0.85rem", fontWeight: 700, bgcolor: p.statusColor || `${vm.gold}30`, color: p.statusColor || vm.gold }}>
                {p.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: vm.text }}>{p.name}</Typography>
                {p.subtitle && <Typography sx={{ fontSize: "0.7rem", color: vm.muted }}>{p.subtitle}</Typography>}
                {p.status && <Chip label={p.status} size="small" sx={{ bgcolor: `${p.statusColor || vm.gold}20`, color: p.statusColor || vm.gold, fontSize: "0.6rem", height: 18, mt: 0.25 }} />}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {data.type === "chart" && <SimpleChart data={data} vm={vm} />}

      {data.type === "confirmation" && (
        <Paper sx={{ p: 2, textAlign: "center", bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2, mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: vm.text }}>{data.title || "Confirmation"}</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: vm.muted, mt: 0.5 }}>{data.message}</Typography>
        </Paper>
      )}

      {data.summary && <Typography sx={{ fontSize: "0.75rem", color: vm.muted, mt: 0.5, fontStyle: "italic" }}>{data.summary}</Typography>}
    </Box>
  );
}

function SimpleChart({ data, vm }: { data: any; vm: any }) {
  const maxVal = Math.max(...(data.datasets || []).flatMap((d: any) => d.values || []), 1);
  return (
    <Paper sx={{ p: 2, bgcolor: vm.bg2, border: `1px solid ${vm.border}`, borderRadius: 2, mb: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, minHeight: 100, pt: 1, pb: 0.5, overflowX: "auto" }}>
        {(data.labels || []).map((label: string, i: number) => {
          const val = data.datasets?.[0]?.values?.[i] || 0;
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
