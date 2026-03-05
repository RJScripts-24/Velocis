const https = require('https');
https.get('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/amazonaws.svg', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
