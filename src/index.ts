import { RxIpc } from './rx-ipc';

export { RxIpc } from './rx-ipc';
export { ObservableFactoryFunction, Receiver } from './types';

import ipcMain from './main';
import ipcRenderer from './renderer';

export default (process.type === 'renderer' ? ipcRenderer : ipcMain);
