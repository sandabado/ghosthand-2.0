'use client';
import { useSyncExternalStore } from 'react';
import { subscribeParams, useWorld, type WorldParams } from './world';
export function useParam<K extends keyof WorldParams>(name:K):WorldParams[K] {
  return useSyncExternalStore(subscribeParams,()=>useWorld.getState().params[name],()=>0);
}
export { uploadUniforms } from '../world/shaders';
