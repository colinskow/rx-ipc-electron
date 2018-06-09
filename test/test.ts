import {expect} from 'chai';
import {ipcRenderer} from 'electron';
import {suite, test} from 'mocha-typescript';
import {concat, from, Observable} from 'rxjs';
import rxIpc from '../src/renderer';

@suite('Rx-Electron-IPC')
class Main {

    @test 'It should pass an Observable from main to renderer'() {
        const results = [];
        return new Promise((resolve) => {
            rxIpc.runCommand('test-main', null, 1, 2, {test: 'passed'})
                .subscribe(
                    (data) => {
                        results.push(data);
                    },
                    (err) => {
                        throw err;
                    },
                    () => {
                        expect(results).to.deep.equal([1, 2, {test: 'passed'}]);
                        resolve();
                    }
                );
        });
    }

    @test 'It should correctly pass an error'() {
        const results = [];
        return new Promise((resolve) => {
            rxIpc.runCommand('test-error', null)
                .subscribe(
                    (data) => {
                        results.push(data);
                    },
                    (err) => {
                        expect(results).to.deep.equal([1, 2]);
                        expect(err).to.equal('Test Error');
                        resolve();
                    }
                );
        });
    }

    @test 'It should handle two instances of the same command'() {
        const results = [];
        return new Promise((resolve) => {
            concat(
                rxIpc.runCommand('test-main', null, 1, 2, 3),
                rxIpc.runCommand('test-main', null, 4, 5, 6)
            ).subscribe(
                (data) => {
                    results.push(data);
                },
                (err) => {
                    throw err;
                },
                () => {
                    expect(results).to.deep.equal([1, 2, 3, 4, 5, 6]);
                    resolve();
                }
            );
        });
    }

    @test 'The renderer should run a command from the main process'() {
        return new Promise((resolve) => {
            function testCommand(...args) {
                return from(args);
            }

            ipcRenderer.on('results-from-main', (event, results) => {
                expect(results).to.deep.equal([3, 2, 1]);
                resolve();
            });
            rxIpc.registerListener('command-from-main', testCommand);
            ipcRenderer.send('main-run-command');
        });
    }

    @test 'It should throw an error if given an unregistered command'() {
        return new Promise((resolve, reject) => {
            rxIpc.runCommand('invalid', null)
                .subscribe(
                    (data) => {
                        reject('We should not receive data here.');
                    },
                    (err) => {
                        expect(err).to.equal('Invalid channel: invalid');
                        resolve();
                    }
                );
        });
    }

    @test 'It should clean up listeners'() {
        function noop() {
            return new Observable();
        }

        rxIpc.registerListener('remove-test-1', noop);
        rxIpc.registerListener('remove-test-1', noop);
        expect(rxIpc._getListenerCount('remove-test-1')).to.equal(2);
        rxIpc.removeListeners('remove-test-1');
        expect(rxIpc._getListenerCount('remove-test-1')).to.equal(0);
        rxIpc.registerListener('remove-test-2', noop);
        expect(rxIpc._getListenerCount('remove-test-2')).to.equal(1);
        rxIpc.cleanUp();
        expect(rxIpc._getListenerCount('remove-test-2')).to.equal(0);
    }
}
