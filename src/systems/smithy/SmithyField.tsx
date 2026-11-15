'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { AdditiveBlending,Box3,BoxGeometry,BufferAttribute,BufferGeometry,Color,CylinderGeometry,DoubleSide,Group,InstancedBufferAttribute,InstancedMesh,Matrix4,MeshPhysicalMaterial,PlaneGeometry,PMREMGenerator,PointLight,Quaternion,ShaderMaterial,ShadowMaterial,SpotLight,SRGBColorSpace,Texture,TextureLoader,Vector3,WebGLRenderTarget } from 'three';
import { PALETTE } from '../../core/config';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { renderQualityState } from '../../core/render-quality';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { buildSmithyData,buildSwordProfile,SMITHY_PAPERS,type SmithyScene } from './geometry';
import { CEREMONY_SWORD,buildCeremonySwordProfile,createCeremonyCollar,createCeremonyGrip,createCeremonyGuard,createCeremonyPommel } from '../cut/sword-geometry';
import { createCeremonyBladeMaterial,createCeremonyFittingsMaterial,createCeremonyGripMaterial } from '../cut/sword-materials';
import { restingSwordFrame,type RestingSwordFrame } from './sword-framing';
import { smithyBarFragment,smithyBarVertex,smithyParticleFragment,smithyParticleVertex,smithyPlateFragment,smithyPlateVertex,smithyPoolFragment,smithySurfaceVertex } from './shaders';
import { claimSmithyEnvironment,createCatalogueTexture,createPaperMaterial,createSmithyReflectionEnvironment,createSmithySurfaceTextures,prepareSmithyEnvironment,releaseSmithyEnvironment } from './materials';
import { compileSmithyMaterials,prepareSmithyShadows } from './shader-warmup';

const lastFrames:Partial<Record<SmithyScene,WorldParams>>={};

