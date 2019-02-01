# Rx-IPC-Electron

[![Build Status](https://travis-ci.org/colinskow/rx-ipc-electron.png?branch=master)](https://travis-ci.org/colinskow/rx-ipc-electron)

**Easily pass RxJS Observables between the main and renderer processes of your Electron app!**

## Why

Observables are probably the simplest way to coordinate asynchronous events and pass data between the main and renderer processes in an Electron app.

This module makes it easy. Simply create a factory function which returns any Observable or Subject and register a listener. Then run the command from another process in your app and the returned observable will pass through.

## Setup

```bash
npm install rx-ipc-electron --save
```

#### From the Electron MAIN process

```js
import rxIpc from 'rx-ipc-electron/lib/main';
// const rxIpc = require('rx-ipc-electron/lib/main');
```

#### From the Electron RENDERER process

```js
import rxIpc from 'rx-ipc-electron/lib/renderer';
// const rxIpc = require('rx-ipc-electron/lib/renderer');
```

## Quick Start

#### MAIN

```js
// This is a factory function that returns an Observable
function createObservable(...args) {
  return Observable.from(args)
    .map(x => x * 2);
}
rxIpc.registerListener('create-observable', createObservable);
```

#### RENDERER

```js
const results = [];
// null to target the main process, otherwise a `webContents`
// object from the window you want to target
rxIpc.runCommand('create-observable', null, 1, 2, 3)
  .subscribe(
    (data) => {
      results.push(data);
    },
    (err) => {
      console.error(err);
    },
    () => {
      console.log(results);
      // Logs [2, 4, 6]
    }
  );
```

## API
#### `new RxIpc(icpRenderer | ipcMain, options)
##### `options.ipcChannelPrefix`
When sending and receiving IPC message use a prefix
for channel name.

Can be used to fix collisions between several instances of
`rpx-ipc-electron`.

#### `rxIpc.checkRemoteListener(channel, receiver)`

Checks if a listener is active on the receiver for the channel you specify.

* `channel` (`string`) the name of the command you want to check.
* `receiver` (`null` or `webContents`) null if the main process is the target, otherwise the `webContents` object of the window you want to target.

**Returns:** a `Promise` that is resolved if the listner is active, otherwise rejected.

#### `rxIpc.cleanUp()`

Removes all active command listeners.

**Returns:** `void`

#### `rxIpc.registerListener(channel, observableFactory)`

Registers a new listener for the command you specify.

* `channel` (`string`) the name of the command you want to register.
* `observableFactory` (`function`) a function which can take any number of arguments (passed through from `rxIpc.runCommand`) and returns an Observable.

**Returns:** `void`.

#### `rxIpc.removeListeners(channel)`

Removes all listeners for the channel you specify.

* `channel` (`string`) the name of the command for the listener you want to remove.

**Returns:** `void`.

#### `rxIpc.runCommand(channel, receiver, ...args)`

Runs the command you specify on the remote receiver.

* `channel` (`string`) the name of the registered command you want to run.
* `receiver` (`null` or `webContents`) null if the main process is the target, otherwise the `webContents` object of the window you want to target.
* `...args` any number of arguments to be passed to the remote Observable factory function.

**Returns:** an `Observable` passed through from the remote Observable.

## Release History

* **0.1.0** (2017-05-06) - Initial Release
