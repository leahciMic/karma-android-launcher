var bluebird = require('bluebird');
var debug = require('debug')('karma-android-launcher:debug');
var warn = require('debug')('karma-android-launcher:warn');
var androidCtrl = require('androidctrl');
var thenerize = require('thenerize');

thenerize(androidCtrl);

var AndroidBrowser = function(baseBrowserDecorator, script, args) {
  baseBrowserDecorator(this);

  var self = this;

  self.deviceId = undefined;
  self.name = script;

  self._start = function(url) {
    var deviceStarted = androidCtrl.startOrCreate();
    var deviceId = deviceStarted.then(function(device) {
      return device.id;
    });
    return deviceId.then(function(deviceID) {
      self.deviceId = deviceID;
      return androidCtrl.ensureReady(deviceID)
        .then(androidCtrl.thenPowerOn(self.deviceId))
        .then(androidCtrl.thenUnlock(self.deviceId))
        .then(androidCtrl.thenAdb(
          self.deviceId,
          'shell am start -a android.intent.action.VIEW -n ' + self.className + ' -d ' + url
        ));
    });
  };
};

AndroidBrowser.$inject = ['baseBrowserDecorator', 'name', 'args'];

var AndroidChrome = function() {
  AndroidBrowser.apply(this, arguments);
};

AndroidChrome.prototype = {
  name: 'Chrome',
  className: 'com.android.chrome/com.google.android.apps.chrome.Main'
};

AndroidChrome.$inject = ['baseBrowserDecorator', 'name', 'args'];

var AndroidFirefox = function() {
  AndroidBrowser.apply(this, arguments);
};

AndroidFirefox.prototype = {
  name: 'Firefox',
  className: 'org.mozilla.firefox/.App'
};

AndroidFirefox.$inject = ['baseBrowserDecorator', 'name', 'args'];

module.exports = {
  'launcher:FirefoxAndroid': ['type', AndroidFirefox],
  'launcher:ChromeAndroid': ['type', AndroidChrome]
};
