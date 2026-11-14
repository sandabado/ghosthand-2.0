'use client';
/** Events queue intent. The heartbeat is the only consumer that changes camera params. */
export const input = { dx:0, dy:0, x:0, y:0, cursorX:-100, cursorY:-100, hover:false, keys:new Set<string>() };
export function queueInput(value:{dx?:number;dy?:number;x?:number;y?:number;cursorX?:number;cursorY?:number;hover?:boolean}) {
  if(value.dx!==undefined) input.dx+=value.dx;
  if(value.dy!==undefined) input.dy+=value.dy;
  if(value.x!==undefined) input.x=value.x;
  if(value.y!==undefined) input.y=value.y;
  if(value.cursorX!==undefined) input.cursorX=value.cursorX;
  if(value.cursorY!==undefined) input.cursorY=value.cursorY;
  if(value.hover!==undefined) input.hover=value.hover;
}
export function clearInput(){input.dx=0;input.dy=0;input.keys.clear();}
