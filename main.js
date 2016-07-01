var q = require('q');
var request = require("request");

function ProxyChecker() {
    this.rules = [];
    this.checkPromises = [];
}

ProxyChecker.prototype.check = function(proxies, testUrl, callback) {
    var self = this;
    // Check one proxy
    self.checkProxy = function(proxy, testUrl, callback) {
        request({
            uri: testUrl,
            proxy: proxy,
            timeout: 15000
        }, function(error, response, body) {
            if (error) {
                callback(error);
            } else {
                if (undefined != this.rules) {
                    var promises = [];
                    self.rules.forEach(function(item) {
                        promises.push(q.Promise(function(resolve, reject) {
                            item(response, function(error) {
                                if (error != undefined) {
                                    reject(error);
                                } else {
                                    resolve();
                                }
                            });
                        }));
                    });
                    q.all(promises).then(function(result) {
                        callback(undefined, proxy);
                    }).catch(function(error) {
                        callback(error);
                    });

                } else if (200 == response.statusCode) {
                    callback(undefined, proxy);
                } else {
                    callback(new Error('HTTP ' + response.statusCode));
                }
            }
        });
    };
    // The list of check promises
    proxies.forEach(function(proxy) {
        self.checkPromises.push(q.Promise(function(resolve, reject) {
            self.checkProxy(proxy.address, testUrl, function(error, proxy) {
                if (undefined != error) {
                    reject(error);
                    return;
                }
                resolve(proxy);
            });
        }));
    });
    q.allSettled(self.checkPromises).then(function(checkedProxies) {
        for (var i = 0; i < checkedProxies.length; i++) {
            var checkedProxy = checkedProxies[i];
            proxies[i].alive = "fulfilled" == checkedProxy.state;
        }
        callback(null, proxies);
    });
};

ProxyChecker.prototype.addRule = function(rule) {
    if (typeof(rule) == "function") {
        this.rules.push(rule);
    } else {
        throw new Error('Rule must be a function');
    }
};

module.exports = ProxyChecker;