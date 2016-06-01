var q = require('q');
var request = require("request");
module.exports = function (proxies, testUrl, callback) {
    var self = this;
    // Check one proxy
    self.checkProxy = function (proxy, testUrl, callback) {
        request({
            uri: testUrl,
            proxy: proxy,
            timeout: 15000
        }, function (error, response, body) {
            if (error) {
                callback(error);
            } else if (200 == response.statusCode) {
                callback(undefined, proxy);
            } else {
                callback(new Error('HTTP ' + response.statusCode));
            }
        });
    };
    // The list of check promises
    var checkPromises = [];
    proxies.forEach(function (proxy) {
        checkPromises.push(q.Promise(function (resolve, reject) {
            self.checkProxy(proxy.address, testUrl, function (error, proxy) {
                if (undefined != error) {
                    reject(error);
                    return;
                }
                resolve(proxy);
            });
        }));
    });
    q.allSettled(checkPromises).then(function (checkedProxies) {
        for (var i = 0; i < checkedProxies.length; i++) {
            var checkedProxy = checkedProxies[i];
            proxies[i].alive = "fulfilled" == checkedProxy.state;
        }
        callback(null, proxies);
    });
};
