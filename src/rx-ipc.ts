import { Observable } from 'rxjs';

import { IpcListener, ObservableFactoryFunction, Receiver } from './index';

export class RxIpc {
  static listenerCount: number = 0;

  listeners: { [id: string]: boolean } = {};

  constructor(private ipc) {
    // Respond to checks if a listener is registered
    this.ipc.on('rx-ipc-check-listener', (event, channel) => {
      const replyChannel = 'rx-ipc-check-reply:' + channel;
      if (this.listeners[channel]) {
        event.sender.send(replyChannel, true);
      } else {
        event.sender.send(replyChannel, false);
      }
    });
  }

  checkRemoteListener(channel: string, receiver: Receiver) {
    const target = receiver == null ? this.ipc : receiver;
    return new Promise((resolve, reject) => {
      this.ipc.once('rx-ipc-check-reply:' + channel, (event, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(false);
        }
      });
      target.send('rx-ipc-check-listener', channel);
    });
  }

  cleanUp() {
    this.ipc.removeAllListeners('rx-ipc-check-listener');
    Object.keys(this.listeners).forEach((channel) => {
      this.removeListeners(channel);
    });
  }

  registerListener(channel: string, observableFactory: ObservableFactoryFunction) {
    this.listeners[channel] = true;
    this.ipc.on(channel, function openChannel(event, subChannel, ...args) {
      // Save the listener function so it can be removed
      const replyTo = event.sender;
      const observable = observableFactory(...args);
      observable.subscribe(
        (data) => {
          replyTo.send(subChannel, 'n', data);
        },
        (err) => {
          replyTo.send(subChannel, 'e', err);
        },
        () => {
          replyTo.send(subChannel, 'c');
        }
      );
    });
  }

  removeListeners(channel: string) {
    this.ipc.removeAllListeners(channel);
    delete this.listeners[channel];
  }

  runCommand(channel: string, receiver: Receiver = null, ...args: any[]): Observable<any> {
    const self = this;
    const subChannel = channel + ':' + RxIpc.listenerCount;
    RxIpc.listenerCount++;
    const target = receiver == null ? this.ipc : receiver;
    target.send(channel, subChannel, ...args);
    return new Observable((observer) => {
      this.checkRemoteListener(channel, receiver)
        .catch(() => {
          observer.error('Invalid channel: ' + channel);
        });
      this.ipc.on(subChannel, function listener(event, type, data) {
        switch (type) {
          case 'n':
            observer.next(data);
            break;
          case 'e':
            observer.error(data);
            break;
          case 'c':
            observer.complete();
        }
        // Cleanup
        return () => {
          self.ipc.removeListener(subChannel, listener);
        };
      });
    });
  }

  _getListenerCount(channel: string) {
    return this.ipc.listenerCount(channel);
  }

}
