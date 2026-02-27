const fs = require('fs');

let content = fs.readFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/src/app/pages/RepositoryPage.tsx', 'utf8');

// Step 1 - Inject Font Import and global reset
content = content.replace(
    /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=[^']+'\);/,
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');"
);

content = content.replace(
    /(\* \{ font-family: [^;]+; \})/,
    `*, *::before, *::after {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
      font-style: normal !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }`
);

// Step 2 - Remove all non-inter fonts and italic
const fontReplacements = [
    { from: /fontFamily:\s*"'Fraunces',\s*Georgia,\s*serif"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontFamily:\s*"'Instrument Serif',\s*serif"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontFamily:\s*"'DM Sans',\s*sans-serif"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontFamily:\s*"'JetBrains Mono',\s*monospace"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontFamily:\s*"var\(--font-display\)"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontFamily:\s*"var\(--font-body\)"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontFamily:\s*"var\(--font-mono\)"/g, to: `fontFamily: "'Inter', sans-serif"` },
    { from: /fontStyle:\s*"italic"/g, to: `fontStyle: "normal"` },
    { from: /font-style:\s*italic/g, to: `font-style: normal` },
    { from: /--font-display:\s*'Fraunces',\s*Georgia,\s*serif/g, to: `--font-display: 'Inter', sans-serif` },
    { from: /--font-body:\s*'DM Sans',\s*sans-serif/g, to: `--font-body: 'Inter', sans-serif` },
    { from: /--font-mono:\s*'JetBrains Mono',\s*monospace/g, to: `--font-mono: 'Inter', sans-serif` }
];

fontReplacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
});

content = content.replace(/const codeFont = "[^"]+";/, `const codeFont = "'Inter', sans-serif";`);

// Step 3 - Specific Element Targeting

// REPO TITLE
content = content.replace(
    /fontSize:\s*"58px",\s*fontWeight:\s*400,\s*letterSpacing:\s*"-1\.5px",\s*lineHeight:\s*1\.0,\s*(color:\s*"#[0-9A-Fa-f]+",)/,
    `fontSize: "42px",
                  fontWeight: 700,
                  letterSpacing: "-1.5px",
                  lineHeight: 1.1,
                  $1`
);

// SECTION HEADINGS
content = content.replace(
    /fontSize:\s*"13px",\s*fontFamily:\s*codeFont,\s*textTransform:\s*"uppercase",\s*letterSpacing:\s*"0\.12em",/g,
    `fontSize: "11px", fontWeight: 600, fontStyle: "normal", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.10em",`
);

// CARD TITLES
content = content.replace(
    /const sectionTitleStyle = \{[\s\S]*?\};/,
    `const sectionTitleStyle = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "17px",
    fontStyle: "normal",
    letterSpacing: "-0.3px",
    lineHeight: 1.3
  };`
);
content = content.replace(
    /<h3 className="text-\[18px\] text-\[#171717\] mb-2 leading-tight" style=\{sectionTitleStyle\}>/g,
    `<h3 className="text-[#171717] mb-2" style={sectionTitleStyle}>`
);
content = content.replace(
    /<h3 className="text-\[16px\] text-\[#171717\](.*?)style=\{sectionTitleStyle\}>/g,
    `<h3 className="text-[#171717]$1style={sectionTitleStyle}>`
);
content = content.replace(
    /<h3 className="text-\[18px\] text-\[#171717\] mb-10"\s+style=\{sectionTitleStyle\}>/g,
    `<h3 className="text-[#171717] mb-10" style={sectionTitleStyle}>`
);

// CARD DESCRIPTIONS
content = content.replace(
    /<p className="text-\[13px\] text-\[#737373\] leading-relaxed mb-6">/g,
    `<p className="text-[#737373] mb-6" style={{ fontSize: "13px", fontWeight: 400, fontStyle: "normal", lineHeight: 1.65, letterSpacing: "0px" }}>`
);

// KPI VALUE
content = content.replace(
    /className="text-\[24px\] font-semibold text-\[#171717\] leading-none mb-1(.*?)">\s*(\{repo\.metrics\..*?\})\s*<\/div>/g,
    `className="text-[#171717] mb-1$1" style={{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.5px" }}>
                  $2
                </div>`
);

// KPI LABEL
content = content.replace(
    /style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px",\s*color:\s*"#737373",\s*textTransform:\s*"uppercase"\s*\}\}>/g,
    `style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em", color: "#737373", textTransform: "uppercase" }}>`
);

