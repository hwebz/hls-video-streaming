const fs = require('fs');
const express = require('express')
const uuid = require('uuid');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const http = require('http');
const ffmpeg = require('fluent-ffmpeg');

const app = express()

ffmpeg.setFfmpegPath(ffmpegPath);
 
function callback(e, path) { 
    const pathArray = path.split('/')
    const fileName = pathArray[1].split('.')
    readWriteAsync(path, 'txt', function() {
        const files = fs.readdirSync(pathArray[0]).filter(fn => fn.startsWith(fileName[0]) && fn.endsWith('.ts'));

        files.forEach(f => {
            fs.renameSync(pathArray[0] + '/' + f, pathArray[0] + '/' + f.replace('.ts', '.txt'))
        })
        console.log('replace all .ts to .txt');
    })
 }

 function readWriteAsync(path, newExtension, cb) {
    fs.readFile(path, 'utf-8', function(err, data){
      if (err) throw err;
  
      var newValue = data.replace(/\.ts/gim, '.' + newExtension);
  
      fs.writeFile(path, newValue, 'utf-8', cb);
    });
  }

  app.use('/streams', express.static('streams'))


  app.get('/', function(req, res) {
    fs.readFile('index.html',function (err, data){
        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
        res.write(data);
        res.end();
    });
  })

  app.get('/encode-video', function(req, res) {
    const path = 'streams/' + uuid() + '.m3u8';

    ffmpeg('videos/demo.mp4', { timeout: 432000 }).addOptions([
        '-profile:v baseline', // baseline profile (level 3.0) for H264 video codec
        '-level 3.0', 
        '-s 640x360',          // 640px width, 360px height output video dimensions
        '-start_number 0',     // start the first .ts segment at index 0
        '-hls_time 10',        // 10 second segment duration
        '-hls_list_size 0',    // Maxmimum number of playlist entries (0 means all entries/infinite)
        '-f hls'               // HLS format
        ]).output(path).on('end', function(e) {
        callback(e, path)
        }).run()

    res.send('done');
  })

  app.get('/get-video/:video_id', function(req, res) {
      console.log(req)
    var filePath = 'streams/' + req.params.video_id;
    var stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  })


app.listen(8000)