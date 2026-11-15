'use client';

import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { AdditiveBlending,BufferAttribute,BufferGeometry,Color,DoubleSide,Group,Mesh,PlaneGeometry,ShaderMaterial,SRGBColorSpace,Texture,Vector2 } from 'three';
import { PALETTE,TIMING } from '../../core/config';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { buildSwordProfile } from '../smithy/geometry';
import { createSmithySurfaceTextures } from '../smithy/materials';
import { graspAnchorPose,mergeCeremonyPose,openingCeremonyPose } from './merge-pose';
import { CEREMONY_SWORD,buildCeremonySwordProfile,createCeremonyCollar,createCeremonyGrip,createCeremonyGuard,createCeremonyPommel } from './sword-geometry';
import { createCeremonyBladeMaterial,createCeremonyFittingsMaterial,createCeremonyGripMaterial,prepareCeremonyStudio } from './sword-materials';
import { handPlaneTransform,SUMMON_HAND_ASSETS,SUMMON_HAND_SCALE } from '../ink/hand-assets';
import { compileSmithyMaterials } from '../smithy/shader-warmup';

type CeremonyScene='THRESHOLD'|'MERGE';
const lastFrames:Partial<Record<CeremonyScene|'LEGEND',WorldParams>>={},ready:Partial<Record<CeremonyScene,boolean>>={};
let decodedGrip:Promise<HTMLImageElement>|null=null;
function loadGrip(){
  return decodedGrip??=new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();image.decoding='async';
    image.onload=()=>{image.decode().catch(()=>{}).then(()=>resolve(image));};image.onerror=reject;image.src=SUMMON_HAND_ASSETS.gripping.src;
  }).catch(error=>{decodedGrip=null;throw error;});
}
export const mergeGripReady=(scene:CeremonyScene='MERGE')=>Boolean(ready[scene]);
const imagePivot={x:SUMMON_HAND_ASSETS.gripping.pivot[0],y:SUMMON_HAND_ASSETS.gripping.pivot[1],axis:SUMMON_HAND_ASSETS.gripping.axis};
const swordTipLength=Math.hypot(...CEREMONY_SWORD.blade.tip),swordTipAngle=Math.atan2(CEREMONY_SWORD.blade.tip[1],CEREMONY_SWORD.blade.tip[0]);
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const handFragment=`
  uniform sampler2D uImage;uniform float uLoaded;uniform float uOpacity;uniform float uWhite;uniform float uGain;uniform float uAspect;uniform float uSpill;uniform vec2 uBladeLight;uniform vec3 uWhiteColor;uniform vec3 uGreen;varying vec2 vUv;
  void main(){if(uLoaded<.5)discard;vec4 source=texture2D(uImage,vUv);float wrist=1.0-smoothstep(.82,.99,max(vUv.x,1.0-vUv.y));float alpha=source.a*uOpacity*wrist;if(alpha<.003)discard;
    float luminance=dot(source.rgb,vec3(.2126,.7152,.0722));
    vec3 green=mix(source.rgb,uGreen*luminance*1.45,.24),light=mix(uGreen,uWhiteColor,uWhite);
    vec2 toBlade=(uBladeLight-vUv)*vec2(1.0,1.0/uAspect);
    float falloff=exp(-dot(toBlade,toBlade)*7.5),anatomy=pow(clamp(luminance*2.2,0.0,1.0),.72);
    vec3 color=mix(green,uWhiteColor*luminance*1.08,uWhite*.9);
    // The supplied anatomy retains its baked form. Only the nearby blade's
    // green-to-white spill is added; this remains an image plane, not a 3D hand.
    color+=light*(.018+anatomy*.14)*falloff*uSpill;
    gl_FragColor=vec4(color*uGain,alpha);}`;
const handDepthFragment=`uniform sampler2D uImage;uniform float uLoaded;uniform float uOpacity;varying vec2 vUv;
  void main(){if(uLoaded<.5||uOpacity<.38)discard;float wrist=1.0-smoothstep(.82,.99,max(vUv.x,1.0-vUv.y));if(texture2D(uImage,vUv).a*wrist<.52)discard;gl_FragColor=vec4(0.0);}`;
const haloFragment=`
  uniform float uOpacity;uniform float uWhite;uniform vec3 uGreen;uniform vec3 uWhiteColor;varying vec2 vUv;
  void main(){float x=vUv.x;float line=(vUv.y-.5)*1.4+.14;float curve=.035*x+.24*x*x;
    float distanceToBlade=abs(line-curve),soft=exp(-distanceToBlade*14.0);
    float ends=smoothstep(0.0,.045,x)*(1.0-smoothstep(.94,1.0,x));
    float alpha=soft*ends*uOpacity*.13;if(alpha<.002)discard;
    gl_FragColor=vec4(mix(uGreen,uWhiteColor,uWhite)*1.8,alpha);}`;
