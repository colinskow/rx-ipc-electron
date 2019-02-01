import { Observable } from 'rxjs/Observable';
import { ObservableFactoryFunction, Receiver } from './types';

export interface RxIpcOptions {
  /**
   * When sending and receiving IPC message use a prefix
   * for channel name.
   *
   * Can be used to fix collisions between several instances of
   * rpx-ipc-electron
   */
  ipcChannelPrefix?: string,
}
export class RxIpc {
  static listenerCount: number = 0;

  listeners: { [id: string]: boolean } = {};

  constructor(
    private ipc: Electron.EventEmitter | Receiver,
    private options?: RxIpcOptions
    ) {
    // Respond to checks if a listener is registered
    this.ipc.on(this.chan('rx-ipc-check-listener'), (event, channel) => {
      const replyChannel = this.chan('rx-ipc-check-reply:' + channel);
      if (this.listeners[channel]) {
        event.sender.send(replyChannel, true);
      } else {
        event.sender.send(replyChannel, false);
      }
    });
  }

  checkRemoteListener(channel: string, receiver: Receiver) {
    const target = receiver == null ? (this.ipc as Receiver) : receiver;
    return new Promise((resolve, reject) => {
      this.ipc.once(this.chan('rx-ipc-check-reply:'+channel), (event, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(false);
        }
      });
      target.send(this.chan('rx-ipc-check-listener'), channel);
    });
  }

  cleanUp() {
    this.ipc.removeAllListeners(this.chan('rx-ipc-check-listener'));
    Object.keys(this.listeners).forEach((channel) => {
      this.removeListeners(channel);
    });
  }

  registerListener(channel: string, observableFactory: ObservableFactoryFunction) {
    this.listeners[channel] = true;
    this.ipc.on(this.chan(channel), (event, subChannel, ...args) => {
      // Save the listener function so it can be removed
      const replyTo = event.sender;
      const observable = observableFactory(...args);
      const subscription = observable.subscribe(
        (data) => {
          replyTo.send(this.chan(subChannel), 'n', data);
        },
        (err) => {
          replyTo.send(this.chan(subChannel), 'e', err);
        },
        () => {
          replyTo.send(this.chan(subChannel), 'c');
        }
      );

      replyTo.on('destroyed', () => subscription.unsubscribe());
    });
  }

  removeListeners(channel: string) {
    this.ipc.removeAllListeners(this.chan(channel));
    delete this.listeners[channel];
  }

  runCommand(channel: string, receiver: Receiver = null, ...args: any[]): Observable<any> {
    const subChannel = `${channel}:${RxIpc.listenerCount}`;
    RxIpc.listenerCount+=1;
    const target = receiver == null ? (this.ipc as Receiver) : receiver;
    target.send(this.chan(channel), subChannel, ...args);
    return new Observable((observer) => {
      this.checkRemoteListener(channel, receiver)
        .catch(() => {
          observer.error('Invalid channel: ' + channel);
        });

      const listener = (event, type, data) => {
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
          this.ipc.removeListener(subChannel, listener);
        };
      };

      this.ipc.on(this.chan(subChannel), listener);
    });
  }

  getListenerCount(channel: string) {
    return this.ipc.listenerCount(this.chan(channel));
  }

  /**
   * Prefix a channel name with the optional `ipcChannelPrefix` option.
   */
  private chan(channel: string) {
    return `${this.options.ipcChannelPrefix || ''}${channel}`;
  }
}
