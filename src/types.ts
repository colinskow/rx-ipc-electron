import { Observable } from 'rxjs/Observable';

export type ObservableFactoryFunction = (...args: any[]) => Observable<any>;

export interface Receiver extends Electron.EventEmitter {
  send(channel: string, ...args: any[]): void;
}
