var app = require('../../server/server');

var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
const generateCsvFunc = require('./generateCsv');

var Link = app.models.link;

var urlPoolIndex = 0;
var requestActive = 0;

var csvFileInProgress = false;

//Main function which performs crawling
function crawl(url, callback) {
  requestActive++;
  console.info("Scraping url :::::::::", url, ":::::::::::: by skipping :::::::", urlPoolIndex - 1);
  request(url, function(err, response, body) {
    requestActive--;
    console.info("")
    if (err) {
      console.log(err);
      return callback(err);
    }
    if (urlPoolIndex != 1) {
      //Next url is triggered as soon as current is finished in order to maintain concurrency of 5
      scrapeRecursive();
    }
    console.log("Creating dom object...");
    var $ = cheerio.load(body);
    var links = $('a');
    async.each(links, function(link, acb) {
      var linkUrl = (link.attribs && link.attribs.href) ? getAbsolutePath(link.attribs.href) : "";
      //Scrapping is done only of medium.com bound urls ignoring external links
      if (linkUrl && linkUrl.match(/medium.com/gi)) {
        Link.create({
          url: linkUrl
        }, function(err, createdLink) {
          if (err) {
            console.log(err.message);
            return acb();
          }
          return acb();
        });
      } else {
        console.log("Incomplete Link dom data.");
        return acb();
      }
    }, function() {
      return callback();
    });
  });
}

function scrapeRecursive() {
  Link.findOne({
    order: "id asc",
    skip: urlPoolIndex,
    where: {}
  }, function(err, link) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    if (!link) {
      //Data is skipped in excess
      console.log("Scrapping done.");
      return generateCsv();
    }
    if (requestActive >= 5) {
      return;
    }
    urlPoolIndex++;
    crawl(link.url, crawlCallback);
  });
}

function crawlCallback(err) {
  console.info("No of requestActive ************************************************************************************************* ", requestActive);
  if (err) {
    return scrapeRecursive();
  }
  if (urlPoolIndex == 1) {
    //Creating concurrency of 5 for after !st url scrapping is done.;
    async.whilst(function() {
      return requestActive <= 5;
    }, function(aCallback) {
      scrapeRecursive();
    }, function() {
      console.log("Concurrency maintained");
    });
  } else {
    scrapeRecursive();
  }
}

function getAbsolutePath(link) {
  //remove query params and hash urls
  link = link.split('?')[0];
  link = link.split('#')[0];
  return link;
}

function generateCsv() {
  //In order to avoid multiple hits
  if (csvFileInProgress) {
    return;
  }
  csvFileInProgress = true;
  //generalized function to generate csv from models by streaming
  generateCsvFunc('Link', 'server/resources/out.csv', function(err) {
    if (err) {
      console.log(err);
    }
    console.log("Generating csv");
    process.exit(0);
  });
}

//Boot Function
(function() {
  //Model is destroyed everytime the function is triggered. This is done for testing purposes.
  Link.destroyAll({}, function(err, info) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log("XXXXXXXXXXXXXXXXXXXXXXXXX Destroyed Model XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX ", info.count);
    //Parent url is created in database.
    Link.create({
      url: "https://medium.com/"
    }, function(err, createdLink) {
      if (err) {
        console.log(err);
        process.exit(1);
      }
      console.log("Boot model created.");
      scrapeRecursive();
    });
  });
})();
