'use client';

import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { BoxGeometry,Color,CylinderGeometry,ExtrudeGeometry,Group,LatheGeometry,Mesh,MeshPhysicalMaterial,MeshStandardMaterial,Shape,SplineCurve,TorusGeometry,TorusKnotGeometry,Vector2,type BufferGeometry,type Material } from 'three';
import { PALETTE } from '../../core/config';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { createRelicSurfaceTextures,getPreparedSmithyEnvironment } from './materials';
import { compileSmithyMaterials,prepareSmithyShadows } from './shader-warmup';

let lastCommission:WorldParams|null=null;
const positions:[[number,number,number],[number,number,number],[number,number,number]]=[[3.3,.72,-2.3],[3.45,.35,-2.7],[3.15,.37,-2.4]];

/** Three authored material studies: one core, one closed vessel, and three relay tokens. */
export default function FloatingRelics({previous=false}:{previous?:boolean}){
  const size=useThree(state=>state.size),frozen=useRef<WorldParams>({...lastCommission??useJourney.getState().params});
  const renderer=useThree(state=>state.gl),camera=useThree(state=>state.camera),worldScene=useThree(state=>state.scene),root=useRef<Group>(null),disposed=useRef(false);
  const resource=useMemo(()=>{
    const geometries:BufferGeometry[]=[],materials:Material[]=[],textures=createRelicSurfaceTextures();
    const ownGeometry=<T extends BufferGeometry>(geometry:T)=>{geometries.push(geometry);return geometry;};
    const ownMaterial=<T extends Material>(material:T)=>{materials.push(material);return material;};
    const metal=()=>ownMaterial(new MeshPhysicalMaterial({color:PALETTE.smoke,metalness:.94,roughness:.28,bumpMap:textures.brushed,bumpScale:.0018,roughnessMap:textures.brushed,envMapIntensity:1.25,clearcoat:.18}));
    const edge=()=>ownMaterial(new MeshPhysicalMaterial({color:new Color(PALETTE.bone).multiplyScalar(.62),metalness:.96,roughness:.19,bumpMap:textures.brushed,bumpScale:.0008,envMapIntensity:1.1}));
    const etch=()=>ownMaterial(new MeshStandardMaterial({color:PALETTE.candleDim,emissive:PALETTE.candleDim,emissiveIntensity:.035,metalness:.6,roughness:.5}));
    const mesh=(group:Group,geometry:BufferGeometry,material:Material,position:[number,number,number]=[0,0,0],rotation:[number,number,number]=[0,0,0])=>{
      const object=new Mesh(geometry,material);object.position.set(...position);object.rotation.set(...rotation);object.castShadow=true;object.receiveShadow=true;group.add(object);return object;
    };
    const rounded=(width:number,height:number,depth:number,bevel:number)=>{
      const shape=new Shape();shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height/2);shape.lineTo(-width/2,height/2);shape.closePath();
      const geometry=ownGeometry(new ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:4,steps:1}));geometry.translate(0,0,-depth/2);return geometry;
    };
    const groups=[new Group(),new Group(),new Group()];groups.forEach((group,i)=>{group.name=['GhostHandInstrumentCore','GhostHandClosedMemoryVessel','GhostHandRelayFamily'][i];});
    const coreEdge=edge();
    const glass=ownMaterial(new MeshPhysicalMaterial({color:PALETTE.bone,metalness:0,roughness:.045,transmission:.98,thickness:.34,ior:1.47,clearcoat:1,clearcoatRoughness:.035,attenuationColor:new Color(PALETTE.candleDim).lerp(new Color(PALETTE.bone),.65),attenuationDistance:5,envMapIntensity:1.9}));
    glass.name='GhostHandFoldedRefractiveGlass';
    const fold=ownGeometry(new TorusKnotGeometry(.51,.165,160,24,2,3));
    mesh(groups[0],fold,glass,[0,.05,0],[.28,.15,.16]).castShadow=false;
    const inner=ownGeometry(new TorusGeometry(.32,.027,12,80));mesh(groups[0],inner,coreEdge,[0,.05,0],[.5,-.2,.1]);
    const slot=ownGeometry(new BoxGeometry(.32,.018,.012));

    const vesselMetal=metal(),vesselEdge=edge(),vesselEtch=etch();
    const vesselProfile=[new Vector2(0,-.51),new Vector2(.2,-.51),new Vector2(.32,-.44),new Vector2(.36,-.2),new Vector2(.32,.27),new Vector2(.23,.43),new Vector2(.23,.48),new Vector2(0,.48)];
    const vessel=ownGeometry(new LatheGeometry(new SplineCurve(vesselProfile).getPoints(40),56));
    const stone=ownMaterial(new MeshPhysicalMaterial({color:new Color(PALETTE.smoke).lerp(new Color(PALETTE.bone),.24),roughness:.39,metalness:.08,bumpMap:textures.mineral,bumpScale:.006,clearcoat:.68,clearcoatRoughness:.22,envMapIntensity:1.2}));
    mesh(groups[1],vessel,stone);
    const glaze=ownMaterial(new MeshPhysicalMaterial({color:PALETTE.bone,transparent:true,opacity:.11,roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.1,depthWrite:false}));
    const shell=mesh(groups[1],vessel,glaze);shell.scale.setScalar(1.018);shell.renderOrder=2;
    const lid=ownGeometry(new CylinderGeometry(.26,.27,.09,40));mesh(groups[1],lid,vesselMetal,[0,.5,0]);
    const foot=ownGeometry(new CylinderGeometry(.235,.26,.065,40));mesh(groups[1],foot,vesselEdge,[0,-.51,0]);
    const latitude=ownGeometry(new TorusGeometry(1,.025,6,48));
    mesh(groups[1],latitude,vesselEtch,[0,-.18,0],[Math.PI/2,0,0]).scale.setScalar(.367);
    mesh(groups[1],latitude,vesselEtch,[0,.12,0],[Math.PI/2,0,0]).scale.setScalar(.335);
    const capRing=ownGeometry(new TorusGeometry(.18,.012,6,40));mesh(groups[1],capRing,vesselEtch,[0,.55,0],[Math.PI/2,0,0]);

    const tokenMetal=metal(),tokenEdge=edge(),tokenEtch=etch(),token=rounded(.36,.48,.105,.038);
    const tokenInset=ownGeometry(new TorusGeometry(.09,.006,8,40));
    const tokenPip=ownGeometry(new CylinderGeometry(.037,.037,.014,16));
    for(let i=0;i<3;i++){
      const group=new Group();group.position.set((i-1)*.47,i===1?.12:-.1,i===1?.08:0);group.rotation.z=(i-1)*-.09;groups[2].add(group);
      mesh(group,token,tokenMetal);mesh(group,tokenInset,tokenEtch,[0,.055,.1]);
      mesh(group,tokenPip,tokenEdge,[0,.055,.112],[Math.PI/2,0,0]);
      const notch=mesh(group,slot,tokenEtch,[0,-.13,.102]);notch.scale.x=.5;
    }
    const alpha=new Map<Material,number>();materials.forEach(material=>{alpha.set(material,material.opacity);material.transparent=true;});
    let meshes=0;groups.forEach(group=>group.traverse(object=>{if(object instanceof Mesh)meshes++;}));
    return {groups,geometries,materials,textures,alpha,meshes,warmStarted:false,warmed:false,shadowWarmup:null as ReturnType<typeof prepareSmithyShadows>|null};
  },[]);
  useEffect(()=>{
    disposed.current=false;
    runtime.smithy.meshes+=resource.meshes;
    return()=>{disposed.current=true;runtime.smithy.meshes-=resource.meshes;runtime.smithy.floatingObjects=0;resource.shadowWarmup?.dispose();resource.geometries.forEach(geometry=>geometry.dispose());resource.materials.forEach(material=>material.dispose());Object.values(resource.textures).forEach(texture=>texture.dispose());};
  },[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous&&state.scene==='COMMISSION'){lastCommission??={...p};Object.assign(lastCommission,p);}
    const mix=previous?1-state.params.sceneMix:state.params.sceneMix;
    const environment=getPreparedSmithyEnvironment(worldScene,'COMMISSION');
    if(!resource.warmStarted&&environment&&root.current&&mix>.005&&(previous||!state.previousScene)){
      resource.warmStarted=true;
      for(const material of resource.materials)if(material instanceof MeshStandardMaterial){material.envMap=environment;material.needsUpdate=true;}
      Object.values(resource.textures).forEach(texture=>renderer.initTexture(texture));
      resource.shadowWarmup=prepareSmithyShadows(root.current);
      Promise.all([compileSmithyMaterials(renderer,root.current,camera,worldScene),compileSmithyMaterials(renderer,resource.shadowWarmup.group,camera,worldScene)])
        .catch(()=>{}).finally(()=>{if(!disposed.current)resource.warmed=true;});
    }
    if(root.current)root.current.visible=resource.warmed;
    const active=resource.warmed&&(previous||state.scene==='COMMISSION')&&!state.reducedMotion;
    const compact=size.width<760,focus=Math.max(0,Math.min(2,p.smithyFocus)),selected=Math.round(focus);
    resource.groups.forEach((group,index)=>{
      group.visible=active&&index===selected;
      const attention=Math.exp(-Math.abs(focus-index)*3),time=previous?p.time:state.params.time;
      if(compact)group.position.set(.9,-1.22+Math.sin(time*.36+index)*.055,-2.6);
      else{const at=positions[index];group.position.set(at[0],at[1]+Math.sin(time*.32+index*2)*.065+attention*.08,at[2]+Math.sin(time*.21+index)*.08);}
      group.rotation.set(.12+Math.sin(time*.16+index)*.09,.32+Math.sin(time*.12+index)*.24,(index-1)*.045);
      group.scale.setScalar((compact?.94:1.5)*(.9+attention*.12));
    });
    resource.materials.forEach(material=>{material.opacity=(resource.alpha.get(material)??1)*mix;});
    if(!previous)runtime.smithy.floatingObjects=active?(selected===2?3:1):0;
  },-4);
  return <group ref={root} visible={false} dispose={null}>{resource.groups.map(group=><primitive key={group.uuid} object={group}/>)}</group>;
}
