var SERVER_PORT = 1337;
var FILE_DEFAULT = '/index.html';

var http = require('http'),
    URL  = require('url'),
    path = require('path'),
    fs = require('fs');

var mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    js: 'application/javascript'
};

var server = http.createServer(checkRequest);
server.listen(SERVER_PORT, function(){
    console.log('server is running...');
    console.log('http://localhost:' + SERVER_PORT);
});

function checkRequest(req, res) {
    var uri = URL.parse(req.url, true);
    var pathname = uri.pathname;
    if ( pathname == '/' ) pathname = FILE_DEFAULT;
    console.log(pathname);

    var filename = path.join(__dirname, pathname);
    if ( !fs.existsSync(filename) ) {
        res.writeHead(404, {'Content-Type':'text/html'});
        res.end('404 file not found');
        return;
    }

    var stat = fs.statSync(filename);
    if( stat && stat.isDirectory() ) {
        res.writeHead(403, {'Content-Type':'text/html'});
        res.end('403');
        return;
    }

    var filePath = '.' + req.url;
    if (filePath == './')
        filePath = './index.html';

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./404.html', function(error, content) {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                });
            }
            else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                res.end(); 
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });


    // res.writeHead(200, {'Content-Type':'text/html'});
    // res.end(fs.readFileSync(filename, 'utf-8'));
}