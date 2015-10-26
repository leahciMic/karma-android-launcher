var Promise = require('bluebird');
var debug = require('debug')('karma-android-launcher:debug');
var warn = require('debug')('karma-android-launcher:warn');
var verbose = require('debug')('karma-android-launcher:verbose');
var androidCtrl = require('androidctrl');
var os = require('os');
var persistRequest = require('persist-request')(os.tmpdir());
var fs = require('fs');
var tmp = require('tmp');
var path = require('path');
var preserve = require('promise-preserve');

var CHROME_APK_URL = 'http://mars.androidapksfree.com/files/pluto/com.android.chrome-v44.0.2403.128-240312811-x86-Android-5.0.apk';
var FIREFOX_APK_URL = 'https://ftp.mozilla.org/pub/mobile/releases/41.0.2/android-x86/en-US/fennec-41.0.2.en-US.android-i386.apk';

var AndroidBrowser = function(baseBrowserDecorator, script, args) {
  baseBrowserDecorator(this);

  var self = this;

  self.deviceId = undefined;
  self.name = script;

  self.removeListener('kill', self._events.kill);

  self.on('kill', function(done) {
    if (!self.deviceId) {
      warn('No device to kill');
      // no emulator to kill
      return;
    }

    debug('kill ' + self.deviceId);

    androidCtrl.stop(self.deviceId).then(function() {
      debug('killed ' + self.deviceId);
      self.deviceId = undefined;
      self._done();
      done();
    });
  });

  self._start = function(url) {
    var packageName = self.className.split('/')[0];
    var browser = packageName === 'com.android.chrome' ? 'chrome' : 'firefox';
    var apkURL = browser === 'chrome' ? CHROME_APK_URL : FIREFOX_APK_URL;
    var deviceStarted = androidCtrl.startOrCreate(
      'android-' + browser,
      {
        'hw.gpu.enabled': 'yes'
      }
    );

    var deviceId = deviceStarted.then(function(device) {
      return device.id;
    });

    return deviceId
      .then(function(deviceId) {
        self.deviceId = deviceId;
        return deviceId;
      })
      .then(preserve(androidCtrl, 'ensureReady'))
      .then(preserve(androidCtrl, 'powerOn'))
      .then(preserve(androidCtrl, 'unlock'))
      .then(preserve(function(deviceId) {
        return androidCtrl.isInstalled(deviceId, packageName)
          .then(function(isInstalled) {
            if (isInstalled) {
              debug('already installed');
              return;
            }

            return new Promise(function(resolve) {
              debug('getting ' + apkURL);
              var stream = persistRequest.get(apkURL);
              stream.on('cacheFile', function(filename) {
                resolve(filename);
              });
            }).then(androidCtrl.install.bind(androidCtrl, deviceId));
          });
      }))
      .then(function(deviceId) {
        return androidCtrl.adb(
          deviceId,
          'shell am start -a android.intent.action.VIEW -n ' + self.className + ' -d ' + url
        );
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
