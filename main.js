var q = require('q');
var url = require('url');
function RuleChecker() {
    this.rules = [];
}
// Check one proxy
RuleChecker.prototype.checkOne = function (proxy, testUrl, callback) {
    var checkPromises = [];
    this.rules.forEach(function (rule) {
        checkPromises.push(q.Promise(function (resolve, reject) {
            rule({
                proxy: proxy,
                testUrl: testUrl
            }, function (error) {
                if (error != undefined) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        }));
    });
    q.all(checkPromises).then(function (result) {
        callback(undefined, proxy);
    }).catch(function (error) {
        callback(error);
    });
};
// Check an array of proxies
RuleChecker.prototype.checkList = function (proxies, testUrl, callback) {
    var self = this;
    var checkPromises = [];
    // The list of checkList promises
    proxies.forEach(function (proxy) {
        checkPromises.push(q.Promise(function (resolve, reject) {
            self.checkOne(proxy, testUrl, function (error, proxy) {
                if (undefined != error) {
                    reject(error);
                } else {
                    resolve(proxy);
                }
            });
        }));
    });
    // Start checking
    q.allSettled(checkPromises).then(function (checkedProxies) {
        for (var i = 0; i < checkedProxies.length; i++) {
            var checkedProxy = checkedProxies[i];
            proxies[i].valid = "fulfilled" == checkedProxy.state;
        }
        callback(null, proxies);
    });
};
RuleChecker.prototype.addRule = function (rule) {
    if (typeof(rule) == "function") {
        this.rules.push(rule);
    } else {
        throw new Error('Proxy checkList rule must be a function');
    }
};
var rules = {
    SOCKS5HTTPS: function (arguments, callback) {
        var parsedUrl = url.parse(arguments.testUrl);
        var request = require('socks5-https-client');
        var query = {
            hostname: parsedUrl.hostname,
            socksHost: arguments.proxy.ipv4,
            socksPort: arguments.proxy.port,
            // TODO: Think about whether it is bigger than necessary
            timeout: 15000
        };
        request.get(query, function (response) {
            var status = response.statusCode;
            if (200 == status || 302 == status) {
                callback(undefined, arguments.proxy);
            } else {
                callback(new Error('HTTP ' + response.statusCode), arguments.proxy);
            }
        }).on('error', function (error) {
            callback(error);
        });
    },
    SOCKS5HTTP: function (arguments, callback) {
        var parsedUrl = url.parse(arguments.testUrl);
        var request = require('socks5-http-client');
        var query = {
            hostname: parsedUrl.hostname,
            socksHost: arguments.proxy.ipv4,
            socksPort: arguments.proxy.port,
            // TODO: Think about whether it is bigger than necessary
            timeout: 15000
        };
        request.get(query, function (response) {
            var status = response.statusCode;
            if (200 == status || 302 == status) {
                callback(undefined, arguments.proxy);
            } else {
                callback(new Error('HTTP ' + response.statusCode), arguments.proxy);
            }
        }).on('error', function (error) {
            callback(error);
        });
    },
    REQUEST: function (arguments, callback) {
        // TODO: Check whether performance of this library is better than of the default HTTP / HTTPS library
        var request = require('request');
        var query = {
            uri: arguments.testUrl,
            proxy: arguments.proxy,
            // TODO: Think about whether it is bigger than necessary
            timeout: 15000
        };
        request(query, function (error, response, body) {
            if (error) {
                callback(error, proxy);
            } else if (200 == response.statusCode) {
                callback(undefined, proxy);
            } else {
                callback(new Error('HTTP ' + response.statusCode), proxy);
            }
        });
    }
};
module.exports.RuleChecker = RuleChecker;
module.exports.rules = rules;