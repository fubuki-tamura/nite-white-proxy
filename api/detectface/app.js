var restify = require('restify');
var fs = require('fs');
var rest = require('restler');

var host = 'http://rekognition.com/func/api/';
var path = '/fc/faces/detect.json';
var apiKey = '4Aq04rNPc9ab4N6H';
var apiSecret = '9o8vaNRHNIRq4v7W';

var server = restify.createServer({
  name: 'detectface-proxy',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.pre(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, Authorization, X-Requested-With, X-File-Name, Content-Type, Cache-Control');
  res.header('Cache-Control', 'no-cache');

  if ('OPTIONS' == req.method) {
    res.send(203, 'OK');
  }
  next();
});

server.get('/', function(req, res, next) {
  res.send({
    name: server.name,
    versions: server.versions
  });

  return next();
});

// Rekognition からのリクエスト用に、/tmp 以下の静的ファイルをサーブする
server.get(/\/tmp\/?.*/, function(req, res, next) {
  var filename = req.url.split('/')[2];
  var image = fs.readFileSync(__dirname + '/tmp/' + filename);

  res.writeHead(200, { 'Content-Type': 'image/' + filename.split('.')[1] } );
  res.end(image, 'binary');

  return next();
});

server.post('/api/detectface', function(req, res, next) {
  // Base64 文字列からバッファを生成する
  var base64String = req.params.base64String;
  var buf = new Buffer(base64String, 'base64');

  // 任意の名前でファイルを作成する
  var filename = Date.now() + '.' + req.params.format;
  var filePath = __dirname + '/tmp/' + filename;

  fs.writeFile(filePath, buf, function() {
    // 指定形式で URL を生成し、Rekognition API へ GET リクエストを送信する
    var url = host + '?api_key=' + encodeURIComponent(apiKey) + '&api_secret=' + encodeURIComponent(apiSecret);
    url += '&jobs=face_part_detail&urls=' + encodeURIComponent('http://' + req.headers.host + '/tmp/' + filename);

    rest.get(url).on('complete', function(data) {
      // 一時ファイルを削除する
      fs.unlink(filePath, function(err) {
        console.log('successfully deleted');
      });

      // API からのレスポンスを、そのままクライアントへレスポンスする     
      res.send(data);

      return next();
    });
  });
});

server.listen(process.env.PORT || 8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});