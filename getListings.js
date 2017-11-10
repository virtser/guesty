const airbnb = require('./services/airbnb');
const fs = require('fs');
const moment = require('moment');

const AIRBNB_API_MAX_ITEMS = 50;
const AIRBNB_API_MAX_LISTINGS = 1000;
const AIRBNB_API_DATE_FORMAT = 'YYYY-MM-DD';

function clalculateListingScore(rating, bookings) {
  /**
   * Listing rating is based on:
   * 20% - listing rating
   * 80% - number of future bookings
   */
  const MAX_RATING = 5;
  const MAX_DAYS = 366;

  return (0.2 * rating / MAX_RATING) +(0.8 * bookings / MAX_DAYS);
}

function writeDataToFile(data) {
  const lisingsData = require('./data/listingsData.json') || [];
  lisingsData.push(data);

  fs.writeFile(__dirname + '/data/listingsData.json', JSON.stringify(lisingsData), (err) => {
    if (err) {
      console.error('writeDataToFile', err);
      throw err;
    }
  });
}

function delayPromise(duration) {
  return function(...args){
    return new Promise(function(resolve, reject){
      setTimeout(function(){
        resolve(...args);
      }, duration)
    });
  };
}

async function getAllAndWrite(propertyType, offset) {
  const LOCATION = 'Manhattan'; // Fixed to specific city.
  const START_DATE = moment().format(AIRBNB_API_DATE_FORMAT);
  const END_DATE = moment().add(1, 'years').format(AIRBNB_API_DATE_FORMAT);

  return airbnb.getListingsPage(LOCATION, propertyType, AIRBNB_API_MAX_ITEMS, offset)
  .then(delayPromise(5000))
  .then(listingsData => {
    listingsData.listings.forEach(listing => {
      return airbnb.getListingCalendar(listing.listingId, START_DATE, END_DATE)
      .then(delayPromise(5000))
      .then(bookings => {
        writeDataToFile({
          latitude: listing.latitude,
          longitude: listing.longitude,
          score: clalculateListingScore(listing.rating, bookings)
        });
      })
    });
    return listingsData.pagination;
  })
  .catch(err => console.error('getAllAndWrite', err));
}

async function main() {
  const PROPERTY_TYPES = ['Apartment', 'Hostel', 'Bed & Breakfast', 'Other'];

  for(let i=0 ; i < PROPERTY_TYPES.length ; i++) {
    let pagination = { next_offset: 0, result_count: AIRBNB_API_MAX_ITEMS };

    while(pagination.result_count === AIRBNB_API_MAX_ITEMS && pagination.next_offset < AIRBNB_API_MAX_LISTINGS) {
      pagination = await getAllAndWrite(PROPERTY_TYPES[i], pagination.next_offset);
      console.log(`Property type: ${PROPERTY_TYPES[i]}, number of results: ${pagination.result_count}, next page offset: ${pagination.next_offset}`);
    }
  }
}

main();
