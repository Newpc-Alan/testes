'use strict';
(()=>{
 const App=window.Pantanal,Media=window.PantanalMedia,$=id=>document.getElementById(id);let vr=null,loading=false,supported=false,available=false,lastNavigate=0;
 const SCREEN={width:4.8,height:2.7,y:1.6,z:-6};
 function entity(tag,attrs,parent){const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;}
 function loadEngine(){if(window.AFRAME)return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');const timer=setTimeout(()=>{script.remove();reject(new Error('A biblioteca VR demorou a carregar'));},30000);script.src='vendor/aframe.min.js';script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Biblioteca VR indisponível'));};document.head.append(script);});}
 function panel(parent,id,width,height,x,y,z,run,pw=900,ph=170){
  const canvas=document.createElement('canvas');canvas.width=pw;canvas.height=ph;
  const el=entity('a-plane',{id,width,height,position:`${x} ${y} ${z}`,material:'shader: flat; side: double; transparent: true'},parent),texture=new AFRAME.THREE.CanvasTexture(canvas);texture.colorSpace=AFRAME.THREE.SRGBColorSpace;
  function attach(){const mesh=el.getObject3D('mesh');if(mesh){mesh.userData.uiTarget=el;mesh.material.map=texture;mesh.material.needsUpdate=true;}}
  el.addEventListener('loaded',attach);el.addEventListener('object3dset',attach);
  if(run){el.classList.add('target');el.addEventListener('click',run);el.addEventListener('mouseenter',()=>el.setAttribute('scale','1.025 1.025 1'));el.addEventListener('mouseleave',()=>el.setAttribute('scale','1 1 1'));}
  return{el,canvas,ctx:canvas.getContext('2d'),texture,key:''};
 }
 function lines(ctx,text,width){const out=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){out.push(line);line=word;}else line=next;}out.push(line);}return out;}
 function paint(p,title,body='',color='#dcecb2'){
  const key=JSON.stringify([title,body,color]);if(p.key===key)return;p.key=key;const c=p.ctx,w=p.canvas.width,h=p.canvas.height;c.clearRect(0,0,w,h);c.fillStyle='#103629';c.beginPath();c.roundRect(3,3,w-6,h-6,24);c.fill();c.strokeStyle=color;c.lineWidth=3;c.stroke();c.textBaseline='top';
  if(!body){let size=44,rows;do{c.font=`700 ${size}px Arial`;rows=lines(c,title,w-55);if(rows.length*size*1.22<=h-28)break;size-=2;}while(size>26);c.textAlign='center';c.fillStyle=color;rows.forEach((s,i)=>c.fillText(s,w/2,(h-rows.length*size*1.22)/2+i*size*1.22));}
  else{c.textAlign='left';c.fillStyle=color;c.font='700 54px Arial';const titles=lines(c,title,w-62);titles.forEach((s,i)=>c.fillText(s,31,24+i*64));let top=40+titles.length*64,size=44,rows;do{c.font=`${size}px Arial`;rows=lines(c,body,w-62);if(rows.length*size*1.25<h-top-24)break;size-=2;}while(size>30);c.fillStyle='#eef1e6';rows.forEach((s,i)=>c.fillText(s,31,top+i*size*1.25));}
  p.texture.needsUpdate=true;
 }
 function visible(p,show,enabled=true){if(p.el.getAttribute('visible')!==show)p.el.setAttribute('visible',show);p.el.classList.toggle('target',!!show&&!!enabled);}
 function updateSpots(){if(!vr)return;const active=App.activeSpots();for(const p of vr.spots){const d=active.find(x=>x.id===p.id);visible(p,!!d);if(d)p.el.setAttribute('position',`${(d.x-.5)*SCREEN.width*App.zoom} ${SCREEN.y+(.5-d.y)*SCREEN.height*App.zoom} ${SCREEN.z+.025}`);}}
 function updateStatus(){if(!vr)return;const active=!!vr.scene.renderer.xr.getSession();paint(vr.header,`PANTANAL V3.1 · ${active?'VR ATIVO':'PRÉVIA'} · ${vr.count} ${vr.count===1?'CONTROLE':'CONTROLES'}`);vr.header.el.dataset.label=`PANTANAL V3.1 · ${active?'VR ATIVO':'PRÉVIA'} · ${vr.count} CONTROLES`;
  const text=!App.unlocked?'Assista à viagem ou selecione Animais para explorar':vr.count?'Gatilho: selecionar · Analógico: cenas / tamanho':'Olhe para um botão por 1,2 segundo para selecionar';paint(vr.hint,text);
 }
 function currentView(){return App.needsResume?App.playbackView():App.view();}
 function render(){if(!vr)return;const v=currentView(),hasCard=App.needsResume||!!App.selected||['quiz','complete'].includes(App.phase);
  vr.video.setAttribute('width',SCREEN.width*App.zoom);vr.video.setAttribute('height',SCREEN.height*App.zoom);updateStatus();
  visible(vr.card,hasCard,false);if(hasCard)paint(vr.card,v.title,`${v.scientific?v.scientific+'\n\n':''}${v.label}\n\n${v.feedback||v.body}`,v.wrong?'#edbc87':'#dcecb2');
  vr.actions.forEach((p,i)=>{const a=v.actions[i];visible(p,hasCard&&!!a);if(a)paint(p,a.label);});
  const hasMenu=App.unlocked&&!hasCard;visible(vr.menuTitle,hasMenu,false);if(hasMenu)paint(vr.menuTitle,v.title+' · '+v.label);
  vr.menu.forEach((p,i)=>{const a=v.menu?.[i];visible(p,hasMenu&&!!a);if(a)paint(p,`${a.visited?'✓ ':''}${a.label}`);});
  visible(vr.prev,hasMenu,hasMenu&&v.page>0);visible(vr.next,hasMenu,hasMenu&&v.page<v.max-1);paint(vr.prev,'← Anterior','',v.page>0?'#dcecb2':'#79958a');paint(vr.next,'Próxima →','',v.page<v.max-1?'#dcecb2':'#79958a');
  vr.tools.forEach((p,i)=>{const enabled=i===6?App.faunaCount>=7:true;visible(p,true,enabled);paint(p,['Animais','Ambientes','Cenas do vídeo','− Diminuir','+ Ampliar','Tamanho inicial',`Desafios · ${App.faunaCount}/7`][i],'',enabled?'#dcecb2':'#79958a');});
  visible(vr.back,hasCard&&App.unlocked);paint(vr.back,'Voltar ao caderno');paint(vr.sound,App.muted?'Ativar som':'Silenciar');paint(vr.restart,'Rever do início');paint(vr.exit,'Sair do VR');updateSpots();
 }
 async function setup(){
  await loadEngine();AFRAME.registerComponent('pantanal-input',{tick:function(t,dt){this.input?.tick(dt);updateSpots();}});
  const scene=entity('a-scene',{embedded:'','xr-mode-ui':'enabled: false','loading-screen':'enabled: false',renderer:'antialias: true; colorManagement: true; highRefreshRate: true; maxCanvasWidth: 2048; maxCanvasHeight: 2048',background:'color: #081e16',webxr:'referenceSpaceType: local-floor','device-orientation-permission-ui':'enabled: false','keyboard-shortcuts':'enterVR: false','pantanal-input':''},$('xr-host'));
  const screen=entity('a-video',{id:'xr-video',src:'#film',width:SCREEN.width,height:SCREEN.height,position:`0 ${SCREEN.y} ${SCREEN.z}`,material:'shader: flat; side: double'},scene);
  const camera=entity('a-entity',{id:'xr-camera',camera:'active: true',position:'0 1.6 0','look-controls':''},scene);
  const gaze=entity('a-entity',{id:'xr-gaze',cursor:'fuse: true; fuseTimeout: 1200',raycaster:'objects: .target; far: 15',geometry:'primitive: ring; radiusInner: .005; radiusOuter: .008',material:'shader: flat; color: #dcecb2',position:'0 0 -1'},camera);
  const header=panel(scene,'xr-status',6,.47,0,3.55,-6,null,1536,128),hint=panel(scene,'xr-hint',5.2,.43,0,-.03,-6,null,1536,128);
  const card=panel(scene,'xr-card',2.4,2.3,-3.65,2.12,-5.7,null,900,863);
  const actions=[0,1,2].map(i=>panel(scene,'xr-action-'+i,2.4,.46,-3.65,.63-i*.53,-5.67,()=>currentView().actions[i]?.run()));
  const menuTitle=panel(scene,'xr-menu-title',2.4,.4,-3.65,3.27,-5.7,null,900,150);
  const menu=[0,1,2,3].map(i=>panel(scene,'xr-menu-'+i,2.4,.5,-3.65,2.7-i*.61,-5.7,()=>App.view().menu?.[i]?.run()));
  const prev=panel(scene,'xr-prev',1.14,.38,-4.27,.21,-5.7,()=>App.changePage(-1),440,146),next=panel(scene,'xr-next',1.14,.38,-3.03,.21,-5.7,()=>App.changePage(1),440,146);
  const callbacks=[()=>{App.unlockExploration();App.chooseTab('fauna');},()=>{App.unlockExploration();App.chooseTab('ambientes');},()=>{App.unlockExploration();App.chooseTab('cenas');},()=>App.zoomBy(-.1),()=>App.zoomBy(.1),App.resetSize,App.startQuiz];
  const tools=callbacks.map((run,i)=>panel(scene,'xr-tool-'+i,2.12,.39,3.6,3.2-i*.47,-5.7,run,900,166));
  const back=panel(scene,'xr-back',2.12,.39,3.6,-.2,-5.7,App.back,900,166);
  const sound=panel(scene,'xr-sound',1.5,.36,-1.65,-.6,-6,App.mute,600,144),restart=panel(scene,'xr-restart',1.5,.36,0,-.6,-6,App.replay,600,144),exit=panel(scene,'xr-exit',1.5,.36,1.65,-.6,-6,()=>scene.exitVR(),600,144);
  const spots=App.data.items.filter(x=>x.category==='fauna').map((d,i)=>{const p=panel(scene,'xr-spot-'+d.id,.23,.23,0,1.6,-5.97,()=>App.showItem(d.id,false),200,200);p.id=d.id;const c=p.ctx;c.fillStyle='#163e2e';c.strokeStyle='#dcecb2';c.lineWidth=10;c.beginPath();c.arc(100,100,93,0,Math.PI*2);c.fill();c.stroke();c.font='bold 100px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#dcecb2';c.fillText(String(i+1),100,100);p.texture.needsUpdate=true;return p;});
  vr={scene,video:screen,header,hint,card,actions,menuTitle,menu,prev,next,tools,back,sound,restart,exit,spots,count:0};
  await new Promise(resolve=>scene.hasLoaded?resolve():scene.addEventListener('loaded',resolve,{once:true}));
  const input=new PortalXRControls(scene,{rotate:delta=>{if(performance.now()-lastNavigate<650)return;lastNavigate=performance.now();App.stepChapter(delta>0?1:-1);},beginRotation:()=>{lastNavigate=-Infinity;},zoom:App.zoomBy,primary:App.primary,back:App.back,reset:App.resetSize,canRotate:()=>App.unlocked,status:n=>{vr.count=n;updateStatus();},gaze:enabled=>{gaze.setAttribute('visible',enabled);gaze.setAttribute('raycaster','enabled',enabled);}});
  scene.components['pantanal-input'].input=input;
  scene.addEventListener('enter-vr',()=>{document.body.classList.add('xr-active');$('xr-host').removeAttribute('aria-hidden');App.resetSize();input.refresh();render();});
  scene.addEventListener('exit-vr',()=>{input.reset();App.stopVoice();document.body.classList.remove('xr-active');$('xr-host').setAttribute('aria-hidden','true');App.keepPlaying();App.render();});render();
 }
 async function prepare(){if(loading||supported||!isSecureContext||!navigator.xr)return;loading=true;$('vr-button').disabled=true;$('vr-button').textContent='Preparando VR…';try{available=await navigator.xr.isSessionSupported('immersive-vr');if(available&&Media.ready){await setup();supported=true;}}catch(error){console.error(error);supported=false;App.status('Não foi possível preparar o VR. Você pode assistir na tela ou recarregar a página para tentar o VR novamente.');}finally{loading=false;$('vr-button').disabled=false;$('vr-button').textContent='Entrar em VR ↗';App.mediaControls();}}
 async function enter(){
  if(loading)return;
  if(!isSecureContext||!navigator.xr){App.status('Abra a página HTTPS diretamente no navegador dos óculos para entrar em VR.');return;}
  if(!Media.ready){await Media.prepare();return;}
  if(!supported){await prepare();App.status(supported?'VR pronto. Selecione “Começar em VR”.':'Este navegador não disponibilizou o modo VR. Você pode assistir na tela.');return;}
  // As duas solicitações acontecem no mesmo clique, antes de qualquer await.
  const playing=App.start(true);
  try{await vr.scene.enterVR();await playing;}catch(error){console.error(error);App.status('A entrada em VR foi cancelada ou bloqueada. O vídeo continua na tela; tente “Entrar em VR” novamente.');}
 }
 document.addEventListener('pantanal-render',render);document.addEventListener('pantanal-media',()=>{if(Media.ready)prepare();});window.PantanalVR={enter,get supported(){return supported},get scene(){return vr?.scene}};prepare();
})();
