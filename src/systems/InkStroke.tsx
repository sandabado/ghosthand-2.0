'use client';
import { useEffect,useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending,Color,DoubleSide,NormalBlending,ShaderMaterial } from 'three';
import { PALETTE } from '../core/config';
import { runtime,useJourney } from '../core/world';
import { uploadUniforms,worldUniforms } from '../world/shaders';
import { createBrushGeometry,createTipGeometry,type StrokePoint } from './ink/geometry';
import { brushFragment,brushVertex,inkTipFragment,inkTipVertex } from './ink/shaders';

export type { StrokePoint } from './ink/geometry';

export interface InkStrokeProps {
  path:StrokePoint[];
  width?:number;
  pressure?:number;
  seed?:number;
  start?:number;
  span?:number;
  /** Compatibility with the original equal-segment fixture; SVG sources use arc-length start/span. */
  segment?:number;
  segments?:number;
  opacity?:number;
  drawParam?:'hand'|'inkFlow'|'sceneMix';
  /** Frozen previous-scene stroke; its exit uses the inverse shared scene blend. */
  settled?:boolean;
}

/** Legacy geometry entry point now returns the pressure ribbon, rather than a one-pixel line. */
export function strokeGeometry(path:StrokePoint[],segment=0,segments=1){
  return createBrushGeometry(path,{start:segment/segments,span:1/segments});
}

/**
 * Shared SVG-derived sumi-e stroke. Geometry carries pressure; shaders carry pigment and wet edges.
 * This component consumes the world clock and uniforms. It owns no clock, timeline, or composer.
 */
export function InkStroke({path,width=0.11,pressure=1,seed=0.5,start,span,segment=0,segments=1,opacity=1,drawParam='hand',settled=false}:InkStrokeProps){
  const revealStart=start??segment/segments;
  const revealSpan=span??1/segments;
  const resource=useMemo(()=>{
    const options={width,pressure,seed,start:revealStart,span:revealSpan};
    const geometry=createBrushGeometry(path,options);
    const tips=createTipGeometry(path,options);
    const extraUniforms=()=>({
      ...worldUniforms(),
      uInkDim:{value:new Color(PALETTE.candleDim)},
      uStrokeOpacity:{value:opacity},uStrokeSeed:{value:seed},uStrokeWidth:{value:width},
    });
    const brush=new ShaderMaterial({
      uniforms:extraUniforms(),vertexShader:brushVertex,fragmentShader:brushFragment,
      transparent:true,depthWrite:false,side:DoubleSide,blending:NormalBlending,
    });
    const tip=new ShaderMaterial({
      uniforms:extraUniforms(),vertexShader:inkTipVertex,fragmentShader:inkTipFragment,
      transparent:true,depthWrite:false,blending:AdditiveBlending,
    });
    brush.name='GhostHandInkBrush';
    tip.name='GhostHandInkTips';
    return {geometry,tips,brush,tip};
  },[path,width,pressure,seed,revealStart,revealSpan,opacity]);
  useFrame(()=>{
    const state=useJourney.getState();
    uploadUniforms(resource.brush,state.params);uploadUniforms(resource.tip,state.params);
    const draw=state.params[drawParam];
    resource.brush.uniforms.uHand.value=draw;resource.tip.uniforms.uHand.value=draw;
    if(drawParam!=='hand'){
      const decay=draw>=0.999?1:0;
      resource.brush.uniforms.uInkTipDecay.value=decay;resource.tip.uniforms.uInkTipDecay.value=decay;
    }
    if(settled){
      for(const material of [resource.brush,resource.tip]){
        material.uniforms.uHand.value=1;
        material.uniforms.uInkTipDecay.value=1;
        material.uniforms.uSceneMix.value=1-state.params.sceneMix;
      }
    }
    runtime.ink.bleedUniform=resource.brush.uniforms.uInkBleed.value;
    runtime.ink.pressureUniform=resource.brush.uniforms.uInkPressure.value;
    if(state.reducedMotion){resource.brush.uniforms.uTime.value=0;resource.tip.uniforms.uTime.value=0;}
  },-16);
  useEffect(()=>{
    const vertices=resource.geometry.getAttribute('position').count;
    const particles=resource.tips.getAttribute('position').count;
    runtime.ink.instances++;runtime.ink.ribbonVertices+=vertices;runtime.ink.tipParticles+=particles;
    return()=>{
      runtime.ink.instances--;runtime.ink.ribbonVertices-=vertices;runtime.ink.tipParticles-=particles;
      resource.geometry.dispose();resource.tips.dispose();resource.brush.dispose();resource.tip.dispose();
    };
  },[resource]);
  // Resources are explicitly owned above. Prevent R3F from also disposing their shared references.
  return <group dispose={null}><mesh geometry={resource.geometry} material={resource.brush}/><points geometry={resource.tips} material={resource.tip}/></group>;
}
