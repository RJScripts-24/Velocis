const fs = require('fs');

let content = fs.readFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/src/app/pages/RepositoryPage.tsx', 'utf8');
const galaxyDef = fs.readFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/galaxy.tsx', 'utf8');

// 1. Inject GalaxyBackground
content = content.replace(/export function RepositoryPage\(\) \{/, galaxyDef + '\nexport function RepositoryPage() {');

// 2. Add GalaxyBackground inside JSX
content = content.replace(
    /<style dangerouslySetInnerHTML=\{\{ __html: fontStyle \}\} \/>/,
    `<style dangerouslySetInnerHTML={{ __html: fontStyle }} />
      <GalaxyBackground isDark={isDark} />
      {!isDark && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'rgba(245,245,244,0.88)',
          pointerEvents: 'none',
        }} />
      )}`
);

// 3. Z-Index Layering
content = content.replace(/zIndex: 9999, pointerEvents:/g, 'zIndex: 9997, pointerEvents:');
content = content.replace(/zIndex: 0\s*\}\}\s*\/>/g, 'zIndex: 2 }} />');

// 4. Card Transparency Upgrade
// Dark
content = content.replace(/cardBg:\s*"#0D1117"/g, 'cardBg: "rgba(12,15,24,0.75)"');
content = content.replace(/kpiBg:\s*"#0D1117"/g, 'kpiBg: "rgba(12,15,24,0.70)"');
content = content.replace(/navBg:\s*"rgba\(1,3,8,0\.85\)"/g, 'navBg: "rgba(1,3,8,0.82)"');
content = content.replace(/sidebarBg:\s*"#0D1117"/g, 'sidebarBg: "rgba(12,15,24,0.80)"');

// Light
content = content.replace(/cardBg:\s*"#FFFFFF"/g, 'cardBg: "rgba(255,255,255,0.82)"');
content = content.replace(/kpiBg:\s*"#FFFFFF"/g, 'kpiBg: "rgba(255,255,255,0.78)"');
content = content.replace(/navBg:\s*"rgba\(245,245,244,0\.92\)"/g, 'navBg: "rgba(245,245,244,0.78)"');
content = content.replace(/sidebarBg:\s*"#FFFFFF"/g, 'sidebarBg: "rgba(255,255,255,0.80)"');

// Nav Blur
content = content.replace(/navBlur:\s*"blur\([0-9]+px\)"/g, 'navBlur: "blur(12px) saturate(140%)"');

// Backdrop Filter string
const filter = "backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)', ";

// Add backdrop filter to ALL cards, sidebar, and kpi strip
content = content.replace(
    /style=\{\{ background: t\.sidebarBg,/g,
    `style={{ background: t.sidebarBg, ${filter}`
);
content = content.replace(
    /background: t\.kpiBg,/g,
    `background: t.kpiBg, ${filter}`
);
content = content.replace(
    /style=\{\{ background: t\.cardBg,/g,
    `style={{ background: t.cardBg, ${filter}`
);

// 5. Dark Mode Background Color
content = content.replace(
    /<div className="min-h-screen relative flex" style=\{\{ backgroundColor: t\.pageBg, transition: "background-color 0\.3s ease, color 0\.3s ease" \}\}>/,
    `<div className="min-h-screen relative flex" style={{ position: 'relative', zIndex: 10, backgroundColor: isDark ? 'transparent' : t.pageBg, transition: "background-color 0.3s ease, color 0.3s ease" }}>`
);

// Remove specific bg-white classes that override transparency
content = content.replace(/className="p-7 flex flex-col h-full bg-white"/g, 'className="p-7 flex flex-col h-full"');
content = content.replace(/className="p-8 mb-14 bg-white"/g, 'className="p-8 mb-14"');
content = content.replace(/className="p-5 flex items-center justify-between group cursor-pointer bg-white overflow-hidden relative"/g, 'className="p-5 flex items-center justify-between group cursor-pointer overflow-hidden relative"');

// Inject backdropFilter into premiumCardStyle
content = content.replace(
    /const premiumCardStyle = \{[\s\S]*?transition: "all 0\.3s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)"[\r\n\s]*\};/,
    `const premiumCardStyle = {
    background: t.cardBg,
    ${filter}
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: "20px",
    boxShadow: \`
      0 1px 2px rgba(0,0,0,0.04),
      0 4px 8px rgba(0,0,0,0.03),
      0 12px 32px rgba(0,0,0,0.04),
      inset 0 1px 0 rgba(255,255,255,1)
    \`,
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
  };`
);

fs.writeFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/src/app/pages/RepositoryPage.tsx', content);
console.log('Update Complete.');
