var request = require('request')
var stream  = require('stream')
var fs      = require('fs')

FacePP.RE_TRIM = /^\/+|\/+$/g;

function FacePP(apiKey, apiSecret, options) {
    var defaults, k, queue, requestCapacity, scheduleRequest,
        _this      = this;
    this.apiKey    = apiKey;
    this.apiSecret = apiSecret;
    if (options == null) {
        options = {};
    }
    this.sessionCheck = this.sessionCheck.bind(this);
    defaults          = {
        apiURL:          'https://apicn.faceplusplus.com/v2',
        sessionInterval: 500,
        requestTimeout:  10 * 1000,
        ajaxAdapter:     'node',
        concurrency:     2
    };
    for (k in defaults) {
        if (options[k] == null) {
            options[k] = defaults[k];
        }
    }
    this.apiURL = options.apiURL.replace(FacePP.RE_TRIM, '');
    this.sessionInterval = options.sessionInterval, this.requestTimeout = options.requestTimeout;
    this.requestAdapter = FacePP.adapter[options.ajaxAdapter];
    if ((requestCapacity = options.concurrency) > 0) {
        queue           = [];
        scheduleRequest = function () {
            var apiMethod, callback, data, _ref;
            if (requestCapacity > 0 && queue.length > 0) {
                --requestCapacity;
                _ref = queue.shift(), apiMethod = _ref[0], data = _ref[1], callback = _ref[2];
                FacePP.prototype.request.call(_this, apiMethod, data, function (err, resp) {
                    ++requestCapacity;
                    setTimeout(scheduleRequest, 0);
                    callback(err, resp);
                });
            }
        };
        this.request    = function (apiMethod, data, callback) {
            queue.push([apiMethod, data, callback]);
            scheduleRequest();
        };
    }
}

FacePP.prototype.request = function (apiMethod, data, callback) {
    var url;
    data['api_key']    = this.apiKey;
    data['api_secret'] = this.apiSecret;
    url                = this.apiURL + '/' + (apiMethod.replace(FacePP.RE_TRIM, ''));
    this.requestAdapter(url, data, {
        timeout: this.requestTimeout
    }, callback);
};

FacePP.prototype.sessionCheck = function (session_id, callback) {
    var _this = this;
    this.request('info/get_session', {
        session_id: session_id
    }, function (err, result) {
        if (err) {
            callback(err, result);
        } else if (result.status === 'FAILED') {
            callback(result.result.error_code || -1, result.result);
        } else if (result.status === 'INQUEUE') {
            setTimeout(_this.sessionCheck, _this.sessionInterval, session_id, callback);
        } else {
            callback(null, result.result);
        }
    });
};

FacePP.prototype.requestAsync = function (apiMethod, data, callback) {
    var _this     = this;
    data['async'] = 'true';
    this.request(apiMethod, data, function (err, result) {
        if (err) {
            callback(err, result);
        } else {
            setTimeout(_this.sessionCheck, _this.sessionInterval, result.session_id, callback);
        }
    });
};

FacePP.adapter = {
    /**
     * apiURL: 'https://apicn.faceplusplus.com/v2',
     * sessionInterval: 500,
     * requestTimeout: 10 * 1000,
     * ajaxAdapter: 'FormData' in window ? 'XMLHttpRequest' : 'jQuery',
     * concurrency: 2
     */
    node: function (url, data, options, callback) {
        var opts = {
            method:  'POST',
            uri:     url,
            timeout: options.timeout,
        };

        (function (callback) {
            if ('img' in data) {
                if (data.img instanceof stream.Readable) {
                    return callback(null, opts.formData = data)
                }
                // else if (data.img instanceof Buffer) {
                //     return callback(null, opts.formData = data)
                // }
                else if (typeof data.img == 'string') {
                    return fs.stat(data.img, function (err) {
                        if (err) return callback(err)//(new Error('[ERROR] img file not exists.'))
                        data.img = fs.createReadStream(data.img)
                        callback(null, opts.formData = data)
                    })
                }
                else return callback(new Error('[ERROR] img value is not supported.'))
            }
            callback(null, opts.form = data);
        })(function (err) {
            if (err) return callback(err)

            request(opts, function (err, res, body) {
                var response;
                if (response = body) {
                    try {
                        response = JSON.parse(response)
                    } catch (e) {
                    }
                }
                if (err) {
                    return callback(err.code || err)
                }
                else if (res.statusCode == 200) {
                    return callback(null, response)
                }
                else {
                    return callback(response.error_code || -1, response)
                }
            })
        });
    }
};

module.exports = FacePP