import { ipcMain } from 'electron';
import { Observable } from 'rxjs/Rx';
import rxIpc from '../../src/main';

function testMain(...args: any[]) {
  return Observable.from(args);
}

function testError() {
  return new Observable((observer) => {
    observer.next(1);
    observer.next(2);
    observer.error('Test Error');
  });
}

ipcMain.on('main-run-command', (event) => {
  const results = [];
  rxIpc.runCommand('command-from-main', event.sender, 3, 2, 1)
    .subscribe(
      (data) => {
        results.push(data);
      },
      (err) => {
        throw err;
      },
      () => {
        event.sender.send('results-from-main', results);
      }
    );
});

rxIpc.registerListener('test-main', testMain);
rxIpc.registerListener('test-error', testError);
