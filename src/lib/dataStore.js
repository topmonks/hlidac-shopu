var dateFormat = require('dateformat');

var dataStore = {
  getAlzaData: function(id) {
    var data = this.fakeData();
    var promise = new Promise(function(resolve, reject) {
      resolve(data);
    });

    return promise;
  },

  getMallData: function(id) {
    var data = this.fakeData();
    var promise = new Promise(function(resolve, reject) {
      resolve(data);
    });

    return promise;
  },

  getCzcData: function(id) {
    var data = this.fakeData();
    var promise = new Promise(function(resolve, reject) {
      resolve(data);
    });

    return promise;
  },

  fakeData: function() {
    var ary = [
      {
        "date": "2018-05-07T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-08T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-09T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-10T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-11T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-12T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-13T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-14T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-15T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-16T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-17T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-18T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-19T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-20T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-21T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-22T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-23T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-24T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-25T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-26T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-27T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-28T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-29T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-30T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-05-31T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-01T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-02T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-03T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-04T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-05T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-06T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-07T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-08T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-09T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-10T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-11T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-12T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-13T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-14T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-15T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-16T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-17T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-18T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-19T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-20T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-21T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-22T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-23T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-24T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-25T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-26T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-27T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-28T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-29T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-06-30T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-01T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-02T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-03T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-04T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-05T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-06T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-07T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-08T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-09T00:00:00+00:00",
        "currentPrice": 5990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-10T00:00:00+00:00",
        "currentPrice": 6990,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-11T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-07-12T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-10-31T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-01T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-02T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-03T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-04T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-05T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-06T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-07T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-08T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-09T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-10T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-11T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-12T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-13T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-14T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-15T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-16T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-17T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-18T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-19T00:00:00+00:00",
        "currentPrice": 7490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-20T00:00:00+00:00",
        "currentPrice": 6490,
        "originalPrice": 8990
      },
      {
        "date": "2018-11-21T00:00:00+00:00",
        "currentPrice": 6490,
        "originalPrice": 8990
      }
    ]

    ary.sort(function(a, b) {
      var aDate = Date.parse(a['date']);
      var bDate = Date.parse(b['date']);

      if (aDate > bDate) {
        return 1;
      } else {
        return -1;
      }
    });

    var dates = ary.map(row => dateFormat(new Date(row['date']), "yyyy-mm-dd"));
    var currentPrices = ary.map(row => row['currentPrice']);
    var originalPrices = ary.map(row => row['originalPrice']);

    return [dates, originalPrices, currentPrices];
  }
}

export default dataStore;
