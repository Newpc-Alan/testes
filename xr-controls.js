'use strict';
// Read the session's native target-ray spaces and xr-standard gamepads.
// No controller model, remote profile download or synthetic cursor is required.
window.PortalXRControls=class PortalXRControls {
  constructor(scene,actions){
    this.scene=scene;this.actions=actions;this.xr=scene.renderer.xr;
    this.THREE=AFRAME.THREE;this.ray=new this.THREE.Raycaster();this.ray.far=15;
    this.direction=new this.THREE.Vector3();this.rotation=new this.THREE.Matrix4();
    this.previous=new Map();this.session=null;this.zoomElapsed=0;this.rotating=false;this.count=-1;
    this.slots=[0,1].map(index=>{
      const group=this.xr.getController(index);
      const geometry=new this.THREE.BufferGeometry().setFromPoints([
        new this.THREE.Vector3(0,0,0),new this.THREE.Vector3(0,0,-1)
      ]);
      const line=new this.THREE.Line(geometry,new this.THREE.LineBasicMaterial({color:0x78dfde,transparent:true,opacity:.85}));
      const dot=new this.THREE.Mesh(new this.THREE.SphereGeometry(.018,10,8),new this.THREE.MeshBasicMaterial({color:0x78dfde}));
      line.scale.z=6;group.add(line,dot);scene.object3D.add(group);
      const slot={group,line,dot,source:null,hover:null};
      group.addEventListener('connected',event=>{slot.source=event.data;this.refresh();});
      group.addEventListener('disconnected',()=>{this.clearHover(slot);this.previous.delete(slot.source);slot.source=null;this.refresh();});
      group.addEventListener('selectstart',()=>this.activate(slot));
      return slot;
    });
    this.refresh();
  }
  clearHover(slot){if(slot.hover)slot.hover.emit('mouseleave');slot.hover=null;}
  reset(){
    this.previous.clear();this.rotating=false;this.zoomElapsed=0;
    for(const slot of this.slots){this.clearHover(slot);slot.source=null;slot.line.visible=false;slot.dot.visible=false;}
    this.refresh();
  }
  refresh(){
    const session=this.xr.getSession();
    const live=this.slots.filter(s=>s.source?.targetRayMode==='tracked-pointer'&&session);
    const count=live.filter(s=>!s.source.hand).length;
    if(count!==this.count){this.count=count;this.actions.status(count);}
    this.actions.gaze(live.length===0);
  }
  pick(slot){
    if(!slot.source||!slot.group.visible)return null;
    this.scene.object3D.updateMatrixWorld(true);
    this.ray.ray.origin.setFromMatrixPosition(slot.group.matrixWorld);
    this.rotation.extractRotation(slot.group.matrixWorld);
    this.ray.ray.direction.set(0,0,-1).applyMatrix4(this.rotation).normalize();
    const meshes=[];
    for(const el of this.scene.querySelectorAll('.target')){
      const mesh=el.getObject3D('mesh');
      let visible=!!mesh;
      for(let o=mesh;o;o=o.parent)if(!o.visible){visible=false;break;}
      if(visible)meshes.push(mesh);
    }
    const hit=this.ray.intersectObjects(meshes,true)[0];
    if(!hit)return null;
    let object=hit.object;
    while(object&&!object.userData.uiTarget)object=object.parent;
    return object?{el:object.userData.uiTarget,distance:hit.distance}:null;
  }
  activate(slot){
    if(!this.xr.getSession())return;
    const hit=this.pick(slot);
    if(!hit||!hit.el.classList.contains('target'))return;
    hit.el.emit('click',{inputSource:slot.source});
    slot.source.gamepad?.hapticActuators?.[0]?.pulse(.2,35)?.catch?.(()=>{});
  }
  tick(delta){
    const session=this.xr.getSession();
    if(session!==this.session){this.session=session;this.previous.clear();this.refresh();}
    const wasRotating=this.rotating;this.rotating=false;
    if(!session||session.visibilityState&&session.visibilityState!=='visible')return;
    const dt=Math.min(50,delta||0)/1000;
    const sources=Array.from(session.inputSources||[]).filter(s=>s.gamepad&&!s.hand);
    const primary=sources.find(s=>s.handedness==='right')||sources[0];
    this.zoomElapsed+=dt;
    for(const source of sources){
      const pad=source.gamepad,buttons=Array.from(pad.buttons,b=>!!b.pressed);
      const previous=this.previous.get(source)||[];
      if(source===primary){
        if(buttons[4]&&!previous[4])this.actions.primary();
        if(buttons[5]&&!previous[5])this.actions.back();
        if(buttons[3]&&!previous[3])this.actions.reset();
        // xr-standard reserves axes 0/1 for a touchpad and 2/3 for the stick.
        const offset=pad.axes.length>=4?2:0;
        const x=Number(pad.axes[offset])||0,y=Number(pad.axes[offset+1])||0;
        if(Math.abs(x)>.22&&this.actions.canRotate()){
          if(!wasRotating)this.actions.beginRotation();
          this.rotating=true;this.actions.rotate(x*45*dt);
        }
        if(this.zoomElapsed>=.1&&Math.abs(y)>.35)this.actions.zoom(-y*.06);
      }
      // The browser mutates Gamepad objects in place. Copy booleans, not the object.
      this.previous.set(source,buttons);
    }
    if(this.zoomElapsed>=.1)this.zoomElapsed=0;
    for(const source of this.previous.keys())if(!sources.includes(source))this.previous.delete(source);
    for(const slot of this.slots){
      const active=!!slot.source&&slot.group.visible;
      slot.line.visible=active;slot.dot.visible=active;
      const hit=active?this.pick(slot):null;
      if(slot.hover!==hit?.el){this.clearHover(slot);if(hit){slot.hover=hit.el;hit.el.emit('mouseenter');}}
      const distance=hit?.distance||6;
      slot.line.scale.z=distance;slot.dot.position.z=-distance;
      slot.line.material.color.setHex(hit?0xffa899:0x78dfde);
      slot.dot.material.color.copy(slot.line.material.color);
    }
  }
};
