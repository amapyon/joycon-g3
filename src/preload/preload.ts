// preload.ts
import { contextBridge } from 'electron';
import { electronAPI } from './expose';

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded.');
