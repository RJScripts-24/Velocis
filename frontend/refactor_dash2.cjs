const fs = require('fs');

const path = "c:\\Users\\ADMIN\\Desktop\\velocis\\frontend\\src\\app\\pages\\DashboardPage.tsx";
let code = fs.readFileSync(path, 'utf8');

// Fix duplicate fontSize from previous script error
code = code.replace(/color: GREEN, fontSize: 11, padding: "5px 12px", borderRadius: 8, fontFamily: MONO, fontWeight: 600, fontSize: 12/g, 'color: GREEN, padding: "5px 12px", borderRadius: 8, fontFamily: MONO, fontWeight: 600, fontSize: 12');
code = code.replace(/color: AMBER, fontSize: 11, padding: "5px 12px", borderRadius: 8, fontFamily: MONO, fontWeight: 600, fontSize: 12/g, 'color: AMBER, padding: "5px 12px", borderRadius: 8, fontFamily: MONO, fontWeight: 600, fontSize: 12');

// Fix text smaller than 11px becoming 12px, except timestamps and chips
code = code.replace(/fontSize: 10, color: DIM/g, 'fontSize: 12, color: DIM');
code = code.replace(/fontSize: 10,/g, 'fontSize: 12,');
code = code.replace(/<span style=\{mono\(\{ fontSize: 10/g, '<span style={mono({ fontSize: 12');

// Typography polish: remove ALL CAPS unless badge
// For system header (uppercase in CSS is fine as it acts as badge/header design)
// For feed agents (uppercase is fine)
// Make sure opacity doesn't drop below 0.3
code = code.replace(/opacity: 0\.35/g, 'opacity: 0.35'); // already fine
code = code.replace(/opacity: 0\.85/g, 'opacity: 0.85'); // fine

fs.writeFileSync(path, code);
