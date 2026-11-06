'use client';
import {useState} from 'react';
import {useTranslation} from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';
const labels={pt:['Testar email','Envia uma mensagem de teste para o email principal verificado da tua conta. Não altera as tuas preferências de avisos.','Enviar email de teste','Verificar entrega','Email enviado. Verifica a caixa de entrada e o spam.','Ainda não foi enviado um teste.','Email entregue ao servidor de destino.','Não foi possível concluir o pedido.','Estado da entrega: '],en:['Test email','Send a test to your account’s verified primary email. This keeps your alert preferences.','Send test email','Check delivery','Email sent. Check your inbox and spam folder.','No test has been sent yet.','Email delivered to the receiving mail server.','Could not complete the request.','Delivery status: ']};
export default function EmailTestSettings({isSignedIn}){
 const {language}=useTranslation(),text=labels[language]||labels.en,[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!isSignedIn)return null;
 async function request(send){setBusy(true);try{const response=await fetch('/api/notifications/email-test',send?{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}:{cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error);setMessage(send?text[4]:result.status==='none'?text[5]:['delivered','opened','clicked'].includes(result.status)?text[6]:text[8]+result.status);}catch(error){setMessage(error.message||text[7]);}finally{setBusy(false);}}
 return <section className={styles.panel}><h2>{text[0]}</h2><p>{text[1]}</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>request(true)}>{text[2]}</button><button type="button" disabled={busy} onClick={()=>request(false)}>{text[3]}</button></div>{message&&<p role="status">{message}</p>}</section>;
}
