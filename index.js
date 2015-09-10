var spawn = require('child_process').spawn;
var bluebird = require('bluebird');
var split = require('split');
var debug = require('debug')('karma-android-launcher:debug');
var warn = require('debug')('karma-android-launcher:warn');

var ezspawn = function(cmd, waitForProcess) {
  debug('Execute: ' + cmd);
  if (typeof waitForProcess === 'undefined') {
    waitForProcess = true;
  }

  var args = cmd.split(' ');
  var exe = args.shift();

  var proc = spawn(exe, args);

  if (waitForProcess) {
    debug('Waiting for ' + cmd + ' to finish');
    var stdoutBuffer = '';
    var stderrBuffer = '';

    proc.stdout.on('data', function(data) {
      debug('stdout: ' + data);
      stdoutBuffer += data;
    });

    proc.stderr.on('data', function(data) {
      warn('stderr: ' + data);
      stderrBuffer += data;
    });

    return new bluebird.Promise(function(resolve, reject) {
      proc.on('close', function(exitCode) {
        debug(cmd + ' completed with exit code: ' + exitCode);
        var result = {
          code: exitCode,
          stdout: stdoutBuffer,
          stderr: stderrBuffer
        };

        if (exitCode === 0) {
          return resolve(result);
        }

        return reject(result);
      });
    });
  }

  return new bluebird.resolve(proc);
};

var spawnAndWaitFor = function(cmd, regex) {
  debug('launching ' + cmd + ' and waiting for output that matches ' + regex);
  return ezspawn(cmd, false)
    .then(function(proc) {
      return new bluebird.Promise(function(resolve, reject) {
        proc.stdout.pipe(split())
          .on('data', function(data) {
            if (data.match(regex)) {
              resolve();
            }
          });
      });
    });
};

var AndroidBrowser = function(baseBrowserDecorator, script, args) {
  baseBrowserDecorator(this);

  var self = this;

  if (args.shutdownEmulator === undefined) {
    args.shutdownEmulator = true;
  }

  if (!args.shutdownEmulator) {
    console.log('DO NOT KILL EMULATOR');
    // do not shutdown the emulator when finished
    // handy if you're running more than one browser or test and do not wish
    // to wait for the emulator to bootup each time
    var killingPromise;
    console.log(self.kill.toString());
    console.log(self.forceKill.toString());
    console.log(self);

    self.kill = function() {
      if (killingPromise) {
        return killingPromise;
      }

      killingPromise = bluebird.resolve().then(function() {
        self.state = self.FINISHED;
      });

      self.state = self.BEING_KILLED;
      return killingPromise;
    };

    self.forceKill = function() {
      self.kill();
      self.state = self.BEING_FORCE_KILLED;
      return killingPromise;
    };
  }

  self.name = script;

  self._start = function(url) {
    ezspawn('adb -e devices').then(function(re) {
      if (!re.stdout.match(/emulator-\d+/)) {
        // she's not running :()
        self._execCommand(self._getCommand(), self._getOptions(url));
      }
    })
      .then(function() {
        return ezspawn('adb -e wait-for-device');
      })
      .then(function() {
        return spawnAndWaitFor('adb -e logcat', /Boot is finished/);
      })
      .then(function() {
        return ezspawn('adb shell input keyevent 26');
      })
      .then(function() {
        return ezspawn('adb shell input keyevent 82');
      })
      .then(function() {
        return ezspawn('adb shell am start -a android.intent.action.VIEW -n ' + self.className + ' -d ' + url);
      });
  };

  self._getCommand = function() {
    return 'emulator';
  };

  self._getOptions = function(url) {
    return [
      '-avd', 'Android511'
    ];
  }
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
