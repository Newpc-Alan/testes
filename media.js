'use strict';
// V3.2: vídeo da atividade incluído e carregado automaticamente.
(()=>{
 const video=document.getElementById('film'),expectedDuration=475.120272,total=74171461;
 const config=window.PANTANAL_VIDEO_CONFIG||{},packageURL=config.packageUrl||'media/pantanal.mp4';
 // Um link antigo salvo no navegador não substitui o vídeo desta atividade.
 let sourceURL=config.url||'',state='idle',loaded=0,message='',detail='',streaming=false,job=null,objectURL=null;
 const notify=()=>document.dispatchEvent(new CustomEvent('pantanal-media'));
 const problem=(text,help)=>Object.assign(new Error(text),{detail:help});
 function fail(error){state='error';message=error.message||'Não foi possível carregar o vídeo.';detail=error.detail||'Extraia todo o ZIP e mantenha a pasta media junto do index.html. Depois, tente novamente.';notify();return false;}
 function release(){if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
 async function attach(source){
  release();const remote=typeof source==='string',resolved=remote?new URL(source,document.baseURI):null;objectURL=remote?null:URL.createObjectURL(source);
  // Arquivos locais usam a leitura normal do navegador; HTTPS mantém CORS para VR.
  if(remote?resolved.protocol==='file:':location.protocol==='file:')video.removeAttribute('crossorigin');else video.crossOrigin='anonymous';
  await new Promise((resolve,reject)=>{
   let finished=false;
   const timer=setTimeout(()=>finish(problem('O vídeo demorou para abrir.','Confira se a pasta media foi extraída junto do index.html. Em um site, confira a conexão e tente novamente.')),20000);
   function finish(error){
    if(finished)return;finished=true;clearTimeout(timer);video.removeEventListener('loadeddata',ready);video.removeEventListener('loadedmetadata',metadata);video.removeEventListener('error',bad);
    if(error){video.removeAttribute('src');video.load();release();reject(error);}else resolve();
   }
   function compatible(){return Number.isFinite(video.duration)&&Math.abs(video.duration-expectedDuration)<=2;}
   function mismatch(){return problem('Este vídeo não corresponde às cenas da atividade.','Use Pantanal_Interativo_Video_Webnode.mp4, com 7min55s. As fichas e os pontos foram revisados para esse vídeo.');}
   function metadata(){if(Number.isFinite(video.duration)&&!compatible())finish(mismatch());}
   function ready(){finish(compatible()?null:mismatch());}
   function bad(){finish(problem('O navegador não conseguiu abrir o vídeo.',source===packageURL?'Extraia todo o ZIP. A pasta media precisa permanecer junto do index.html.':'Use o MP4 desta atividade. Para um link externo, o servidor também deve permitir o carregamento pelo aplicativo.'));}
   video.addEventListener('loadedmetadata',metadata);video.addEventListener('loadeddata',ready);video.addEventListener('error',bad);
   video.src=remote?resolved.href:objectURL;video.preload='auto';video.load();
  });
  state='ready';loaded=total;message='Vídeo pronto. Escolha explorar os animais ou assistir à viagem.';detail='';notify();return true;
 }
 function useFile(file){
  if(!file||job)return Promise.resolve(false);
  if(!/\.mp4$/i.test(file.name)&&file.type!=='video/mp4')return Promise.resolve(fail(problem('Selecione um arquivo MP4.','Use o vídeo desta atividade, com aproximadamente 7min55s.')));
  streaming=false;state='loading';loaded=total;message='Abrindo o vídeo selecionado…';detail='';notify();
  job=attach(file).catch(fail).finally(()=>{job=null;});return job;
 }
 function useURL(value){
  if(job)return job;let url;
  try{url=new URL(value.trim());if(url.protocol!=='https:'||url.username||url.password||!url.pathname.toLowerCase().endsWith('.mp4'))throw new Error();}
  catch{return Promise.resolve(fail(problem('Cole o link HTTPS direto do arquivo MP4.','Na página publicada da Webnode, copie o endereço do link do arquivo. A URL da página Base Teste não é o endereço do vídeo.')));}
  streaming=true;state='loading';loaded=0;message='Preparando o vídeo hospedado…';detail='Use o vídeo de 7min55s correspondente às fichas.';notify();
  job=attach(url.href).then(ok=>{if(ok)sourceURL=url.href;return ok;}).catch(fail).finally(()=>{job=null;});return job;
 }
 function prepare(){
  if(state==='ready')return Promise.resolve(true);if(job)return job;return sourceURL?useURL(sourceURL):usePackage();
 }
 function usePackage(){
  if(job)return job;sourceURL='';state='loading';loaded=0;streaming=true;message='Preparando a expedição automaticamente…';detail='';notify();
  job=attach(packageURL).catch(fail).finally(()=>{job=null;});return job;
 }
 window.PantanalMedia={prepare,useFile,useURL,usePackage,get sourceURL(){return sourceURL},get streaming(){return streaming},get state(){return state},get ready(){return state==='ready'},get loaded(){return loaded},get total(){return total},get message(){return message},get detail(){return detail}};
})();