/** Physical foreground and photographic surroundings share the existing Canvas and grade. */
export default function SmithyField({scene,previous=false}:{scene:SmithyScene;previous?:boolean}){
  const exploring=useJourney(state=>state.commissionExploring);
  const size=useThree(state=>state.size),camera=useThree(state=>state.camera),renderer=useThree(state=>state.gl),worldScene=useThree(state=>state.scene),sword=useRef<Group>(null);
  const room=useRef<Group>(null),key=useRef<SpotLight>(null),rim=useRef<PointLight>(null);
  const frozen=useRef<WorldParams>({...lastFrames[scene]??useJourney.getState().params});
  const resource=useMemo(()=>{
    const data=buildSmithyData(scene),profile=buildCeremonySwordProfile(buildSwordProfile(scene==='OATH'));
    const uniforms=()=>({...worldUniforms(),uSceneMode:{value:scene==='OATH'?1:0},uPlateLoaded:{value:0},
      uSmithyScroll:{value:0},uSmithyUnroll:{value:0},uSmithyOffer:{value:0},uSmithyFocus:{value:0},
      uCommissionStroke:{value:0},uCommissionPress:{value:0},uCommissionImpact:{value:0},uCommissionBloom:{value:0},
      uOathTime:{value:0},uOathRest:{value:0},uOathGather:{value:1},uOathScroll:{value:0},uBlood:{value:new Color(PALETTE.blood)}});
    const structureGeometry=new BoxGeometry(1,1,1);
    for(const key of ['kind','seed','station'] as const)structureGeometry.setAttribute(`a${key[0].toUpperCase()}${key.slice(1)}`,new InstancedBufferAttribute(data[key],1));
    const structureMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:smithyBarVertex,fragmentShader:smithyBarFragment,transparent:true});structureMaterial.name=`GhostHand${scene}Stone`;
    const structure=new InstancedMesh(structureGeometry,structureMaterial,data.bars),matrix=new Matrix4();
    for(let i=0;i<data.bars;i++){matrix.fromArray(data.matrices,i*16);structure.setMatrixAt(i,matrix);}structure.instanceMatrix.needsUpdate=true;structure.frustumCulled=false;
    const profileGeometry=new BufferGeometry();profileGeometry.setAttribute('position',new BufferAttribute(profile.positions,3));profileGeometry.setAttribute('uv',new BufferAttribute(profile.uv,2));profileGeometry.setIndex(new BufferAttribute(profile.indices,1));profileGeometry.computeVertexNormals();
    const textures=createSmithySurfaceTextures();
    const body=scene==='OATH'?new MeshPhysicalMaterial({color:PALETTE.void,metalness:.12,roughness:.24,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.6,bumpMap:textures.roughness,bumpScale:.004,transparent:true}):createCeremonyBladeMaterial(textures.roughness).material;
    if(scene==='OATH')body.name='GhostHandClosedLacquerScabbard';
    const hilt=createCeremonyGripMaterial(textures.wrap),metal=createCeremonyFittingsMaterial();
    metal.emissive.set(PALETTE.candle);metal.emissiveIntensity=.018;
    const swordMaterials=[body,hilt,metal];
    const hiltGeometry=createCeremonyGrip(),guardGeometry=createCeremonyGuard(),buttGeometry=createCeremonyPommel(),collarGeometry=createCeremonyCollar();
    const restBounds=new Box3(),boundsTransform=new Matrix4();
    for(const [geometry,x] of [[profileGeometry,0],[hiltGeometry,0],[guardGeometry,CEREMONY_SWORD.guard.center],[buttGeometry,CEREMONY_SWORD.pommel.center],[collarGeometry,(CEREMONY_SWORD.collar.start+CEREMONY_SWORD.collar.end)/2]] as const){
      geometry.computeBoundingBox();boundsTransform.makeTranslation(x,0,0);restBounds.union(geometry.boundingBox!.clone().applyMatrix4(boundsTransform));
    }
    restBounds.applyMatrix4(boundsTransform.makeRotationZ(-.05));
    const paperGeometry=new PlaneGeometry(2.15,3.3,12,48),catalogueTextures=scene==='COMMISSION'?SMITHY_PAPERS.map((_,index)=>createCatalogueTexture(index)):[];
    const paperResources=catalogueTextures.map(texture=>createPaperMaterial(texture,textures.paperFibre)),papers=paperResources.map(resource=>resource.material);
    const rollerGeometry=scene==='COMMISSION'?new CylinderGeometry(.055,.055,2.35,24):null;
    const rollers=rollerGeometry?new InstancedMesh(rollerGeometry,metal,6):null;if(rollers)rollers.frustumCulled=false;
    const particleGeometry=new BufferGeometry();particleGeometry.setAttribute('position',new BufferAttribute(data.particlePositions,3));particleGeometry.setAttribute('aTarget',new BufferAttribute(data.particleTargets,3));particleGeometry.setAttribute('aKind',new BufferAttribute(data.particleKind,1));particleGeometry.setAttribute('aSeed',new BufferAttribute(data.particleSeed,1));
    const particles=new ShaderMaterial({uniforms:uniforms(),vertexShader:smithyParticleVertex,fragmentShader:smithyParticleFragment,transparent:true,depthWrite:false,blending:AdditiveBlending});particles.name=`GhostHand${scene}LocalMotes`;
    const poolGeometry=new PlaneGeometry(scene==='OATH'?10:8,8),poolMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:smithySurfaceVertex,fragmentShader:smithyPoolFragment,transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending});poolMaterial.name=`GhostHand${scene}FloorLight`;
    const shadowGeometry=new PlaneGeometry(18,15),shadowMaterial=new ShadowMaterial({color:PALETTE.void,transparent:true,opacity:.42,depthWrite:false});
    const plateGeometry=new PlaneGeometry(2,2),plateMaterial=new ShaderMaterial({uniforms:{...uniforms(),uPlate:{value:null},uViewAspect:{value:1},uImageAspect:{value:16/9}},vertexShader:smithyPlateVertex,fragmentShader:smithyPlateFragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});plateMaterial.name=`GhostHand${scene}PhotographicSurroundings`;
    return {data,profile,structureGeometry,structureMaterial,structure,profileGeometry,hiltGeometry,guardGeometry,buttGeometry,collarGeometry,swordMaterials,
      restInput:{aspect:1.44,imageAspect:16/9,fov:45,cameraZ:8,span:restBounds.max.x-restBounds.min.x,centerX:(restBounds.min.x+restBounds.max.x)/2,rest:1},restFrame:{position:[0,0,-4.5],scale:1,rotation:-.05,width:.9} as RestingSwordFrame,
      paperGeometry,papers,paperResources,catalogueTextures,textures,rollerGeometry,rollers,particleGeometry,particles,poolGeometry,poolMaterial,plateGeometry,plateMaterial,
      shadowGeometry,shadowMaterial,plateTexture:null as Texture|null,plateLoaded:false,environmentTarget:null as WebGLRenderTarget|null,environmentOwner:Symbol(`smithy-${scene}`),
      warmed:false,warmStarted:false,warm:null as (()=>void)|null,shadowWarmup:null as ReturnType<typeof prepareSmithyShadows>|null,environmentClaimed:false,
      materials:[structureMaterial,particles,poolMaterial,plateMaterial],rollerMatrix:new Matrix4(),rollerRotation:new Quaternion(),rollerPosition:new Vector3(),rollerScale:new Vector3(1,1,1),
      rollerAxes:SMITHY_PAPERS.map(({yaw})=>new Vector3(Math.cos(yaw),0,-Math.sin(yaw))),rollerUp:new Vector3(0,1,0)};
  },[scene]);
  useEffect(()=>{
    let disposed=false;const meshes=scene==='COMMISSION'?13:9,shadow=key.current?.shadow;
    runtime.smithy.meshes+=meshes;runtime.smithy.paperSheets+=resource.data.paperSheets;runtime.smithy.particles+=resource.data.particleSeed.length;
    const generator=new PMREMGenerator(renderer);generator.compileEquirectangularShader();
    const prepare=()=>{
      resource.warm=()=>{
        if(disposed||!room.current||resource.warmStarted)return;resource.warmStarted=true;
        resource.shadowWarmup=prepareSmithyShadows(room.current);
        for(const texture of [...Object.values(resource.textures),...resource.catalogueTextures])renderer.initTexture(texture);
        const root=room.current,depth=resource.shadowWarmup.group;
        const compile=async()=>{
          // Keep both the inherited overlap and settled transmission-source plate ready.
          resource.plateMaterial.transparent=true;
          await Promise.all([compileSmithyMaterials(renderer,root,camera,worldScene),compileSmithyMaterials(renderer,depth,camera,worldScene)]);
          if(disposed)return;resource.plateMaterial.transparent=false;
          await compileSmithyMaterials(renderer,root,camera,worldScene);
        };
        compile().catch(()=>{}).finally(()=>{if(!disposed)resource.warmed=true;});
      };
    };
    const path=scene==='COMMISSION'?'/smithy-v8/commission-environment.webp':'/smithy-v8/oath-environment.webp';
    resource.plateTexture=new TextureLoader().load(path,texture=>{
      if(disposed){texture.dispose();return;}
      texture.colorSpace=SRGBColorSpace;const image=texture.image as {width:number;height:number};
      resource.plateMaterial.uniforms.uPlate.value=texture;resource.plateMaterial.uniforms.uImageAspect.value=image.width/Math.max(1,image.height);resource.plateLoaded=true;
      renderer.initTexture(texture);const reflection=createSmithyReflectionEnvironment(texture);
      try{
        resource.environmentTarget=generator.fromEquirectangular(reflection);
        const environment=resource.environmentTarget.texture;
        for(const material of [...resource.swordMaterials,...resource.papers]){material.envMap=environment;material.needsUpdate=true;}
        prepareSmithyEnvironment(worldScene,resource.environmentOwner,scene,environment);
      }catch{resource.environmentTarget?.dispose();resource.environmentTarget=null;}
      finally{reflection.dispose();generator.dispose();prepare();}
    },undefined,()=>{resource.plateLoaded=false;generator.dispose();prepare();});
    return()=>{
      disposed=true;runtime.smithy.meshes-=meshes;runtime.smithy.paperSheets-=resource.data.paperSheets;runtime.smithy.particles-=resource.data.particleSeed.length;
      if(!previous&&runtime.smithy.scene===scene){runtime.smithy.scene='';runtime.smithy.plateLoaded=false;}
      releaseSmithyEnvironment(worldScene,resource.environmentOwner);resource.environmentTarget?.dispose();shadow?.dispose();
      generator.dispose();resource.shadowWarmup?.dispose();resource.warm=null;
      resource.structureGeometry.dispose();resource.structureMaterial.dispose();resource.structure.dispose();resource.profileGeometry.dispose();resource.hiltGeometry.dispose();resource.guardGeometry.dispose();resource.buttGeometry.dispose();resource.collarGeometry.dispose();resource.swordMaterials.forEach(material=>material.dispose());
      resource.paperGeometry.dispose();resource.papers.forEach(material=>material.dispose());resource.catalogueTextures.forEach(texture=>texture.dispose());Object.values(resource.textures).forEach(texture=>texture.dispose());resource.rollerGeometry?.dispose();resource.rollers?.dispose();
      resource.particleGeometry.dispose();resource.particles.dispose();resource.poolGeometry.dispose();resource.poolMaterial.dispose();resource.shadowGeometry.dispose();resource.shadowMaterial.dispose();resource.plateGeometry.dispose();resource.plateMaterial.dispose();resource.plateTexture?.dispose();
    };
  },[resource,scene,previous,renderer,worldScene,camera]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous&&state.scene===scene){lastFrames[scene]??={...p};Object.assign(lastFrames[scene]!,p);}
    const mix=previous?1-state.params.sceneMix:state.params.sceneMix,compact=size.width/Math.max(1,size.height)<.8;
    for(const material of resource.materials){uploadUniforms(material,p);material.uniforms.uSceneMix.value=mix;material.uniforms.uPlateLoaded.value=resource.plateLoaded?1:0;if(state.reducedMotion)material.uniforms.uTime.value=0;runtime.smithy.uniformUploads++;}
    resource.swordMaterials.forEach(material=>{material.opacity=mix;});
    resource.shadowMaterial.opacity=.42*mix;
    resource.paperResources.forEach(({material,unroll},index)=>{unroll.value=p.smithyUnroll;material.opacity=mix*(.57+Math.exp(-Math.abs(p.smithyFocus-index)*3)*.2);});
    if(resource.rollers){
      SMITHY_PAPERS.forEach(({position:[x,y,z]},index)=>{
        resource.rollerRotation.setFromUnitVectors(resource.rollerUp,resource.rollerAxes[index]);
        for(let part=0;part<2;part++){
          resource.rollerPosition.set(x,y+1.72-(part?3.44*p.smithyUnroll:0),z);
          resource.rollerMatrix.compose(resource.rollerPosition,resource.rollerRotation,resource.rollerScale);resource.rollers!.setMatrixAt(index*2+part,resource.rollerMatrix);
        }
      });resource.rollers.instanceMatrix.needsUpdate=true;
    }
    if(key.current){key.current.castShadow=!previous&&renderQualityState.current.shadow;key.current.intensity=mix*(scene==='OATH'?75:105);key.current.target.position.set(scene==='OATH'?1:2,-1.4,-4);key.current.target.updateMatrixWorld();}
    if(rim.current)rim.current.intensity=mix*7;
    resource.plateMaterial.uniforms.uViewAspect.value=size.width/Math.max(1,size.height);
    // A settled plate participates in Three's normal transmission source buffer.
    // During the inherited overlap it remains alpha blended with the outgoing room.
    resource.plateMaterial.transparent=mix<.999;
    // The outgoing Dojo has another point light; compile after its overlap retires.
    if(mix>.005&&(previous||!state.previousScene)&&!resource.warmStarted)resource.warm?.();
    if(room.current)room.current.visible=resource.warmed;
    if(resource.warmed&&!previous&&!state.previousScene&&state.scene===scene&&resource.environmentTarget&&!resource.environmentClaimed){
      claimSmithyEnvironment(worldScene,resource.environmentOwner,resource.environmentTarget.texture);resource.environmentClaimed=true;
    }
    if(sword.current){
      if(scene==='COMMISSION'){
        const offer=state.reducedMotion?1:p.smithyOffer;
        sword.current.position.set(compact?-.65:1.2,compact?-.5:-.05,-1.5+offer*2.7);
        sword.current.rotation.set(0,.68,-.08);sword.current.scale.setScalar(compact?.52:1);
      }else{
        // The photographed support stays fixed; project its prongs into the same world plane.
        const input=resource.restInput;input.aspect=size.width/Math.max(1,size.height);input.imageAspect=resource.plateMaterial.uniforms.uImageAspect.value as number;input.fov='fov' in camera?Number(camera.fov):45;input.cameraZ=camera.position.z;input.rest=p.oathRest;
        const frame=restingSwordFrame(input,resource.restFrame);
        sword.current.position.set(...frame.position);sword.current.rotation.set(0,0,frame.rotation);sword.current.scale.setScalar(frame.scale);
      }
    }
    if(!previous){runtime.smithy.scene=scene;runtime.smithy.selected=state.selectedRelic;runtime.smithy.plateLoaded=resource.plateLoaded;}
  },-4);
  return <group dispose={null}>
    <group ref={room} visible={false}>
    <mesh geometry={resource.plateGeometry} material={resource.plateMaterial} renderOrder={-99} frustumCulled={false}/>
    <primitive object={resource.structure}/>
    <group ref={sword}>
      <mesh geometry={resource.profileGeometry} material={resource.swordMaterials[0]} castShadow receiveShadow frustumCulled={false}/>
      <mesh geometry={resource.hiltGeometry} material={resource.swordMaterials[1]} castShadow receiveShadow/>
      <mesh geometry={resource.guardGeometry} material={resource.swordMaterials[2]} castShadow receiveShadow position={[CEREMONY_SWORD.guard.center,0,0]}/>
      <mesh geometry={resource.buttGeometry} material={resource.swordMaterials[2]} castShadow receiveShadow position={[CEREMONY_SWORD.pommel.center,0,0]}/>
      <mesh geometry={resource.collarGeometry} material={resource.swordMaterials[2]} castShadow receiveShadow position={[(CEREMONY_SWORD.collar.start+CEREMONY_SWORD.collar.end)/2,0,0]}/>
    </group>
    <group visible={exploring}>
      {resource.papers.map((material,index)=><mesh key={index} geometry={resource.paperGeometry} material={material} receiveShadow position={SMITHY_PAPERS[index].position} rotation={[0,SMITHY_PAPERS[index].yaw,0]} frustumCulled={false}/>)}
      {resource.rollers&&<primitive object={resource.rollers}/>}
    </group>
    <points geometry={resource.particleGeometry} material={resource.particles} frustumCulled={false}/>
    <mesh geometry={resource.poolGeometry} material={resource.poolMaterial} rotation={[-Math.PI/2,0,0]} position={[scene==='OATH'?0:2.2,-2.49,-5]} frustumCulled={false}/>
    <mesh geometry={resource.shadowGeometry} material={resource.shadowMaterial} rotation={[-Math.PI/2,0,0]} position={[2,-2.475,-5]} receiveShadow/>
    </group>
    <spotLight ref={key} position={[3.5,6.2,4.5]} color={PALETTE.bone} intensity={scene==='OATH'?75:105} distance={32} decay={2} angle={.54} penumbra={.72} castShadow={!previous} shadow-mapSize={[512,512]} shadow-bias={-.00015} shadow-normalBias={.025} shadow-radius={2.5}/>
    <pointLight ref={rim} position={[-3.5,1.5,-1]} color={PALETTE.candleDim} intensity={7} distance={20} decay={2}/>
  </group>;
}
