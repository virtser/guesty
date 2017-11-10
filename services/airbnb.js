const request = require('request-promise');
const AIRBNB_API_BASE_URL = 'https://api.airbnb.com/v2';
// API client id should not be commited, but loaded from process.env var.
// Libraries like 'dotenv' should be used to manage such secret app configuration.
const AIRBNB_API_CLIENT_ID = '3092nxybyb0otqw18e8nh5nty';
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

module.exports = {
  getListingsPage,
  getListingCalendar
}
