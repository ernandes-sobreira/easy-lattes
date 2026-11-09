import {firebaseConfig} from './firebase-settings.js';

const STORAGE_KEY='easy-lattes:approved-activities:v1';
const status=document.getElementById('cloudStatus');
const signIn=document.getElementById('cloudSignIn');
const signOut=document.getElementById('cloudSignOut');
const account=document.getElementById('cloudAccount');
const configured=Boolean(firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.projectId);
let user=null,store=null,auth=null,db=null,unsubscribe=null,initializing=false,pendingWrite=false;
let sdk={};
function message(t){if(status)status.textContent=t;}
function localRecords(){try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
function cleanRecord(x){
  const {text,rawPdf,file,fileData,blob,...rest}=x||{};
  return Object.fromEntries(Object.entries(rest).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v)));
}
function same(a,b){return a.type===b.type && String(a.title||'').trim().toLowerCase()===String(b.title||'').trim().toLowerCase() && a.year===b.year}
async function boot(){
 if(!configured){if(signIn){signIn.disabled=true;signIn.title='Falta configurar o aplicativo Web no Firebase';}message('Sincronização ainda não configurada. Seus registros permanecem neste dispositivo.');return}
 try {
   const [app,authentication,firestore]=await Promise.all([
     import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
     import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
     import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
   ]);
   sdk={...authentication,...firestore};
   const firebaseApp=app.initializeApp(firebaseConfig);
   auth=authentication.getAuth(firebaseApp);db=firestore.getFirestore(firebaseApp);
   authentication.onAuthStateChanged(auth,async next=>{
     if(unsubscribe){unsubscribe();unsubscribe=null}
     user=next;
     signIn.hidden=!!next;
     signOut.hidden=!next;
     if(account)account.textContent=next ? (next.email||'Conta conectada'):'Sem conta conectada';
     if(!next){message('Modo local. Entre com Google para sincronizar registros.');return}
     message('Conectando seus registros...');
     await connectUser(next);
   },err=>message('Não foi possível verificar a conta: '+err.code));
   signIn?.addEventListener('click',async()=>{
     try{await authentication.signInWithPopup(auth,new authentication.GoogleAuthProvider())}
     catch(err){message(err.code==='auth/unauthorized-domain'?'Domínio não autorizado no Firebase Authentication.': 'Não foi possível entrar: '+err.code)}
   });
   signOut?.addEventListener('click',async()=>{
     if(!confirm('Sair da conta? Os registros sincronizados serão retirados deste navegador, mas continuarão na sua conta Firebase.'))return;
     try{
       await authentication.signOut(auth);
       localStorage.removeItem(STORAGE_KEY);
       window.dispatchEvent(new CustomEvent('easy-lattes:cloud-records',{detail:{records:[]}}));
     }catch(e){message('Não foi possível sair: '+e.code)}
   });
 }catch(e){console.error(e);message('Firebase indisponível. Seus registros locais continuam acessíveis.')}
}
async function connectUser(next){
 const col=sdk.collection(db,'users',next.uid,'activities');
 let completedFirst=false;
 unsubscribe=sdk.onSnapshot(col,async snap=>{
   if(user?.uid!==next.uid)return;
   const remote=snap.docs.map(d=>({id:d.id,...d.data()}));
   if(!completedFirst){
     completedFirst=true;
     const existing=new Set(remote.map(x=>x.id));
     const toUpload=localRecords().filter(x=>x.id && !existing.has(x.id) && !remote.some(y=>same(x,y)));
     if(toUpload.length){
       message('Migrando '+toUpload.length+' registro(s) deste dispositivo...');
       try{
         const batch=sdk.writeBatch(db);
         toUpload.forEach(x=>batch.set(sdk.doc(col,x.id),cleanRecord(x)));
         await batch.commit();
       }catch(e){console.error(e);message('Falha na migração local. Os dados locais não foram apagados.');return}
       return;
     }
   }
   if(pendingWrite)return;
   window.dispatchEvent(new CustomEvent('easy-lattes:cloud-records',{detail:{records:remote}}));
   message('Sincronizado com sua conta Google ('+remote.length+' registros).');
 },e=>message('Falha ao ler registros: '+e.code));
}
window.addEventListener('easy-lattes:record-added',async ev=>{
 if(!user||!db)return;
 const record=ev.detail?.record;if(!record?.id)return;
 pendingWrite=true;
 try{await sdk.setDoc(sdk.doc(db,'users',user.uid,'activities',record.id),cleanRecord(record))}
 catch(e){message('Não foi possível salvar na nuvem. O registro permanece local.');console.error(e)}
 finally{pendingWrite=false}
});
window.addEventListener('easy-lattes:record-deleted',async ev=>{
 if(!user||!db)return;
 const id=ev.detail?.id;if(!id)return;
 pendingWrite=true;
 try{await sdk.deleteDoc(sdk.doc(db,'users',user.uid,'activities',id))}
 catch(e){message('Não foi possível excluir na nuvem; confira a sincronização.');console.error(e)}
 finally{pendingWrite=false}
});
boot();
