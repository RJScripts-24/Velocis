const https = require('https');
const fs = require('fs');
const icons = ['amazonwebservices', 'react', 'typescript', 'tailwindcss', 'amazondynamodb', 'amazonapigateway', 'nodedotjs', 'docker'];

let result = {};
let count = 0;

icons.forEach(icon => {
    https.get('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/' + icon + '.svg', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            result[icon] = { status: res.statusCode, data: data.substring(0, 150) + "..." };
            if (res.statusCode === 200) {
                fs.writeFileSync('d:\\Code\\Velocis\\scripts\\' + icon + '.svg', data);
            }
            count++;
            if (count === icons.length) {
                console.log(JSON.stringify(result, null, 2));
            }
        });
    });
});
