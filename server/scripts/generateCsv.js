var csvWriter = require('csv-write-stream')
var fs = require('fs');
var app = require('../../server/server');
const async = require('async');

function generateCsv(modelName, absolutePath, callback) {
  var writer = csvWriter();
  writer.pipe(fs.createWriteStream(absolutePath));

  var Model = app.models[modelName];

  Model.count(function(err, total) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    //Params
    var limit = 10000;
    var skip = 0;
    var count = parseInt(total / limit) + 1;
    var counter = -1;

    async.whilst(function() {
      return counter < count;
    }, function(whilstCallback) {
      counter++;
      skip = limit * counter;

      Model.find({
        limit: limit,
        skip: skip
      }, function(err, links) {
        if (err) {
          return whilstCallback(err);
        }
        console.log("Printing links count", links.length);
        if (links.length == 0) {
          counter = count + 100;
        }
        async.eachSeries(links, function(link, acb) {
          writer.write({id: link.id, url: link.url});
          setTimeout(function() {
            return acb();
          }, 10);
        }, function() {
          return whilstCallback();
        });
      });

    }, function(err) {
      if (err) {
        console.log(err);
        return callback(err);
      }
      writer.end();
      return callback(null);
    })
  })

}

module.exports = generateCsv;
