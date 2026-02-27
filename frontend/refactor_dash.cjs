const fs = require('fs');

const path = "c:\\Users\\ADMIN\\Desktop\\velocis\\frontend\\src\\app\\pages\\DashboardPage.tsx";
let code = fs.readFileSync(path, 'utf8');

// 1) REMOVE GREETING
code = code.replace(/\{\/\* Greeting \*\/\}.*?\{\/\* ── STAT CARDS ──────────────────────────────────────────────── \*\/\}/s, '{/* ── STAT CARDS ──────────────────────────────────────────────── */}');

// 2) REMOVE KPI STAT CARDS ROW
code = code.replace(/\{\/\* ── STAT CARDS ──────────────────────────────────────────────── \*\/\}.*?\{\/\* ── AGENT HEALTH ─────────────────────────────────────────────── \*\/\}/s, '{/* ── AGENT HEALTH ─────────────────────────────────────────────── */}');

// 3) REMOVE AGENT HEALTH SECTION
code = code.replace(/\{\/\* ── AGENT HEALTH ─────────────────────────────────────────────── \*\/\}.*?\{\/\* ── REPOSITORIES ─────────────────────────────────────────────── \*\/\}/s, '{/* ── REPOSITORIES ─────────────────────────────────────────────── */}');

// --- NAVBAR ---
code = code.replace(/fontWeight: 600, fontSize: 14, color: TEXT, fontFamily: SANS, letterSpacing: "-0\.01em"/g, 'fontWeight: 700, fontSize: 17, color: TEXT, fontFamily: SANS, letterSpacing: "-0.01em"');

code = code.replace(/padding: "2px 8px", borderRadius: 10, fontFamily: MONO \}\}>\s*● sys ok/g, 'padding: "5px 12px", borderRadius: 8, fontFamily: MONO, fontWeight: 600, fontSize: 12 }}>\n              ● sys ok');
code = code.replace(/padding: "2px 8px", borderRadius: 10, fontFamily: MONO \}\}>\s*● 1 warn/g, 'padding: "5px 12px", borderRadius: 8, fontFamily: MONO, fontWeight: 600, fontSize: 12 }}>\n              ● 1 warn');

code = code.replace(/color: t === "24h" \? TEXT : MUTED, fontSize: 11,/g, 'color: t === "24h" ? TEXT : MUTED, fontSize: 12, fontWeight: t === "24h" ? 700 : 500,');

code = code.replace(/borderRadius: 8, padding: "5px 12px",/g, 'borderRadius: 10, padding: "5px 12px",');
code = code.replace(/fontSize: 12, width: "100%", fontFamily: SANS \}\}/g, 'fontSize: 13, width: "100%", fontFamily: SANS }}');
code = code.replace(/height: 60, flexShrink: 0,/g, 'height: 56, flexShrink: 0,');


// --- REPOSITORIES ---
code = code.replace(/fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS \}\}>Repositories/g, 'fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: SANS }}>Repositories');
code = code.replace(/<span style=\{\{ fontSize: 11, color: DIM, background: "#2a2f3a", padding: "1px 7px", borderRadius: 9, fontFamily: MONO \}\}>\s*6 connected\s*<\/span>/g, '');
code = code.replace(/<div style=\{\{ display: "flex", gap: 6, marginLeft: 4 \}\}>/g, '<div style={{ display: "flex", gap: 20, marginLeft: 4 }}>');
code = code.replace(/<span style=\{\{ fontSize: 11, color: (GREEN|AMBER|RED), fontFamily: SANS \}\}>●/g, '<span style={{ fontSize: 13, fontWeight: 500, color: $1, fontFamily: SANS }}>●');

code = code.replace(/fontWeight: 600, fontSize: 13, color: TEXT/g, 'fontWeight: 700, fontSize: 17, color: TEXT');
code = code.replace(/<span style=\{\{ fontSize: 10, color: DIM, fontFamily: SANS \}\}>main ·<\/span>\s*<span style=\{mono\(\{ fontSize: 10, color: DIM \}\)\}>[a-z0-9]+<\/span>/g, function (match) { return match.replace(/fontSize: 10/g, 'fontSize: 10, opacity: 0.4'); });

code = code.replace(/marginLeft: "auto", color: (RED|AMBER|GREEN), fontSize: 10, fontFamily: MONO/g, 'marginLeft: "auto", color: $1, fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 8, background: $1 === RED ? RED_BG : $1 === GREEN ? GRN_BG : AMB_BG, fontFamily: MONO');

code = code.replace(/<span style=\{\{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS \}\}>\s*([A-Za-z]+)\s*<span style=\{\{ color: (RED|GREEN|AMBER) \}\}>→([^<]*)<\/span>\s*<\/span>\s*<span style=\{mono\(\{ fontSize: 10, color: DIM \}\)\}>/g, function (match, agent, c, msg) {
    return `<span style={{ fontSize: 13, color: MUTED, flex: 1, fontFamily: SANS, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 600, color: TEXT }}>${agent} →</span><span style={{ color: ${c} }}>${msg}</span>
                    </span>
                    <span style={mono({ fontSize: 11, color: DIM, opacity: 0.45, flexShrink: 0, marginLeft: "auto" })}>`;
});

// Commit activity secondary info
code = code.replace(/<span style=\{\{ fontSize: 10, color: DIM, fontFamily: SANS \}\}>commit activity · 7d<\/span>/g, '<span style={{ fontSize: 10, color: DIM, opacity: 0.35, fontFamily: SANS }}>commit activity · 7d</span>');
// Reduce spark height
code = code.replace(/width="100%" height=\{36\}/g, 'width="100%" height={28}');
// Percentages
code = code.replace(/<span style=\{\{ fontSize: 10, color: (RED|AMBER|GREEN), fontFamily: MONO, fontWeight: 600 \}\}>([^<]+)<\/span>/g, '<span style={{ fontSize: 13, color: $1, fontFamily: MONO, fontWeight: 600 }}>$2</span>');

