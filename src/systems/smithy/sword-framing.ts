export interface RestingSwordFrameInput {aspect:number;imageAspect:number;fov:number;cameraZ:number;span:number;centerX:number;rest:number}
export interface RestingSwordFrame {position:[number,number,number];scale:number;rotation:number;width:number}
const finite=(value:number,fallback:number)=>Number.isFinite(value)?value:fallback;
/** Fit the whole canonical weapon prominently, without clipping a portrait ending. */
export function restingSwordFrame(input:RestingSwordFrameInput,out:RestingSwordFrame={position:[0,0,-4.5],scale:1,rotation:-.05,width:.9}){
  const aspect=Math.max(.1,finite(input.aspect,1.44)),imageAspect=Math.max(.1,finite(input.imageAspect,16/9));
  const fov=Math.max(10,Math.min(120,finite(input.fov,45))),cameraZ=Math.max(.1,finite(input.cameraZ,8));
  const span=Math.max(.1,finite(input.span,6.42)),centerX=finite(input.centerX,2.29),rest=Math.max(0,Math.min(1,finite(input.rest,1)));
  const compact=aspect<.8,z=-4.5,halfHeight=(cameraZ-z)*Math.tan(fov*Math.PI/360),halfWidth=halfHeight*aspect;
  const cropX=Math.min(1,aspect/imageAspect),cropY=Math.min(1,imageAspect/aspect),imageHeight=aspect/imageAspect;
  const width=compact?.92:.9,scale=width*2*halfWidth/span;
  const targetX=compact?.03:.03/cropX,targetY=compact?2*(.31-.02*imageHeight)-1:-.04/cropY;
  out.position[0]=targetX*halfWidth-centerX*scale;out.position[1]=targetY*halfHeight+.19*scale+(1-rest)*.14;out.position[2]=z;
  out.scale=scale;out.rotation=-.05;out.width=width;return out;
}
