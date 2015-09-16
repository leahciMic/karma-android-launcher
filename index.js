var Promise = require('bluebird');
var debug = require('debug')('karma-android-launcher:debug');
var warn = require('debug')('karma-android-launcher:warn');
var androidCtrl = require('androidctrl');
var thenerize = require('thenerize');
var persistRequest = require('persist-request')(os.tmpdir());
var fs = require('fs');
var tmp = require('tmp');
var path = require('path');

var CHROME_APK_URL = 'http://mars.androidapksfree.com/files/pluto/com.android.chrome-v44.0.2403.128-240312811-x86-Android-5.0.apk';
var FIREFOX_APK_URL = 'https://ftp.mozilla.org/pub/mozilla.org/mobile/releases/latest/android-x86/en-US/fennec-40.0.en-US.android-i386.apk';

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
      var packageName = self.className.split('/')[0];
      var apkURL = (packageName === 'com.android.chrome' ?
        CHROME_APK_URL :
        FIREFOX_APK_URL
      );

      self.deviceId = deviceID;

      return androidCtrl.ensureReady(deviceID)
        .then(androidCtrl.thenPowerOn(deviceID))
        .then(androidCtrl.thenUnlock(deviceID))
        .then(androidCtrl.thenIsInstalled(packageName))
        .then(function(isInstalled) {
          if (isInstalled) {
            return;
          }

          return new Promise(function(resolve) {
            var stream = persistRequest(apkURL);
            stream.on('finish', function() {
              resolve(stream.filename);
            });
          }).then(androidCtrl.install);
        })
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
