# My Application

The project is generated by [LoopBack](http://loopback.io).

 - scrapper.js recursively scrapes urls
 - Urls are stored in `Link` collection, uniquenexx is applied on url to avoid duplicacy while inserting links
 - cheerio is used for dom window generation
 - Concurrency limit of 5 is maintained after 1st url Scrapping
 - Csv output is generated by batchwise processing of `Link` model data through streaming 
