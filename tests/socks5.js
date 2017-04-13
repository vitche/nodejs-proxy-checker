var checker = require('../main');
var proxies = [
];
module.exports.testOneSOCKS5HTTPS = function (test) {
    var proxy = proxies[0];
    var ruleChecker = new checker.RuleChecker();
    ruleChecker.addRule(checker.rules.SOCKS5HTTPS);
    ruleChecker.checkOne(proxy, 'https://ya.ru', function (error, proxy) {
        test.ok(undefined != error);
        test.done();
    });
};
module.exports.testOneSOCKS5HTTP = function (test) {
    var proxy = proxies[2];
    var ruleChecker = new checker.RuleChecker();
    ruleChecker.addRule(checker.rules.SOCKS5HTTP);
    ruleChecker.checkOne(proxy, 'http://ya.ru', function (error, proxy) {
        test.ok(undefined == error);
        test.done();
    });
};
module.exports.testListSOCKS5HTTPS = function (test) {
    var ruleChecker = new checker.RuleChecker();
    ruleChecker.addRule(checker.rules.SOCKS5HTTPS);
    ruleChecker.checkList(proxies, 'https://ya.ru', function (error, proxies) {
        test.ok(undefined == error);
        test.done();
    })
};