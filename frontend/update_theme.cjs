const fs = require('fs');
let content = fs.readFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/src/app/pages/RepositoryPage.tsx', 'utf8');

// Insert Moon and Sun icons
content = content.replace(
    /import \{\n  Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch,\n  ChevronRight, Home, Activity, Settings, Webhook, Sliders,\n  TrendingUp, AlertCircle, Cloud, Folder, FileText, Bot, Mail, Menu\n\} from 'lucide-react';/,
    `import {\n  Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch,\n  ChevronRight, Home, Activity, Settings, Webhook, Sliders,\n  TrendingUp, AlertCircle, Cloud, Folder, FileText, Bot, Mail, Menu, Sun, Moon\n} from 'lucide-react';`
);

// Insert theme objects right before the RepositoryPage component definition
const themeObjects = `
const lightTheme = {
  // Backgrounds
  pageBg:        "#F5F5F4",
  surface:       "#FFFFFF",
  surfaceRaised: "#FAFAF9",
  surfaceHover:  "#F5F5F4",

  // Borders
  border:        "#E7E5E4",
  borderSubtle:  "#F0EFED",
  borderHover:   "#D6D3D1",

  // Text
  text1:         "#1C1917",
  text2:         "#78716C",
  text3:         "#A8A29E",
  textPlaceholder:"#D6D3D1",

  // Navbar
  navBg:         "rgba(245,245,244,0.92)",
  navBorder:     "#E7E5E4",
  navBlur:       "blur(12px)",

  // Sidebar
  sidebarBg:     "#FFFFFF",
  sidebarBorder: "#E7E5E4",
  sidebarIcon:   "#A8A29E",
  sidebarActive: "#F5F3FF",

  // KPI strip
  kpiBg:         "#FFFFFF",
  kpiBorder:     "#E7E5E4",
  kpiDivider:    "#E7E5E4",

  // Cards
  cardBg:        "#FFFFFF",
  cardBorder:    "#E7E5E4",
  cardShadow:    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  cardShadowHover:"0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",

  // Timeline
  timelineRowHover: "#FAFAF9",

  // Tool cards
  toolBg:        "#FFFFFF",
  toolBorder:    "#E7E5E4",
  toolBgHover:   "#FAFAF9",

  // Toggle button
  toggleBg:      "#1C1917",
  toggleText:    "#FFFFFF",
  toggleBorder:  "transparent",

  // Footer
  footerBg:      "#F5F5F4",
  footerBorder:  "#E7E5E4",

  // Risk bar track
  riskTrack:     "#F0EFED",

  // Logo
  logoBg:        "#1C1917",
  logoText:      "#FFFFFF",
};

const darkTheme = {
  // Backgrounds
  pageBg:        "#010308",
  surface:       "#0D1117",
  surfaceRaised: "#0D1117",
  surfaceHover:  "#161B22",

  // Borders
  border:        "#21262D",
  borderSubtle:  "#161B22",
  borderHover:   "#30363D",

  // Text
  text1:         "#F0F6FC",
  text2:         "#8B949E",
  text3:         "#484F58",
  textPlaceholder:"#21262D",

  // Navbar
  navBg:         "rgba(1,3,8,0.85)",
  navBorder:     "#21262D",
  navBlur:       "blur(20px)",

  // Sidebar
  sidebarBg:     "#0D1117",
  sidebarBorder: "#21262D",
  sidebarIcon:   "#484F58",
  sidebarActive: "#1A1F2E",

  // KPI strip
  kpiBg:         "#0D1117",
  kpiBorder:     "#21262D",
  kpiDivider:    "#21262D",

  // Cards
  cardBg:        "#0D1117",
  cardBorder:    "#21262D",
  cardShadow:    "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
  cardShadowHover:"0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",

  // Timeline
  timelineRowHover: "#161B22",

  // Tool cards
  toolBg:        "#0D1117",
  toolBorder:    "#21262D",
  toolBgHover:   "#161B22",

  // Toggle button
  toggleBg:      "#21262D",
  toggleText:    "#F0F6FC",
  toggleBorder:  "#30363D",

  // Footer
  footerBg:      "#010308",
  footerBorder:  "#21262D",

  // Risk bar track
  riskTrack:     "#21262D",

  // Logo
  logoBg:        "#F0F6FC",
  logoText:      "#010308",
};
`;