// NAVBAR BREADCRUMB
content = content.replace(
    /className="text-\[13px\] text-\[#737373\] flex items-center gap-2"/g,
    `className="text-[#737373] flex items-center gap-2" style={{ fontSize: "13px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }}`
);

// NAVBAR LOGO TEXT
content = content.replace(
    /<div className="font-bold text-lg mb-8 cursor-pointer" onClick=\{([^>]+)\}>Velocis<\/div>/g,
    `<div className="mb-8 cursor-pointer text-black" onClick={$1} style={{ fontSize: "15px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.3px" }}>Velocis</div>`
);
content = content.replace(
    /<div className="font-bold text-lg mb-8">Velocis<\/div>/g,
    `<div className="mb-8 text-black" style={{ fontSize: "15px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.3px" }}>Velocis</div>`
);

// CHIP / BADGE TEXT 
content = content.replace(
    /<div className="flex flex-wrap items-center gap-2" style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px",\s*color:\s*"#737373"\s*\}\}>/g,
    `<div className="flex flex-wrap items-center gap-2" style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em", color: "#737373" }}>`
);
content = content.replace(
    /className="h-7 px-3 rounded-full flex items-center gap-1\.5 text-\[#059669\] border text-\[11px\] font-medium hidden sm:flex"/g,
    `className="h-7 px-3 rounded-full flex items-center gap-1.5 text-[#059669] border hidden sm:flex" style={{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}`
);

// METADATA ROW 
content = content.replace(
    /<span style=\{\{\s*color:\s*"rgba\(0,0,0,0\.4\)"\s*\}\}>Scanned \{repo\.lastScanned\}<\/span>/g,
    `<span style={{ color: "rgba(0,0,0,0.4)", fontSize: "13px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>Scanned {repo.lastScanned}</span>`
);

// And the chips themselves:
content = content.replace(
    /<div className="px-3 py-1 rounded-full border border-\[#E8E8E4\] bg-white\/50">\s*\{repo\.visibility\}\s*<\/div>/g,
    `<div className="px-3 py-1 rounded-full border border-[#E8E8E4] bg-white/50" style={{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}>{repo.visibility}</div>`
);
content = content.replace(
    /<div className="px-3 py-1 rounded-full border border-\[#E8E8E4\] bg-white\/50">\s*\{repo\.language\}\s*<\/div>/g,
    `<div className="px-3 py-1 rounded-full border border-[#E8E8E4] bg-white/50" style={{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}>{repo.language}</div>`
);
content = content.replace(
    /<div className="px-3 py-1 rounded-full border border-\[#E8E8E4\] bg-white\/50">\s*\{repo\.size\}\s*<\/div>/g,
    `<div className="px-3 py-1 rounded-full border border-[#E8E8E4] bg-white/50" style={{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}>{repo.size}</div>`
);

// HEALTH STATUS BADGE TEXT
content = content.replace(
    /<span className="font-semibold uppercase" style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px"\s*\}\}>/g,
    `<span className="uppercase" style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 600, fontStyle: "normal", letterSpacing: "0.01em" }}>`
);

// ACTIVITY TIMELINE — AGENT LABEL
content = content.replace(
    /style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"9px",\s*textTransform:\s*"uppercase",\s*letterSpacing:\s*"0\.15em",\s*color:\s*item\.color,\s*marginBottom:\s*"3px"\s*\}\}/g,
    `style={{ fontFamily: codeFont, fontSize: "10px", fontWeight: 700, fontStyle: "normal", textTransform: "uppercase", letterSpacing: "0.12em", color: item.color, marginBottom: "3px" }}`
);

// ACTIVITY TIMELINE — EVENT TEXT
content = content.replace(
    /<p className="text-\[14px\] text-\[#171717\] font-medium pl-1">/g,
    `<p className="text-[#171717] pl-1" style={{ fontSize: "13px", fontWeight: 400, fontStyle: "normal", lineHeight: 1.5 }}>`
);

// ACTIVITY TIMELINE — TIME CHIP
content = content.replace(
    /style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px",\s*background:\s*"rgba\(0,0,0,0\.04\)",\s*border:\s*"1px solid rgba\(0,0,0,0\.07\)",\s*borderRadius:\s*"99px",\s*padding:\s*"2px 10px",\s*color:\s*"rgba\(0,0,0,0\.6\)"\s*\}\}/g,
    `style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.01em", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "99px", padding: "2px 10px", color: "rgba(0,0,0,0.6)" }}`
);

