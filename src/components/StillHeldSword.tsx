'use client';

import { useId,useLayoutEffect,useMemo,useState } from 'react';
import { PALETTE } from '../core/config';
import { CEREMONY_SWORD } from '../systems/cut/sword-geometry';
import { stillSwordBladePath,stillSwordProjection,stillWeaponLayout,type StillSwordMode } from '../systems/cut/still-sword';
import { SUMMON_HAND_ASSETS } from '../systems/ink/hand-assets';

/** Shared SVG assembly: bare steel or fitted sheath, never a second sword design. */
function SwordDrawing({sheathed=false}:{sheathed?:boolean}){
  const id=useId().replaceAll(':',''),bladeId=`${id}-blade`,wrapId=`${id}-wrap`,metalId=`${id}-metal`,glowId=`${id}-glow`,sheathId=`${id}-sheath`;
  const bladePath=useMemo(()=>stillSwordBladePath(sheathed),[sheathed]);
  const {grip,guard,collar,pommel}=CEREMONY_SWORD;
  return <>
      <defs>
        <linearGradient id={bladeId} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stopColor={PALETTE.candleDim}/><stop offset=".18" stopColor={PALETTE.candle}/><stop offset=".5" stopColor={PALETTE.bone}/><stop offset=".82" stopColor={PALETTE.candle}/><stop offset="1" stopColor={PALETTE.candleDim}/></linearGradient>
        <linearGradient id={metalId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PALETTE.smoke}/><stop offset=".45" stopColor={PALETTE.bone}/><stop offset=".65" stopColor={PALETTE.candleDim}/><stop offset="1" stopColor={PALETTE.smoke}/></linearGradient>
        <linearGradient id={sheathId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PALETTE.void}/><stop offset=".3" stopColor={PALETTE.smoke}/><stop offset=".48" stopColor={PALETTE.candleDim}/><stop offset=".6" stopColor={PALETTE.smoke}/><stop offset="1" stopColor={PALETTE.void}/></linearGradient>
        <pattern id={wrapId} width=".14" height=".18" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><rect width=".14" height=".18" fill={PALETTE.void}/><path d="M0 .025H.14M0 .12H.14" stroke={PALETTE.candleDim} strokeWidth=".025"/></pattern>
        <filter id={glowId} x="-15%" y="-140%" width="130%" height="380%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation=".025" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g data-canonical-sword={sheathed?'sheathed':'bare'}>
        <path className="cut6-still-blade" d={bladePath} fill={`url(#${sheathed?sheathId:bladeId})`} stroke={sheathed?PALETTE.candleDim:PALETTE.candle} strokeWidth=".005" filter={sheathed?undefined:`url(#${glowId})`}/>
        <rect x={grip.start} y={-grip.radius} width={grip.end-grip.start} height={grip.radius*2} rx=".055" fill={`url(#${wrapId})`} stroke={PALETTE.candleDim} strokeWidth=".006"/>
        <ellipse cx={pommel.center} cy="0" rx={pommel.thickness/2} ry={grip.radius} fill={`url(#${metalId})`}/>
        <rect x={guard.center-guard.thickness/2} y={-guard.halfWidth} width={guard.thickness} height={guard.halfWidth*2} rx=".012" fill={`url(#${metalId})`}/>
        <rect x={collar.start} y={-collar.halfWidth} width={collar.end-collar.start} height={collar.halfWidth*2} rx=".006" fill={`url(#${metalId})`}/>
      </g>
  </>;
}

/** A native inline side view keeps the contact and ending readable without WebGL. */
export function StillWeapon({sheathed=false}:{sheathed?:boolean}){
  const layout=useMemo(()=>stillWeaponLayout(sheathed),[sheathed]);
  return <svg viewBox={layout.viewBox} focusable="false" aria-hidden="true" data-still-weapon={sheathed?'oath':'commission'} style={{aspectRatio:`${layout.width} / ${layout.height}`}}>
    <g transform="scale(1 -1)">
      {sheathed&&<g fill={PALETTE.smoke} stroke={PALETTE.candleDim} strokeWidth=".008">
        <rect x="1.15" y="-.69" width="3.1" height=".085" rx=".025"/>
        {layout.supports.map(({x,y})=><path key={x} d={`M${x-.05} -.62H${x+.05}V${y-.018}H${x+.2}V${y+.055}H${x+.12}V${y}H${x-.12}V${y+.055}H${x-.2}V${y-.018}H${x-.05}Z`}/>)}
      </g>}
      <SwordDrawing sheathed={sheathed}/>
    </g>
  </svg>;
}

/** The motion alternative is a still projection of the same sword and accepted palm. */
export default function StillHeldSword({mode='merge',targetX=.30,targetY=-.12}:{mode?:StillSwordMode;targetX?:number;targetY?:number}){
  const [viewport,setViewport]=useState({width:1280,height:900});
  const projection=useMemo(()=>stillSwordProjection(viewport.width,viewport.height,mode,targetX,targetY),[viewport.width,viewport.height,mode,targetX,targetY]);
  useLayoutEffect(()=>{
    const measure=()=>{
      const width=document.documentElement.clientWidth,height=innerHeight;
      setViewport(previous=>previous.width===width&&previous.height===height?previous:{width,height});
    };
    const observer=new ResizeObserver(measure);observer.observe(document.documentElement);
    window.addEventListener('resize',measure);measure();
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
  },[]);
  return <div className="cut6-still-sword" aria-hidden="true">
    <svg viewBox={`0 0 ${projection.width} ${projection.height}`} preserveAspectRatio="none" focusable="false">
      <g transform={projection.swordTransform}><SwordDrawing/></g>
    </svg>
    <img src={SUMMON_HAND_ASSETS.gripping.src} alt="" width={1536} height={1024} decoding="async" style={{left:projection.hilt[0],top:projection.hilt[1],width:projection.hand.width,height:projection.hand.height,transform:projection.hand.transform}}/>
  </div>;
}
