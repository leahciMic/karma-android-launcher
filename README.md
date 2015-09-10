# karma-android-launcher

This launches Firefox and Chrome on an Android emulator. (Chrome, Firefox and
the android emulator must already be setup and working, and in your path).

Provides the following launchers:

* FirefoxAndroid
* ChromeAndroid

## Warning

This plugin may not work nicely with other emulator based launchers (such as
karma-ievms, and itself). You will need to split these launchers up and run them
sequentially rather than in parallel.

## Options

### .shutdownEmulator = true

This controls the shutdown behaviour, by default the emulator is shutdown after
each task. When set to true, it will not shutdown between each task, and you
will be responsible for managing the life-cycle of the emulator. (It will still
be started automatically if it's not running).

Example:

```js
customLaunchers: {
  ChromeAndroidNoShutdown: {
    base: 'ChromeAndroid',
    shutdownEmulator: false
  }  
}
```