code = code.replace(/style=\{card\(\{ padding: "13px 14px", cursor: "pointer" \}\)\}/g, 'style={card({ padding: "20px", cursor: "pointer", borderRadius: 14 })}');
code = code.replace(/<div style=\{\{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 \}\}>/g, '<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>');

// --- ACTIVITY FEED ---
code = code.replace(/fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS \}\}>Activity<\/span>/g, 'fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: SANS }}>Activity</span>');
code = code.replace(/<span style=\{\{ fontSize: 10, color: GREEN, background: GRN_BG, border: `1px solid \$\{GRN_BD\}`, padding: "2px 8px", borderRadius: 9, fontFamily: MONO \}\}>\s*5 new • LIVE\s*<\/span>/g, `<span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: GREEN, background: GRN_BG, border: \`1px solid \${GRN_BD}\`, padding: "2px 8px", borderRadius: 9, fontFamily: MONO }}>5 new • <motion.div animate={{opacity: [1, 0.3, 1]}} transition={{duration: 2, repeat: Infinity}} style={{width: 6, height: 6, borderRadius: "50%", background: GREEN}} /> LIVE</span>`);

code = code.replace(/fontSize: 11, padding: "5px 10px"/g, 'fontSize: 12, padding: "5px 10px"');
code = code.replace(/fontWeight: activityTab === tab.id \? 500 : 400/g, 'fontWeight: activityTab === tab.id ? 600 : 400');
code = code.replace(/color: activityTab === tab.id \? TEXT : MUTED,/g, 'color: activityTab === tab.id ? TEXT : "rgba(255,255,255,0.45)",');


code = code.replace(/<span style=\{\{ fontSize: 10, color: item.color, fontFamily: MONO, opacity: 0.85 \}\}>\s*\{item.label.toLowerCase\(\)\} ·\s*<\/span>\s*<span style=\{\{ fontSize: 10, color: DIM, marginLeft: "auto", fontFamily: MONO \}\}>\{item.time\}<\/span>/g, `<span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: item.color, fontFamily: MONO }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 11, color: DIM, marginLeft: "auto", fontFamily: MONO, opacity: 0.4 }}>{item.time}</span>`);

code = code.replace(/fontSize: 12, color: MUTED, fontFamily: SANS, lineHeight: 1\.4/g, 'fontSize: 13, color: MUTED, fontFamily: SANS, lineHeight: 1.5');
code = code.replace(/<span style=\{mono\(\{ fontSize: 11, color: TEAL \}\)\}>\{item.repo\}<\/span>/g, '<span style={mono({ fontSize: 13, fontWeight: 700, color: TEXT })}>{item.repo}</span>');

code = code.replace(/borderLeft: idx < 5 \? `4px solid \$\{item.color\}` : "4px solid transparent",\s*marginBottom: 2,\s*\}\}>/g, `borderLeft: idx < 5 ? \`4px solid \${item.color}\` : "4px solid transparent",
                    marginBottom: 2,
                    borderBottom: \`1px solid rgba(255,255,255,0.06)\`,
                  }}>`);

// --- SYSTEM STATUS ---
code = code.replace(/fontSize: 11, color: MUTED, marginBottom: 8, fontFamily: SANS, fontWeight: 500 \}\}>System<\/div>/g, 'fontSize: 14, color: TEXT, marginBottom: 8, fontFamily: SANS, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.5 }}>System</div>');

code = code.replace(/<span style=\{\{ fontSize: 11, color: MUTED, fontFamily: SANS \}\}>\{row.label\}<\/span>\s*<span style=\{mono\(\{ fontSize: 11, color: row.color, fontWeight: 600 \}\)\}>\{row.val\}<\/span>/g, `<span style={{ fontSize: 13, fontWeight: 400, color: MUTED, fontFamily: SANS }}>{row.label}</span>
                  <span style={mono({ fontSize: 14, color: row.color === TEXT ? TEXT : row.color, fontWeight: 700 })}>{row.val}</span>`);

code = code.replace(/fontSize: 11, color: MUTED, marginBottom: 8, fontFamily: SANS, fontWeight: 500 \}\}>Recent Deployments<\/div>/g, 'fontSize: 14, color: TEXT, marginBottom: 8, fontFamily: SANS, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.5 }}>Recent Deployments</div>');

code = code.replace(/<span style=\{\{ fontSize: 11, color: TEXT, fontFamily: SANS, flex: 1 \}\}>\{d.repo\}<\/span>\s*<span style=\{\{ fontSize: 10, color: DIM, fontFamily: SANS \}\}>\{d.env\}<\/span>\s*<span style=\{mono\(\{ fontSize: 10, color: DIM \}\)\}>\{d.time\}<\/span>/g, `<span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS, flex: 1 }}>{d.repo}</span>
                  <span style={{ fontSize: 11, opacity: 0.4, color: DIM, fontFamily: SANS }}>{d.env} {d.time}</span>`);

code = code.replace(/width: 6, height: 6, borderRadius: "50%"/g, 'width: 7, height: 7, borderRadius: "50%"');

// --- SPACING ---
code = code.replace(/padding: "18px 20px 24px",\s*display: "flex", gap: 16,\s*\}\}>/g, `padding: "32px 20px 32px",
            display: "flex", gap: 24,
          }}>`);


fs.writeFileSync(path, code);
