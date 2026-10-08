'use strict';
// V3.1: pacote leve; MP4 selecionado no aparelho ou hospedado na Webnode.
(()=>{
 const video=document.getElementById('film'),expectedDuration=475.120272,total=74171461,key='pantanal-v3-video-url';
 let sourceURL='',state='idle',loaded=0,message='',detail='',streaming=false,job=null,objectURL=null;
 try{sourceURL=localStorage.getItem(key)||'';}catch{}
 sourceURL=sourceURL||window.PANTANAL_VIDEO_CONFIG?.url||'';
 const notify=()=>document.dispatchEvent(new CustomEvent('pantanal-media'));
 const problem=(text,help)=>Object.assign(new Error(text),{detail:help});
 function fail(error){state='error';message=error.message||'Não foi possível carregar o vídeo.';detail=error.detail||'Tente novamente ou selecione o MP4 de 7min55s no aparelho.';notify();return false;}
 function release(){if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
 async function attach(source){
  release();const remote=typeof source==='string';objectURL=remote?null:URL.createObjectURL(source);video.crossOrigin='anonymous';
  await new Promise((resolve,reject)=>{
   let finished=false;
   const timer=setTimeout(()=>finish(problem('O vídeo demorou para abrir.','Confira o link direto do MP4 de 7min55s ou selecione esse arquivo no aparelho.')),20000);
   function finish(error){
    if(finished)return;finished=true;clearTimeout(timer);video.removeEventListener('loadeddata',ready);video.removeEventListener('loadedmetadata',metadata);video.removeEventListener('error',bad);
    if(error){video.removeAttribute('src');video.load();release();reject(error);}else resolve();
   }
   function compatible(){return Number.isFinite(video.duration)&&Math.abs(video.duration-expectedDuration)<=2;}
   function mismatch(){return problem('Este vídeo não corresponde às cenas da atividade.','Use Pantanal_Interativo_Video_Webnode.mp4, com 7min55s. As fichas e os pontos foram revisados para esse vídeo.');}
   function metadata(){if(Number.isFinite(video.duration)&&!compatible())finish(mismatch());}
   function ready(){finish(compatible()?null:mismatch());}
   function bad(){finish(problem('O navegador não conseguiu abrir o vídeo.','Use o MP4 desta atividade. Para um link externo, o servidor também deve permitir o carregamento pelo aplicativo.'));}
   video.addEventListener('loadedmetadata',metadata);video.addEventListener('loadeddata',ready);video.addEventListener('error',bad);
   video.src=remote?source:objectURL;video.preload='auto';video.load();
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
  job=attach(url.href).then(ok=>{if(ok){sourceURL=url.href;try{localStorage.setItem(key,sourceURL);}catch{}}return ok;}).catch(fail).finally(()=>{job=null;});return job;
 }
 function prepare(){
  if(state==='ready')return Promise.resolve(true);if(job)return job;if(sourceURL)return useURL(sourceURL);
  message='Selecione o MP4 de 7min55s no aparelho ou informe o link da Webnode.';detail='O vídeo é entregue separadamente para manter o ZIP pequeno.';notify();return Promise.resolve(false);
 }
 function usePackage(){
  if(job)return false;sourceURL='';try{localStorage.removeItem(key);}catch{}release();video.removeAttribute('src');video.load();state='idle';loaded=0;streaming=false;message='Selecione o vídeo de 7min55s no aparelho.';detail='';notify();return true;
 }
 window.PantanalMedia={prepare,useFile,useURL,usePackage,get sourceURL(){return sourceURL},get streaming(){return streaming},get state(){return state},get ready(){return state==='ready'},get loaded(){return loaded},get total(){return total},get message(){return message},get detail(){return detail}};
})();
