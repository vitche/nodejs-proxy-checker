var q = require('q');
var httpAgent = require('socks5-http-client/lib/Agent');
var httpsAgent = require('socks5-https-client/lib/Agent');

// TODO: Check whether performance of this library is better than of the default HTTP / HTTPS library
// TODO: It is possible that the HTTP request must be a part of the validation rule. We may wish to check proxies not for HTTP resources.
var request = require("request");

function ProxyChecker() {
    this.rules = [];
    this.checkPromises = [];
}

ProxyChecker.prototype.check = function (proxies, testUrl, callback) {
    var self = this;
    self.checkPromises = [];
    // Check one proxy
    self.checkProxy = function (proxy, testUrl, callback) {
        var query = {
            uri: testUrl,
            // TODO: Think about whether it is bigger than necessary
            timeout: 15000
        };
        if (proxy instanceof Object && 3 == proxy.type) {

            // SOCKS proxy
            if (testUrl.lastIndexOf('https://', 0) === 0) {
                // HTTPS
                query.agentClass = httpsAgent;
            } else {
                // HTTP
                query.agentClass = httpAgent;
            }

            query.agentOptions = {
                socksHost: proxy.ipv4,
                socksPort: proxy.port
            };
        } else if (proxy instanceof String) {
            // Proxy can be just a string address of a proxy
            query.proxy = proxy;
        }
        // TODO: Making an HTTP request all together looks more like a rule and not like a common algorithm.
        request(query, function (error, response, body) {
            if (error) {
                callback(error);
            } else {
                if (0 < self.rules.length) {
                    var promises = [];
                    self.rules.forEach(function (item) {
                        promises.push(q.Promise(function (resolve, reject) {
                            item(response, function (error) {
                                if (error != undefined) {
                                    reject(error);
                                } else {
                                    resolve();
                                }
                            });
                        }));
                    });
                    q.all(promises).then(function (result) {
                        callback(undefined, proxy);
                    }).catch(function (error) {
                        callback(error);
                    });
                } else if (200 == response.statusCode) {
                    // TODO: This rule should not be applied from here. It must be initially added to the list of rules during initialization.
                    callback(undefined, proxy);
                } else {
                    callback(new Error('HTTP ' + response.statusCode));
                }
            }
        });
    };
    // The list of check promises
    proxies.forEach(function (proxy) {
        self.checkPromises.push(q.Promise(function (resolve, reject) {
            self.checkProxy(proxy, testUrl, function (error, proxy) {
                if (undefined != error) {
                    reject(error);
                    return;
                }
                resolve(proxy);
            });
        }));
    });
    q.allSettled(self.checkPromises).then(function (checkedProxies) {
        for (var i = 0; i < checkedProxies.length; i++) {
            var checkedProxy = checkedProxies[i];
            proxies[i].valid = "fulfilled" == checkedProxy.state;
        }
        callback(null, proxies);
    });
};

ProxyChecker.prototype.addRule = function (rule) {
    if (typeof(rule) == "function") {
        this.rules.push(rule);
    } else {
        throw new Error('Proxy check rule must be a function');
    }
};

module.exports = ProxyChecker;
