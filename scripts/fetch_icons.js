const https = require('https');
const fs = require('fs');
const icons = ['awslambda', 'amazondynamodb', 'amazonapigateway', 'react', 'typescript', 'tailwindcss'];

let result = {};
let count = 0;

icons.forEach(icon => {
    https.get('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/' + icon + '.svg', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            result[icon] = data;
            count++;
            if (count === icons.length) {
                fs.writeFileSync('d:\\Code\\Velocis\\scripts\\icons.json', JSON.stringify(result, null, 2));
                console.log('done');
            }
        });
    });
});
