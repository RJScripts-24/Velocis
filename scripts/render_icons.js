const fs = require('fs');

const svgs = {};
const files = fs.readdirSync('d:\\Code\\Velocis\\scripts');
files.forEach(f => {
    if (f.endsWith('.svg')) {
        svgs[f.replace('.svg', '')] = fs.readFileSync('d:\\Code\\Velocis\\scripts\\' + f, 'utf8');
    }
});

let out = `const logos = [\n`;
const displayNames = {
    'amazonwebservices': 'AWS',
    'amazondynamodb': 'DynamoDB',
    'amazonapigateway': 'API Gateway',
    'react': 'React',
    'typescript': 'TypeScript',
    'tailwindcss': 'Tailwind CSS',
    'nodedotjs': 'Node.js',
    'docker': 'Docker'
};

for (const [key, svg] of Object.entries(svgs)) {
    // Extract the <path> and <svg viewBox> etc
    let pathObj = svg.match(/<path([^>]+)\/>/);
    if (!pathObj) {
        pathObj = svg.match(/<path([\s\S]+?)<\/path>/);
    }
    let p = pathObj ? pathObj[0].replace(/xmlns=".*?"/g, '') : '';
    // Just inject the raw path
    const icon = `<svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-400 hover:text-gray-900 transition-colors mr-3">${p}</svg>`;
    const name = displayNames[key] || key;

    out += `    { name: '${name}', svg: (<div className="flex items-center mx-6">${icon}<span className="font-sans text-xl font-bold text-gray-400 hover:text-gray-900 transition-colors">${name}</span></div>) },\n`;
}
out += `];\n`;

fs.writeFileSync('d:\\Code\\Velocis\\scripts\\react_code.txt', out);
console.log('done');
