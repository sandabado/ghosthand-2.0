'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { AdditiveBlending,BufferAttribute,BufferGeometry,Color,CylinderGeometry,DoubleSide,
  InstancedBufferAttribute,InstancedMesh,Matrix4,MeshBasicMaterial,ShaderMaterial,Vector2 } from 'three';
import { PALETTE } from '../../core/config';
import { input } from '../../core/input';
import { selectDrainAudit } from '../../core/director';
import { runtime,useJourney } from '../../core/world';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { Raycaster } from 'three';
import { buildDrainData,drainReleaseAt,instanceToAudit,sampleDrainPoint } from './geometry';
import { filamentFragment,filamentVertex,releaseFragment,releaseVertex } from './shaders';

/**
 * One instanced segment field, its soft envelope, and one release-particle draw.
 * All deformation consumes the shared world parameters. No clock is created here.
 */
export default function DrainField({previous=false}:{previous?:boolean}){
  const {camera,gl}=useThree();
  const lastSerial=useRef(useJourney.getState().params.pointerSerial);
  const lastRect=useRef('');
  const frozen=useRef({...useJourney.getState().params});
  const resource=useMemo(()=>{
    const data=buildDrainData(),count=data.along.length;
    const geometry=new CylinderGeometry(1,1,1,6,1,true);
    geometry.setAttribute('aAlong',new InstancedBufferAttribute(data.along,1));
    geometry.setAttribute('aAudit',new InstancedBufferAttribute(data.audit,1));
    geometry.setAttribute('aSeed',new InstancedBufferAttribute(data.seed,1));
    geometry.setAttribute('aOrder',new InstancedBufferAttribute(data.order,1));
    const uniforms=()=>({...worldUniforms(),uDrainTension:{value:0},uDrainGesture:{value:0},uDrainSnap:{value:0},uDrainDawn:{value:0},
      uDrainFocus:{value:0},uEnemy:{value:new Color(PALETTE.enemy)},uSmoke:{value:new Color(PALETTE.smoke)},
      uCandle:{value:new Color(PALETTE.candle)},uShell:{value:1},uGlow:{value:0},uSegmentSpan:{value:1/data.segments}});
    const coreMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:filamentVertex,fragmentShader:filamentFragment,transparent:true,depthWrite:false,side:DoubleSide});
    const glowMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:filamentVertex,fragmentShader:filamentFragment,transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending});
    glowMaterial.uniforms.uShell.value=1.65;glowMaterial.uniforms.uGlow.value=1;
    coreMaterial.name='GhostHandDrainFilaments';glowMaterial.name='GhostHandDrainFilamentEnvelope';
    const core=new InstancedMesh(geometry,coreMaterial,count),glow=new InstancedMesh(geometry,glowMaterial,count);
    const pickGeometry=new CylinderGeometry(3.8,3.8,1,6,1,true);
    const pickMaterial=new MeshBasicMaterial({side:DoubleSide});
    const picker=new InstancedMesh(pickGeometry,pickMaterial,count);picker.visible=false;
    const matrix=new Matrix4();
    for(let i=0;i<count;i++){
      matrix.fromArray(data.matrices,i*16);core.setMatrixAt(i,matrix);glow.setMatrixAt(i,matrix);picker.setMatrixAt(i,matrix);
    }
    core.instanceMatrix.needsUpdate=true;glow.instanceMatrix.needsUpdate=true;picker.instanceMatrix.needsUpdate=true;
    core.frustumCulled=false;glow.frustumCulled=false;picker.frustumCulled=false;
    picker.computeBoundingSphere();
    const particleGeometry=new BufferGeometry();
    particleGeometry.setAttribute('position',new BufferAttribute(data.particlePositions,3));
    particleGeometry.setAttribute('aAlong',new BufferAttribute(data.particleAlong,1));
    particleGeometry.setAttribute('aSeed',new BufferAttribute(data.particleSeed,1));
    particleGeometry.setAttribute('aOrder',new BufferAttribute(data.particleOrder,1));
    particleGeometry.setAttribute('aAudit',new BufferAttribute(data.particleAudit,1));
    const particleMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:releaseVertex,fragmentShader:releaseFragment,
      transparent:true,depthWrite:false,blending:AdditiveBlending});
    particleMaterial.name='GhostHandDrainReleaseMotes';
    return {data,count,geometry,coreMaterial,glowMaterial,core,glow,picker,pickGeometry,pickMaterial,
      particleGeometry,particleMaterial,raycaster:new Raycaster(),ndc:new Vector2()};
  },[]);
  useEffect(()=>{
    runtime.drain.instances+=resource.count*2;
    runtime.drain.filaments+=resource.data.strandsData.length;
    runtime.drain.segments+=resource.count;
    runtime.drain.particles+=resource.data.particleAlong.length;
    return()=>{
      runtime.drain.instances-=resource.count*2;
      runtime.drain.filaments-=resource.data.strandsData.length;
      runtime.drain.segments-=resource.count;
      runtime.drain.particles-=resource.data.particleAlong.length;
      runtime.drain.lastPicked=-1;runtime.drain.projectedTargets=[];runtime.drain.attached=0;runtime.drain.dissolved=0;
      resource.geometry.dispose();resource.pickGeometry.dispose();resource.particleGeometry.dispose();
      resource.coreMaterial.dispose();resource.glowMaterial.dispose();resource.pickMaterial.dispose();resource.particleMaterial.dispose();
      resource.core.dispose();resource.glow.dispose();resource.picker.dispose();
    };
  },[resource]);

  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    for(const material of [resource.coreMaterial,resource.glowMaterial,resource.particleMaterial]){
      uploadUniforms(material,p);
      material.uniforms.uSceneMix.value=previous?1-state.params.sceneMix:state.params.sceneMix;
      if(state.reducedMotion)material.uniforms.uTime.value=0;
    }
    if(!previous&&state.scene==='DRAIN'&&state.drainReleased)runtime.drain.releaseSamples++;
    if(!previous&&state.scene==='DRAIN'){
      runtime.drain.attached=resource.data.strandsData.filter(item=>drainReleaseAt(p.drainSnap,item.order,0.5/resource.data.segments)<0.05).length;
      runtime.drain.dissolved=resource.data.strandsData.filter(item=>drainReleaseAt(p.drainSnap,item.order,1-0.5/resource.data.segments)>0.98).length;
    }
    camera.updateMatrixWorld();
    const rect=gl.domElement.getBoundingClientRect();
    const signature=`${rect.left},${rect.top},${rect.width},${rect.height},${camera.position.y}`;
    if(!previous&&signature!==lastRect.current){
      lastRect.current=signature;
      runtime.drain.projectedTargets=resource.data.strandsData.map(item=>{
        const point=sampleDrainPoint(item,0.25).project(camera);
        return {strand:item.index,audit:item.audit,x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
      });
    }
    if(previous||state.scene!=='DRAIN'||state.reducedMotion||state.drainReleased)return;
    if(state.params.pointerSerial===lastSerial.current)return;
    lastSerial.current=state.params.pointerSerial;
    if(input.hover||rect.width===0||rect.height===0){
      runtime.drain.lastPicked=-1;
      if(state.drainAuditSource==='filament')selectDrainAudit(state.drainAuditIndex,'pointer');
      return;
    }
    resource.ndc.set((state.params.pointerPixelX-rect.left)/rect.width*2-1,1-(state.params.pointerPixelY-rect.top)/rect.height*2);
    if(Math.abs(resource.ndc.x)>1||Math.abs(resource.ndc.y)>1)return;
    resource.raycaster.setFromCamera(resource.ndc,camera);
    resource.picker.updateMatrixWorld(true);
    const hit=resource.raycaster.intersectObject(resource.picker,false)[0];
    if(hit?.instanceId!==undefined){
      const audit=instanceToAudit(hit.instanceId,resource.data.segments,resource.data.auditCount);
      runtime.drain.pickHits++;runtime.drain.lastPicked=audit;
      selectDrainAudit(audit,'filament');
    }else{
      runtime.drain.lastPicked=-1;
      if(state.drainAuditSource==='filament')selectDrainAudit(state.drainAuditIndex,'pointer');
    }
  },-13);
  return <group dispose={null}>
    <primitive object={resource.core}/><primitive object={resource.glow}/><primitive object={resource.picker}/>
    <points geometry={resource.particleGeometry} material={resource.particleMaterial} frustumCulled={false}/>
  </group>;
}