const sparkVertex=`
  attribute float aSeed;uniform float uContact;uniform float uOpacity;varying float vAlpha;
  void main(){float angle=aSeed*83.0,r=uContact*(.3+aSeed*.9);vec3 p=position+vec3(cos(angle)*r,sin(angle)*r,(aSeed-.5)*r);
    vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((12.0+aSeed*9.0)/max(1.0,-mv.z),1.0,3.8);
    vAlpha=sin(uContact*3.14159265)*uOpacity*(.3+aSeed*.7);}`;
const sparkFragment=`uniform vec3 uGreen;uniform vec3 uWhiteColor;uniform float uWhite;varying float vAlpha;
  void main(){float alpha=(1.0-smoothstep(.04,.5,length(gl_PointCoord-.5)))*vAlpha;if(alpha<.003)discard;gl_FragColor=vec4(mix(uGreen,uWhiteColor,uWhite)*1.6,alpha);}`;

/** One dominant sword is offered, accepted, charged and swept by the locked Merge clock. */
export default function MergeCeremony({scene='MERGE',previous=false,carried=false}:{scene?:CeremonyScene;previous?:boolean;carried?:boolean}){
  const size=useThree(state=>state.size),camera=useThree(state=>state.camera),renderer=useThree(state=>state.gl),worldScene=useThree(state=>state.scene);
  const root=useRef<Group>(null),rig=useRef<Group>(null),bladeMesh=useRef<Mesh>(null),hand=useRef<Mesh>(null),handDepth=useRef<Mesh>(null),sparks=useRef<Group>(null);
  const frameKey=carried?'LEGEND':scene;
  const frozen=useRef<WorldParams>({...lastFrames[frameKey]??useJourney.getState().params});
  const resource=useMemo(()=>{
    const profile=buildCeremonySwordProfile(buildSwordProfile(false)),bladeGeometry=new BufferGeometry();
    bladeGeometry.setAttribute('position',new BufferAttribute(profile.positions,3));bladeGeometry.setAttribute('uv',new BufferAttribute(profile.uv,2));bladeGeometry.setIndex(new BufferAttribute(profile.indices,1));bladeGeometry.computeVertexNormals();
    const surfaces=createSmithySurfaceTextures();
    const destination=scene==='THRESHOLD'?PALETTE.bone:PALETTE.flash;
    const {material:blade,white:bladeWhite,core:bladeCore}=createCeremonyBladeMaterial(surfaces.roughness,destination);
    const grip=createCeremonyGripMaterial(surfaces.wrap),fittings=createCeremonyFittingsMaterial();
    const halo=new ShaderMaterial({uniforms:{uOpacity:{value:0},uWhite:{value:0},uGreen:{value:new Color(PALETTE.candle)},uWhiteColor:{value:new Color(destination)}},vertexShader:vertex,fragmentShader:haloFragment,transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,toneMapped:false});
    const handMaterial=new ShaderMaterial({uniforms:{uImage:{value:null},uLoaded:{value:0},uOpacity:{value:0},uWhite:{value:0},uGain:{value:1},uAspect:{value:1.5},uSpill:{value:0},uBladeLight:{value:new Vector2(.27,.82)},uGreen:{value:new Color(PALETTE.candle)},uWhiteColor:{value:new Color(destination)}},vertexShader:vertex,fragmentShader:handFragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});handMaterial.name='GhostHandAnatomyOnlyAcceptedGrip';
    const handDepthMaterial=new ShaderMaterial({uniforms:{uImage:handMaterial.uniforms.uImage,uLoaded:handMaterial.uniforms.uLoaded,uOpacity:handMaterial.uniforms.uOpacity},vertexShader:vertex,fragmentShader:handDepthFragment,colorWrite:false,depthWrite:true,depthTest:true,toneMapped:false});handDepthMaterial.name='GhostHandOpaqueFingerOcclusion';
    const handGeometry=new PlaneGeometry(1,1),haloGeometry=new PlaneGeometry(4.5,1.4),gripGeometry=createCeremonyGrip(),guardGeometry=createCeremonyGuard(),capGeometry=createCeremonyPommel(),collarGeometry=createCeremonyCollar();
    const sparkGeometry=new BufferGeometry(),positions=new Float32Array(96*3),seeds=Float32Array.from({length:96},(_,i)=>((i*73+19)%97)/97);
    sparkGeometry.setAttribute('position',new BufferAttribute(positions,3));sparkGeometry.setAttribute('aSeed',new BufferAttribute(seeds,1));
    const sparkMaterial=new ShaderMaterial({uniforms:{uContact:{value:0},uOpacity:{value:0},uWhite:{value:0},uGreen:{value:new Color(PALETTE.candle)},uWhiteColor:{value:new Color(destination)}},vertexShader:sparkVertex,fragmentShader:sparkFragment,transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false});
    return {bladeGeometry,blade,bladeWhite,bladeCore,grip,fittings,halo,haloGeometry,handMaterial,handDepthMaterial,handGeometry,gripGeometry,guardGeometry,capGeometry,collarGeometry,sparkGeometry,sparkMaterial,surfaces,texture:null as Texture|null,loaded:false,aspect:1.5,green:new Color(PALETTE.candle),white:new Color(destination)};
  },[scene]);
  useEffect(()=>{
    let disposed=false;runtime.cut.meshes+=8;runtime.cut.particles+=96;
    if(!previous)ready[scene]=false;
    try{
      const environment=prepareCeremonyStudio(renderer);
      for(const material of [resource.blade,resource.grip,resource.fittings]){material.envMap=environment;material.needsUpdate=true;}
    }catch{/* Existing scene lights keep the weapon legible if IBL preparation fails. */}
    for(const texture of Object.values(resource.surfaces))renderer.initTexture(texture);
    loadGrip().then(image=>{
      if(disposed)return;const texture=new Texture(image);texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;resource.texture=texture;
      resource.aspect=image.width/Math.max(1,image.height);resource.handMaterial.uniforms.uImage.value=texture;resource.handMaterial.uniforms.uLoaded.value=1;
      resource.handMaterial.uniforms.uAspect.value=resource.aspect;
      const lightOffset=CEREMONY_SWORD.guard.center/SUMMON_HAND_SCALE.gripping;
      resource.handMaterial.uniforms.uBladeLight.value.set(imagePivot.x+Math.cos(imagePivot.axis)*lightOffset,imagePivot.y+Math.sin(imagePivot.axis)*lightOffset*resource.aspect);
      // Warm the accepted grip and physical blade before their scheduled entrance.
      renderer.initTexture(texture);
      if(root.current)compileSmithyMaterials(renderer,root.current,camera,worldScene).then(()=>{if(!disposed){resource.loaded=true;if(!previous)ready[scene]=true;}}).catch(()=>{if(!disposed){resource.loaded=true;if(!previous)ready[scene]=true;}});
    }).catch(()=>{});
    return()=>{
      // Decoded artwork remains ready across the inherited outgoing-scene overlap.
      disposed=true;runtime.cut.meshes-=8;runtime.cut.particles-=96;
      for(const geometry of [resource.bladeGeometry,resource.haloGeometry,resource.handGeometry,resource.gripGeometry,resource.guardGeometry,resource.capGeometry,resource.collarGeometry,resource.sparkGeometry])geometry.dispose();
      for(const material of [resource.blade,resource.grip,resource.fittings,resource.halo,resource.handMaterial,resource.handDepthMaterial,resource.sparkMaterial])material.dispose();
      Object.values(resource.surfaces).forEach(texture=>texture.dispose());resource.texture?.dispose();
      if(!previous&&runtime.cut.scene===scene){runtime.cut.scene='';runtime.cut.spill=0;}
    };
  },[resource,previous,scene,renderer,camera,worldScene]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous&&state.scene===frameKey){lastFrames[frameKey]??={...p};Object.assign(lastFrames[frameKey]!,p);}
    const aspect=size.width/Math.max(1,size.height),carry=Math.max(0,Math.min(1,p.progress)),aimX=carried?p.summonTargetX+(.55-p.summonTargetX)*carry:p.summonTargetX;
    const elapsed=carried?TIMING.threshold.swordStart+TIMING.threshold.swordDuration:p.ceremonyTime;
    const pose=scene==='THRESHOLD'?openingCeremonyPose(elapsed,aspect,TIMING.threshold,aimX,p.summonTargetY):mergeCeremonyPose(p.ceremonyTime,aspect,TIMING.merge),mix=previous?1-state.params.sceneMix:state.params.sceneMix;
    if(carried)pose.opacity*=1-Math.max(0,Math.min(1,(carry-.72)/.28));
    const compact=aspect<.8;
    const visible=!state.reducedMotion&&resource.loaded&&(scene!=='THRESHOLD'||state.thresholdPhase!=='pointing')&&pose.opacity*mix>.002;
    const fov='fov' in camera?Number(camera.fov):45,halfHeight=camera.position.z*Math.tan(fov*Math.PI/360),halfWidth=halfHeight*aspect;
    const distance=Math.hypot((pose.tip[0]-pose.hilt[0])*halfWidth,(pose.tip[1]-pose.hilt[1])*halfHeight),scale=distance/swordTipLength;
    const x=pose.hilt[0]*halfWidth,y=pose.hilt[1]*halfHeight,z=0;
    const rigAngle=pose.angle-swordTipAngle;
    if(rig.current){rig.current.visible=visible;rig.current.position.set(x,y,z);rig.current.rotation.z=rigAngle;rig.current.scale.setScalar(scale);}
    if(bladeMesh.current)bladeMesh.current.scale.y=1;
    resource.blade.opacity=pose.opacity*mix;resource.grip.opacity=pose.opacity*mix;resource.fittings.opacity=pose.opacity*mix;
    resource.bladeWhite.value=pose.white;
    resource.bladeCore.value=(compact?.23:.18)+pose.white*.18;
    resource.fittings.emissive.lerpColors(resource.green,resource.white,pose.white);resource.fittings.emissiveIntensity=.018+pose.white*.022;
    resource.halo.uniforms.uOpacity.value=pose.opacity*mix;resource.halo.uniforms.uWhite.value=pose.white;
    resource.handMaterial.uniforms.uOpacity.value=pose.grip*pose.opacity*mix;resource.handMaterial.uniforms.uWhite.value=pose.white;
    resource.handMaterial.uniforms.uGain.value=compact?1.08:1.02;resource.handMaterial.uniforms.uSpill.value=pose.grip*(.55+pose.offer*.45);
    if(hand.current){
      const accepted=scene==='THRESHOLD'?openingCeremonyPose(TIMING.threshold.swordStart+TIMING.threshold.swordDuration,aspect,TIMING.threshold,aimX,p.summonTargetY):mergeCeremonyPose(TIMING.merge.swordStart+TIMING.merge.swordDuration,aspect,TIMING.merge);
      const handPose=graspAnchorPose(pose,accepted),handScale=Math.hypot((handPose.tip[0]-handPose.hilt[0])*halfWidth,(handPose.tip[1]-handPose.hilt[1])*halfHeight)/swordTipLength;
      const handX=handPose.hilt[0]*halfWidth,handY=handPose.hilt[1]*halfHeight,handZ=0;
      const width=SUMMON_HAND_SCALE.gripping*handScale,rotation=handPose.angle-swordTipAngle-imagePivot.axis,transform=handPlaneTransform(handX,handY,width,resource.aspect,rotation,[imagePivot.x,imagePivot.y],camera.position.z,handZ,.18*handScale);
      hand.current.visible=visible&&resource.loaded&&pose.grip>.001;
      hand.current.position.set(...transform.position);hand.current.scale.set(...transform.scale);hand.current.rotation.z=transform.rotation;
      if(handDepth.current){handDepth.current.visible=hand.current.visible;handDepth.current.position.copy(hand.current.position);handDepth.current.scale.copy(hand.current.scale);handDepth.current.rotation.copy(hand.current.rotation);}
    }
    if(sparks.current){sparks.current.visible=visible;sparks.current.position.set(x,y,z+.25);}
    resource.sparkMaterial.uniforms.uContact.value=scene==='THRESHOLD'?Math.max(0,Math.min(1,(p.ceremonyTime-TIMING.threshold.gripStart)/TIMING.threshold.gripDuration)):Math.max(0,Math.min(1,(p.ceremonyTime-5.17)/.65));resource.sparkMaterial.uniforms.uOpacity.value=pose.opacity*mix;resource.sparkMaterial.uniforms.uWhite.value=pose.white;
    if(!previous){runtime.cut.scene=scene;runtime.cut.spill=visible?pose.offer*(.6+pose.white*.4):0;}
    runtime.cut.uniformUploads+=4;
  },-4);
  return <group ref={root} dispose={null}>
    <group ref={rig}>
      <mesh ref={bladeMesh} geometry={resource.bladeGeometry} material={resource.blade} frustumCulled={false}/>
      <mesh geometry={resource.gripGeometry} material={resource.grip}/>
      <mesh geometry={resource.guardGeometry} material={resource.fittings} position={[CEREMONY_SWORD.guard.center,0,0]}/>
      <mesh geometry={resource.capGeometry} material={resource.fittings} position={[CEREMONY_SWORD.pommel.center,0,0]}/>
      <mesh geometry={resource.collarGeometry} material={resource.fittings} position={[(CEREMONY_SWORD.collar.start+CEREMONY_SWORD.collar.end)/2,0,0]}/>
      <mesh geometry={resource.haloGeometry} material={resource.halo} position={[3.25,.14,-.05]} frustumCulled={false}/>
    </group>
    <mesh ref={handDepth} geometry={resource.handGeometry} material={resource.handDepthMaterial} renderOrder={-1} frustumCulled={false}/>
    <mesh ref={hand} geometry={resource.handGeometry} material={resource.handMaterial} renderOrder={5} frustumCulled={false}/>
    <group ref={sparks}><points geometry={resource.sparkGeometry} material={resource.sparkMaterial} frustumCulled={false}/></group>
  </group>;
}