content = content.replace(
    /export function RepositoryPage\(\) \{/,
    `${themeObjects}\nexport function RepositoryPage() {\n  const [isDark, setIsDark] = useState(false);\n  useEffect(() => {\n    const saved = localStorage.getItem('velocis-theme');\n    if (saved === 'dark') setIsDark(true);\n  }, []);\n\n  const toggleTheme = () => {\n    setIsDark(prev => {\n      localStorage.setItem('velocis-theme', !prev ? 'dark' : 'light');\n      return !prev;\n    });\n  };\n\n  const t = isDark ? darkTheme : lightTheme;\n`
);

// Toggle button in navbar
content = content.replace(
    /<div className="w-7 h-7 rounded-full text-\[#7C3AED\] flex items-center justify-center text-xs font-semibold" style=\{\{ background: '#7C3AED14' \}\}>\n\s*R\n\s*<\/div>/,
    `<motion.button\n                  onClick={toggleTheme}\n                  whileHover={{ scale: 1.05 }}\n                  whileTap={{ scale: 0.95 }}\n                  style={{\n                    display: "flex",\n                    alignItems: "center",\n                    gap: "6px",\n                    padding: "7px 14px",\n                    borderRadius: "8px",\n                    background: t.toggleBg,\n                    color: t.toggleText,\n                    border: \`1px solid \${t.toggleBorder}\`,\n                    fontSize: "12px",\n                    fontWeight: 600,\n                    fontFamily: "'Inter', sans-serif",\n                    cursor: "pointer",\n                    transition: "all 0.2s ease",\n                    outline: "none",\n                  }}\n                >\n                  {isDark\n                    ? <Sun size={14} strokeWidth={2} />\n                    : <Moon size={14} strokeWidth={2} />\n                  }\n                  {isDark ? "Light" : "Dark"}\n                </motion.button>\n                <div className="w-7 h-7 rounded-full text-[#7C3AED] flex items-center justify-center text-xs font-semibold" style={{ background: '#7C3AED14' }}>\n                  R\n                </div>`
);

// SVGs props pass through
content = content.replace(/<Card1Preview \/>/g, '<Card1Preview isDark={isDark} />');
content = content.replace(/<Card2Preview \/>/g, '<Card2Preview isDark={isDark} />');
content = content.replace(/<Card3Preview \/>/g, '<Card3Preview isDark={isDark} />');
content = content.replace(/<Card4Preview \/>/g, '<Card4Preview isDark={isDark} />');

content = content.replace(/const Card1Preview = \(\) => \{/, 'const Card1Preview = ({ isDark }: { isDark: boolean }) => {');
content = content.replace(/const Card2Preview = \(\) => \{/, 'const Card2Preview = ({ isDark }: { isDark: boolean }) => {');
content = content.replace(/const Card3Preview = \(\) => \{/, 'const Card3Preview = ({ isDark }: { isDark: boolean }) => {');
content = content.replace(/const Card4Preview = \(\) => \{/, 'const Card4Preview = ({ isDark }: { isDark: boolean }) => {');

// Graph colors
content = content.replace(
    /g stroke="#059669" strokeWidth="1" opacity="0\.2"/,
    `g stroke={isDark ? "rgba(5,150,105,0.25)" : "rgba(5,150,105,0.15)"} strokeWidth="1"`
);

content = content.replace(/fill="rgba\(0,0,0,0\.06\)"/g, `fill={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`);
content = content.replace(/fill="rgba\(0,0,0,0\.4\)"/g, `fill={isDark ? "#484F58" : "rgba(0,0,0,0.4)"}`);
// fix the PR and QA labels
content = content.replace(/fill="rgba\(0,0,0,0\.3\)"/g, `fill={isDark ? "#484F58" : "rgba(0,0,0,0.3)"}`);

// QA grid line
content = content.replace(/stroke="rgba\(0,0,0,0\.06\)"/g, `stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`);

content = content.replace(/fill="#141210"/g, `fill={isDark ? "#F0F6FC" : "#141210"}`);

// PAGE WRAPPER 
content = content.replace(
    /className="min-h-screen relative flex" style=\{\{ background: "#F7F6F3" \}\}/,
    `className="min-h-screen relative flex" style={{ backgroundColor: t.pageBg, transition: "background-color 0.3s ease, color 0.3s ease" }}`
);

// SIDEBAR 
content = content.replace(
    /className="fixed top-0 left-0 h-screen w-\[64px\] bg-white border-r border-\[#E8E8E4\] z-50 flex flex-col items-center py-6 hidden md:flex"/,
    `className="fixed top-0 left-0 h-screen w-[64px] z-50 flex flex-col items-center py-6 hidden md:flex" style={{ background: t.sidebarBg, borderColor: t.sidebarBorder, borderRightWidth: "1px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}`
);
content = content.replace(
    /className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold text-sm mb-8 cursor-pointer"/,
    `className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm mb-8 cursor-pointer" style={{ background: t.logoBg, color: t.logoText, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}`
);

// The sidebar Icons active state is not tracked natively via props, it uses hover but active is just hardcoded on Home in reality but the user says it's tracking. We will use t.sidebarIcon
content = content.replace(
    /<Home className="w-5 h-5 text-\[#737373\] transition-transform duration-200 group-hover:scale-\[1\.15\] group-hover:text-black" \/>/g,
    `<Home className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);
content = content.replace(
    /<Activity className="w-5 h-5 text-\[#737373\] transition-transform duration-200 group-hover:scale-\[1\.15\] group-hover:text-black" \/>/g,
    `<Activity className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);
content = content.replace(
    /<FileText className="w-5 h-5 text-\[#737373\] transition-transform duration-200 group-hover:scale-\[1\.15\] group-hover:text-black" \/>/g,
    `<FileText className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);
content = content.replace(
    /<Bot className="w-5 h-5 text-\[#737373\] transition-transform duration-200 group-hover:scale-\[1\.15\] group-hover:text-black" \/>/g,
    `<Bot className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);
content = content.replace(
    /<Mail className="w-5 h-5 text-\[#737373\] transition-transform duration-200 group-hover:scale-\[1\.15\] group-hover:text-black" \/>/g,
    `<Mail className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);
content = content.replace(
    /<Settings className="w-5 h-5 text-\[#737373\] transition-transform duration-200 group-hover:scale-\[1\.15\] group-hover:text-black" \/>/g,
    `<Settings className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);
// Make Folder active color: #6D28D9 via style
content = content.replace(
    /<Folder className="w-5 h-5 text-black transition-transform duration-200 group-hover:scale-\[1\.15\]" \/>/g,
    `<Folder className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: "#6D28D9" }} />`
);
// Sidebar active bar
content = content.replace(
    /<div className="absolute left-0 top-\[108px\] w-1 h-8 bg-black rounded-r-full" \/>/,
    `<div className="absolute left-0 top-[108px] w-1 h-8 rounded-r-full" style={{ background: "#6D28D9", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />`
);

// NAVBAR
content = content.replace(
    /className="sticky top-0 z-40 h-\[56px\] px-4 md:px-8 flex items-center justify-between"\s*style=\{\{(.*?)\}\}/s,
    `className="sticky top-0 z-40 h-[56px] px-4 md:px-8 flex items-center justify-between"
            style={{
              background: t.navBg,
              backdropFilter: t.navBlur,
              WebkitBackdropFilter: t.navBlur,
              borderBottom: \`1px solid \${t.navBorder}\`,
              transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease",
            }}`
);

content = content.replace(
    /className="text-\[#737373\] flex items-center gap-2"/g,
    `className="flex items-center gap-2" style={{ color: t.text2, transition: "color 0.25s ease" }}`
);

content = content.replace(
    /<span>\/<\/span>/g,
    `<span style={{ color: t.text3, transition: "color 0.25s ease" }}>/</span>`
);
content = content.replace(
    /<span className="text-\[#171717\] font-medium"([^>]*)>\{repo.name\}<\/span>/,
    `<span className="font-medium" style={{ color: t.text1, transition: "color 0.25s ease" }}>{repo.name}</span>`
);

// Mobile menu logo and hover in breadcrumb ... "hover:text-black" will be annoying without inline hover tracking. Give it a simple class reset or keep simple.
content = content.replace(
    /className="cursor-pointer hover:text-black transition-colors"([^>]*)>Dashboard<\/span>/,
    `className="cursor-pointer transition-colors hover:opacity-75" onClick={() => navigate('/dashboard')} style={{ color: t.text2 }}>Dashboard</span>`
);

content = content.replace(
    /<Bell className="w-4 h-4" \/>/,
    `<Bell className="w-4 h-4" style={{ color: t.text2 }} />`
);

// Github Pill
content = content.replace(
    /<div className="h-7 px-3 rounded-full flex items-center gap-1\.5 text-\[#059669\] border hidden sm:flex" style=\{\{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0\.02em" \}\} style=\{\{ background: '#05966914', borderColor: '#05966914' \}\}>/,
    `<div className="h-7 px-3 rounded-full flex items-center gap-1.5 border hidden sm:flex" style={{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em", background: isDark ? "#0D2818" : "#05966914", borderColor: isDark ? "#1A4731" : "#05966914", color: isDark ? "#3FB950" : "#059669", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);

// MAIN TITLE
content = content.replace(
    /color:\s*"#171717",\s*marginBottom:\s*"16px"/,
    `color: t.text1,
                  marginBottom: "16px", transition: "color 0.25s ease"`
);

// METADATA CHIPS
content = content.replace(
    /color:\s*"#737373"\s*\}\}>/g,
    `color: t.text2, transition: "color 0.25s ease" }}>`
);

content = content.replace(
    /className="px-3 py-1 rounded-full border border-\[#E8E8E4\] bg-white\/50" style=\{\{/g,
    `className="px-3 py-1 rounded-full border" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderColor: t.border, color: t.text2, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease", `
);

content = content.replace(
    /<span className="w-1 h-1 rounded-full bg-gray-300" \/>/g,
    `<span className="w-1 h-1 rounded-full" style={{ background: t.text3, transition: "background-color 0.25s ease" }} />`
);

// HEALTH BADGE
content = content.replace(
    /className="flex items-center gap-2 px-3\.5 py-1\.5 rounded-full border-\[1\.5px\] bg-white cursor-default"\s*style=\{\{ borderColor: repo\.statusColor, color: repo\.statusColor \}\}/,
    `className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-[1.5px] cursor-default"
                  style={{ background: repo.statusColor + (isDark ? "18" : "10"), borderColor: repo.statusColor + (isDark ? "35" : "30"), color: repo.statusColor, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}`
);


// KPI STRIP
content = content.replace(
    /className="flex flex-wrap lg:flex-nowrap mb-14 overflow-hidden relative"\s*style=\{\{(.*?)\}\}/s,
    `className="flex flex-wrap lg:flex-nowrap mb-14 overflow-hidden relative"
              style={{
                background: t.kpiBg,
                border: \`1px solid \${t.kpiBorder}\`,
                borderRadius: "18px",
                transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease"
              }}`
);
content = content.replace(
    /className="w-full sm:w-1\/2 lg:w-1\/4 px-6 pb-4 border-r border-\[#E5E5E5\] last:border-0 border-opacity-50"\s*style=\{\{(.*?)\}\}/sg,
    (match, p1) => {
        return `className="w-full sm:w-1/2 lg:w-1/4 px-6 pb-4 border-r last:border-r-0"
                style={{ ${p1}, borderColor: t.kpiDivider, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}`
    }
);
content = content.replace(
    /className="text-\[#171717\] mb-1/g,
    `className="mb-1`
);
content = content.replace(
    /style=\{\{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0\.5px" \}\}/g,
    `style={{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.5px", color: t.text1, transition: "color 0.25s ease" }}`
);


// Agent Command Center text
content = content.replace(
    /color:\s*"rgba\(0,0,0,0\.35\)",/g,
    `color: t.text3, transition: "color 0.25s ease",`
);

// AGENT CARDS 
content = content.replace(
    /const premiumCardStyle = \{\n    background: "#FFFFFF",\n    border: "1px solid rgba\(0,0,0,0\.07\)",\n    borderRadius: "20px",\n    boxShadow: `\n      0 1px 2px rgba\(0,0,0,0\.04\),\n      0 4px 8px rgba\(0,0,0,0\.03\),\n      0 12px 32px rgba\(0,0,0,0\.04\),\n      inset 0 1px 0 rgba\(255,255,255,1\)\n    `,\n    transition: "all 0\.3s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)"\n  \};/,
    `// Dynamic card styling logic directly inside the map since it depends on t`
);
content = content.replace(
    /const premiumCardHoverStyle = \{\n    y: -5,\n    boxShadow: `\n      0 2px 4px rgba\(0,0,0,0\.04\),\n      0 8px 24px rgba\(0,0,0,0\.08\),\n      0 24px 56px rgba\(0,0,0,0\.10\)\n    `\n  \};/,
    `// Dynamic hover computed later`
);

content = content.replace(
    /style=\{\{ \.\.\.premiumCardStyle, borderTopWidth: "4px", borderTopColor: card\.accentColor, overflow: "hidden" \}\}/,
    `style={{ background: t.cardBg, border: \`1px solid \${t.cardBorder}\`, boxShadow: t.cardShadow, borderRadius: "20px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", borderTopWidth: "4px", borderTopColor: card.accentColor, overflow: "hidden" }}`
);
content = content.replace(
    /whileHover=\{premiumCardHoverStyle\}/g,
    `whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }}`
);
content = content.replace(
    /<div className="w-full sm:w-\[45%\] p-7 flex flex-col justify-between z-10 bg-white">/,
    `<div className="w-full sm:w-[45%] p-7 flex flex-col justify-between z-10" style={{ background: t.cardBg, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);

// Update sectionTitles and card descriptions with theme variables
content = content.replace(
    /<h3 className="text-\[#171717\] mb-2"/g,
    `<h3 className="mb-2"`
);
content = content.replace(
    /const sectionTitleStyle = \{\n    fontFamily: "'Inter', sans-serif",\n    fontWeight: 600,\n    fontSize: "17px",\n    fontStyle: "normal",\n    letterSpacing: "-0\.3px",\n    lineHeight: 1\.3\n  \};/,
    `const sectionTitleStyle = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "17px",
    fontStyle: "normal",
    letterSpacing: "-0.3px",
    lineHeight: 1.3,
    color: t.text1, 
    transition: "color 0.25s ease"
  };`
);
content = content.replace(
    /<p className="text-\[#737373\] mb-6" style=\{\{/,
    `<p className="mb-6" style={{ color: t.text2, transition: "color 0.25s ease", `
);
content = content.replace(
    /style=\{\{ fontSize: "11px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px", color: "rgba\(0,0,0,0\.5\)" \}\}/,
    `style={{ fontSize: "11px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px", color: t.text3, transition: "color 0.25s ease" }}`
);

content = content.replace(
    /style=\{\{ backgroundColor: card\.accentBg, borderColor: card\.accentColor \+ '20' \}\}/,
    `style={{ backgroundColor: isDark ? card.accentColor + '1F' : card.accentBg, borderColor: card.accentColor + (isDark ? '20' : '20') }}`
);

// Preview area background
content = content.replace(
    /<div className="w-full sm:w-\[55%\] relative overflow-hidden bg-gray-50 border-l border-\[#E8E8E4\] group-hover:bg-gray-100 transition-colors">/,
    `<div className="w-full sm:w-[55%] relative overflow-hidden border-l" style={{ background: t.surfaceHover, borderColor: t.cardBorder, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);
content = content.replace(
    /style=\{\{ background: card\.accentBg \}\}/,
    `style={{ background: isDark ? card.accentColor + '1F' : card.accentBg, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}`
);

// Repostiory Activity Insights
content = content.replace(
    /<motion\.div variants=\{itemVariants\} style=\{premiumCardStyle\} whileHover=\{premiumCardHoverStyle\} className="p-7 flex flex-col h-full bg-white">/,
    `<motion.div variants={itemVariants} style={{ background: t.cardBg, border: \`1px solid \${t.cardBorder}\`, boxShadow: t.cardShadow, borderRadius: "20px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-7 flex flex-col h-full">`
);

// Risk Overview Insights
content = content.replace(
    /<motion\.div variants=\{itemVariants\} style=\{premiumCardStyle\} whileHover=\{premiumCardHoverStyle\} className="p-7 flex flex-col h-full bg-white">/g,
    `<motion.div variants={itemVariants} style={{ background: t.cardBg, border: \`1px solid \${t.cardBorder}\`, boxShadow: t.cardShadow, borderRadius: "20px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-7 flex flex-col h-full">`
);

content = content.replace(
    /<div className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">/,
    `<div className="w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-inner" style={{ background: t.cardBg, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);
content = content.replace(/<span className="text-xl font-bold text-\[#171717\] leading-none">/g, `<span className="text-xl font-bold leading-none" style={{ color: t.text1, transition: "color 0.25s ease" }}>`);
content = content.replace(/<span className="text-\[#737373\] uppercase mt-1"/g, `<span className="uppercase mt-1" style={{ color: t.text2, transition: "color 0.25s ease" }} `);

// Risk bars background track
content = content.replace(
    /<div className="w-full h-1\.5 rounded-full overflow-hidden flex bg-gray-100 mb-2">/,
    `<div className="w-full h-1.5 rounded-full overflow-hidden flex mb-2" style={{ background: t.riskTrack, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);

content = content.replace(
    /<span className="text-\[#737373\]" style=\{\{/g,
    `<span style={{ color: t.text2, transition: "color 0.25s ease", `
);
content = content.replace(/<div className="text-\[18px\] font-semibold text-\[#171717\]">/g, `<div className="text-[18px] font-semibold" style={{ color: t.text1, transition: "color 0.25s ease" }}>`);


// Timeline
content = content.replace(
    /<motion\.div variants=\{itemVariants\} style=\{premiumCardStyle\} whileHover=\{premiumCardHoverStyle\} className="p-8 mb-14 bg-white">/,
    `<motion.div variants={itemVariants} style={{ background: t.cardBg, border: \`1px solid \${t.cardBorder}\`, boxShadow: t.cardShadow, borderRadius: "20px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-8 mb-14">`
);

content = content.replace(
    /<div className="w-9 h-9 rounded-full bg-white border border-\[#E8E8E4\] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform relative z-10">/,
    `<div className="w-9 h-9 rounded-full border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform relative z-10" style={{ background: isDark ? item.color + '1F' : t.cardBg, borderColor: t.border, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);

content = content.replace(
    /background: "rgba\(0,0,0,0\.02\)"/,
    `background: t.timelineRowHover`
);

content = content.replace(
    /<span style=\{\{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0\.01em", background: "rgba\(0,0,0,0\.04\)", border: "1px solid rgba\(0,0,0,0\.07\)", borderRadius: "99px", padding: "2px 10px", color: "rgba\(0,0,0,0\.6\)" \}\}>/g,
    `<span style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.01em", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: \`1px solid \${t.border}\`, borderRadius: "99px", padding: "2px 10px", color: t.text3, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>`
);

content = content.replace(
    /<p className="text-\[#171717\] pl-1"/g,
    `<p className="pl-1"`
);
content = content.replace(
    /style=\{\{ fontSize: "13px", fontWeight: 400, fontStyle: "normal", lineHeight: 1\.5 \}\}/g,
    `style={{ fontSize: "13px", fontWeight: 400, fontStyle: "normal", lineHeight: 1.5, color: t.text1, transition: "color 0.25s ease" }}`
);

// Secondary Tool Cards
content = content.replace(
    /<motion\.div key=\{index\} style=\{premiumCardStyle\} whileHover=\{premiumCardHoverStyle\} className="p-5 flex items-center justify-between group cursor-pointer bg-white overflow-hidden relative">/g,
    `<motion.div key={index} style={{ background: t.toolBg, border: \`1px solid \${t.toolBorder}\`, boxShadow: t.cardShadow, borderRadius: "20px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover, background: t.toolBgHover }} className="p-5 flex items-center justify-between group cursor-pointer overflow-hidden relative">`
);

content = content.replace(
    /<div className="w-10 h-10 rounded-xl bg-\[#F7F6F3\] flex items-center justify-center border border-\[#E8E8E4\] group-hover:bg-white transition-colors">/g,
    `<div className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors" style={{ background: isDark ? "#161B22" : "#F5F5F4", borderColor: t.border }}>`
);

content = content.replace(
    /<tool\.icon className="w-5 h-5 text-\[#737373\] group-hover:text-black transition-colors" \/>/g,
    `<tool.icon className="w-5 h-5 transition-colors" style={{ color: t.text2 }} />`
);

content = content.replace(
    /<div className="text-\[#171717\] mb-0\.5"/g,
    `<div className="mb-0.5"`
);
content = content.replace(
    /style=\{\{ fontSize: "14px", fontWeight: 600, fontStyle: "normal", letterSpacing: "-0\.2px" \}\}/g,
    `style={{ fontSize: "14px", fontWeight: 600, fontStyle: "normal", letterSpacing: "-0.2px", color: t.text1, transition: "color 0.25s ease" }}`
);

content = content.replace(
    /color: "rgba\(0,0,0,0\.35\)" \}\}/g,
    `color: t.text3, transition: "color 0.25s ease" }}`
);

// FOOTER
content = content.replace(
    /className="mt-20 pt-8 border-t border-\[#E8E8E4\] flex flex-col md:flex-row items-center justify-between gap-4 text-\[#737373\]"/,
    `className="mt-20 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ background: t.footerBg, borderColor: t.footerBorder, color: t.text3, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease"`
);

fs.writeFileSync('c:/Users/ADMIN/Desktop/velocis/frontend/src/app/pages/RepositoryPage.tsx', content);
console.log('Theme toggle rewrite completed.');
