const request = require('request-promise');
const fs = require('fs');
const moment = require('moment');

const AIRBNB_API_BASE_URL = 'https://api.airbnb.com/v2';
// API client id should not be commited, but loaded from process.env var.
// Libraries like 'dotenv' should be used to manage such secret app configuration.
const AIRBNB_API_CLIENT_ID = '3092nxybyb0otqw18e8nh5nty';
const AIRBNB_API_MAX_LIMIT = 50;
const AIRBNB_API_DATE_FORMAT = 'YYYY-MM-DD';

const requestOptions = {
  qs: {
    client_id: AIRBNB_API_CLIENT_ID
  },
  json: true
};

// Make API call to get listings page.
function getListingsPage(location, propertyType, limit, offset) {
  let options = Object.assign({}, requestOptions); // Clone object.
  options.qs.location = location;
  options.qs.property_type = propertyType;
  options.qs._limit = limit;
  options.qs._offset = offset; // Set the new offset.

  return request(`${AIRBNB_API_BASE_URL}/search_results`, options)
  .then(function (results) {
      let page = { listings: [], pagination: results.metadata.pagination };
      results.search_results.map(item => {
        page.listings.push({
          listingId: item.listing.id,
          latitude: item.listing.lat,
          longitude: item.listing.lng,
          rating: item.listing.star_rating || 0
        });
      });
      console.log(`Got number of listing results: ${page.listings.length}, Next page offset: ${page.pagination.next_offset}`);
      return page;
  })
  .catch(err => {
    console.error('getListingsPage', err);
    return null;
  });
}

// Make API call to get listing calendar.
function getListingCalendar(listingId, startDate, endDate) {
  let options = Object.assign({}, requestOptions); // Clone object.
  options.qs.listing_id = listingId;
  options.qs.start_date = startDate
  // Looking for calendar events in the range of 1 year from now.
  options.qs.end_date = endDate;

  return request(`${AIRBNB_API_BASE_URL}/calendar_days`, options)
  .then(function (results) {
    let bookings = 0;
    results.calendar_days.map(item => {
      if (!item.available) bookings++ ;
    })
    return bookings;
  })
  .catch(err => {
    console.error('getListingCalendar', err);
    return 0;
  });
}

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
  fs.appendFile('listingsData.json', JSON.stringify(data) + ',', (err) => {
    if (err) {
      console.error('writeDataToFile', err);
      throw err;
    }
  });
}

async function getAllAndWrite(offset) {
  const LOCATION = 'New-York'; // Fixed to specific city.
  const PROPERTY_TYPE = 'Apartment'; // Fixed to return apartments only.
  const START_DATE = moment().format(AIRBNB_API_DATE_FORMAT);
  const END_DATE = moment().add(1, 'years').format(AIRBNB_API_DATE_FORMAT);

  return getListingsPage(LOCATION, PROPERTY_TYPE, AIRBNB_API_MAX_LIMIT, offset)
  .then(listingsData => {
    listingsData.listings.forEach(listing => {
      getListingCalendar(listing.listingId, START_DATE, END_DATE)
      .then(bookings => {
        writeDataToFile({
          lat: listing.latitude,
          lng: listing.longitude,
          score: clalculateListingScore(listing.rating, bookings)
        });
      })
    });
    return listingsData.pagination;
  })
  .catch(err => console.error('getAllAndWrite', err));
}

async function main() {
  let pagination = { next_offset: 0, result_count: 50 };

  while(pagination && pagination.result_count === AIRBNB_API_MAX_LIMIT) {
    pagination = await getAllAndWrite(pagination.next_offset);
  }
}

main();