// CTA BUTTONS
content = content.replace(
    /fontSize:\s*"13px",\s*fontWeight:\s*500,\s*boxShadow:\s*`0 4px 12px \$\{card\.accentColor\}40`,\s*alignSelf:\s*"flex-start"/g,
    `fontSize: "13px", fontWeight: 600, fontStyle: "normal", letterSpacing: "0.01em", boxShadow: \`0 4px 12px \${card.accentColor}40\`, alignSelf: "flex-start"`
);

// GRAPH LABELS
content = content.replace(
    /<text ([^>]+)fontSize=\{([0-9]+)\}\s*(fontFamily="[^"]+")([^>]+)>/g,
    (match, p1, p2, p3, p4) => {
        return `<text ${p1}fontSize={${p2}} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500}${p4}>`
    }
);
content = content.replace(
    /<text ([^>]+)fontSize="([0-9]+)"([^>]+)>/g,
    (match, p1, p2, p3) => `<text ${p1}fontSize="${p2}" fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500}${p3}>`
);
content = content.replace(
    /<text x=\{70\} y=\{58\} fontSize=\{13\} fontWeight=\{600\}(.*?)>([^<]+)<\/text>/g,
    `<text x={70} y={58} fontSize={13} fontWeight={600} fontFamily="'Inter', sans-serif" fontStyle="normal" fill="#141210" textAnchor="middle">$2</text>`
);
content = content.replace(
    /<text x=\{70\} y=\{72\} fontSize=\{8\}(.*?)>([^<]+)<\/text>/g,
    `<text x={70} y={72} fontSize={8} fontWeight={500} fontStyle="normal" fontFamily="'Inter', sans-serif" fill="rgba(0,0,0,0.4)" textAnchor="middle">$2</text>`
);

// SECONDARY TOOL CARD TITLE
content = content.replace(
    /<div className="font-semibold text-\[14px\] text-\[#171717\] mb-0\.5">\{tool\.label\}<\/div>/g,
    `<div className="text-[#171717] mb-0.5" style={{ fontSize: "14px", fontWeight: 600, fontStyle: "normal", letterSpacing: "-0.2px" }}>{tool.label}</div>`
);

// SECONDARY TOOL CARD SUBTITLE
content = content.replace(
    /<div style=\{\{\s*fontSize:\s*"11px",\s*fontFamily:\s*codeFont,\s*color:\s*"rgba\(0,0,0,0\.35\)"\s*\}\}>\{tool\.sub\}<\/div>/g,
    `<div style={{ fontSize: "11px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px", fontFamily: "'Inter', sans-serif", color: "rgba(0,0,0,0.35)" }}>{tool.sub}</div>`
);

// FOOTER TEXT
content = content.replace(
    /className="mt-20 pt-8 border-t border-\[#E8E8E4\] flex flex-col md:flex-row items-center justify-between gap-4 text-\[13px\] text-\[#737373\]"/g,
    `className="mt-20 pt-8 border-t border-[#E8E8E4] flex flex-col md:flex-row items-center justify-between gap-4 text-[#737373]" style={{ fontSize: "12px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}`
);
content = content.replace(
    /<div style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px"\s*\}\}>© 2026 Velocis Technologies<\/div>/g,
    `<div style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 400, fontStyle: "normal" }}>© 2026 Velocis Technologies</div>`
);
content = content.replace(
    /<a href="#" className="hover:text-black transition-colors" style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px"\s*\}\}>/g,
    `<a href="#" className="hover:text-black transition-colors" style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>`
);

// Letter spacing audit cleanup 
content = content.replace(/letterSpacing:\\s*"-0\\.02em"/g, 'letterSpacing: "0px"');

// Total Risks UI
content = content.replace(
    /<span className="font-bold text-\[#737373\] uppercase tracking-wide mt-1" style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px"\s*\}\}>/g,
    `<span className="text-[#737373] uppercase mt-1" style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em" }}>`
);
content = content.replace(
    /<span className="text-\[#737373\] font-medium" style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px"\s*\}\}>/g,
    `<span className="text-[#737373]" style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }}>`
);
content = content.replace(
    /<span style=\{\{\s*fontFamily:\s*codeFont,\s*fontSize:\s*"11px"\s*\}\} className="text-\[#737373\] bg-gray-100 px-2 py-1 rounded">/g,
    `<span style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }} className="text-[#737373] bg-gray-100 px-2 py-1 rounded">`
);

fs.writeFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/src/app/pages/RepositoryPage.tsx', content);
console.log('Typography rewrite completed.');
