import { BlendFunction,Effect,EffectAttribute } from 'postprocessing';
import { Color,Uniform,Vector2 } from 'three';
import { PALETTE,TIMING } from '../../core/config';
import { mergeSlicePose } from './merge-pose';

const fragment=`
uniform float uSliceActive;
uniform float uSliceOpening;
uniform float uSliceStrike;
uniform vec2 uSliceLine;
uniform vec2 uSliceUpper;
uniform vec2 uSliceLower;
uniform vec3 uSliceVoid;
uniform vec3 uSliceGreen;

float pageSide(vec2 point){return point.y-uSliceLine.x*point.x-uSliceLine.y;}
bool onPage(vec2 point){return point.x>=0.0&&point.x<=1.0&&point.y>=0.0&&point.y<=1.0;}

void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
  outputColor=inputColor;
  if(uSliceActive<.5)return;
  vec2 page=vec2(uv.x,1.0-uv.y);
  if(uSliceOpening<.00001){
    // The mark belongs to the blade's exact axis; it is not a second sword.
    float edge=exp(-abs(pageSide(page))*900.0)*uSliceStrike;
    outputColor.rgb+=uSliceGreen*edge*.16;
    return;
  }
  vec2 upper=page-uSliceUpper,lower=page-uSliceLower;
  bool top=onPage(upper)&&pageSide(upper)<=0.0;
  bool bottom=onPage(lower)&&pageSide(lower)>=0.0;
  if(top||bottom){
    vec2 source=top?upper:lower;
    outputColor=texture2D(inputBuffer,vec2(source.x,1.0-source.y));
    float edge=exp(-abs(pageSide(source))*700.0)*(1.0-uSliceOpening);
    outputColor.rgb+=uSliceGreen*edge*.12;
  }else{
    // Empty space opens between the actual rendered pieces. No capture,
    // second canvas, duplicate scene or extra animation clock is involved.
    float light=exp(-length((page-vec2(.5,.52))*vec2(1.0,1.4))*4.0);
    outputColor=vec4(uSliceVoid+uSliceGreen*light*.009,1.0);
  }
}`;

/** A single compositor pass separates the live rendered page on the same seam as its DOM. */
export class PageSliceEffect extends Effect {
  constructor(){
    super('GhostHandPageSlice',fragment,{blendFunction:BlendFunction.NORMAL,attributes:EffectAttribute.CONVOLUTION,uniforms:new Map<string,Uniform>([
      ['uSliceActive',new Uniform(0)],['uSliceOpening',new Uniform(0)],['uSliceStrike',new Uniform(0)],
      ['uSliceLine',new Uniform(new Vector2())],['uSliceUpper',new Uniform(new Vector2())],['uSliceLower',new Uniform(new Vector2())],
      ['uSliceVoid',new Uniform(new Color(PALETTE.void))],['uSliceGreen',new Uniform(new Color(PALETTE.candle))],
    ])});
  }

  setPose(active:boolean,elapsed:number,aspect:number){
    this.uniforms.get('uSliceActive')!.value=active?1:0;
    if(!active)return;
    const pose=mergeSlicePose(elapsed,aspect,TIMING.merge);
    this.uniforms.get('uSliceOpening')!.value=pose.opening;
    this.uniforms.get('uSliceStrike')!.value=pose.strike;
    (this.uniforms.get('uSliceLine')!.value as Vector2).set(pose.slope,pose.intercept);
    (this.uniforms.get('uSliceUpper')!.value as Vector2).set(...pose.upper);
    (this.uniforms.get('uSliceLower')!.value as Vector2).set(...pose.lower);
  }
}
