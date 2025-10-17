"use client";
import { useEffect, useRef, useState } from "react";
import useSound from "use-sound";

const quotes = [
  "Les mots que tu écris aujourd’hui seront les échos de ton âme demain.",
  "Chaque lettre est une promesse faite au futur.",
  "Ce que tu confies au temps finit toujours par te revenir.",
  "Les souvenirs s’effacent, mais l’encre, elle, se souvient.",
  "Parce que chaque mot mérite de voyager dans le temps.",
];

export default function CanvasUltimate() {
  const canvasRef = useRef(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [letter, setLetter] = useState("");
  const [muted, setMuted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [lettersAdmin, setLettersAdmin] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [pendingLetterId, setPendingLetterId] = useState(null);

  const [play, { stop }] = useSound("/sounds/wind.mp3", { volume: 0.4, loop: true });
  useEffect(() => { if(!muted) play(); else stop(); }, [muted]);

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex(prev => (prev+1)%quotes.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminLetters = async () => {
    const res = await fetch("/api/get-letters");
    const data = await res.json();
    setLettersAdmin(data.letters);
  };
  useEffect(() => { if(showAdmin) fetchAdminLetters(); }, [showAdmin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numParticles = 80;
    const initParticles = () => {
      particles.length = 0;
      for(let i=0;i<numParticles;i++){
        particles.push({
          x: Math.random()*width,
          y: Math.random()*height,
          r: Math.random()*2+0.5,
          s: Math.random()*0.8+0.2,
          a: Math.random()*0.6+0.3,
          char: chars[Math.floor(Math.random()*chars.length)]
        });
      }
    };
    initParticles();

    const render = () => {
      ctx.clearRect(0,0,width,height);

      const grad = ctx.createLinearGradient(0,0,0,height);
      grad.addColorStop(0,"#0d1b2a");
      grad.addColorStop(0.5,"#1b263b");
      grad.addColorStop(1,"#0d1b2a");
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      particles.forEach(p=>{
        ctx.beginPath();
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
        g.addColorStop(0,`rgba(255,255,255,${p.a})`);
        g.addColorStop(1,"transparent");
        ctx.fillStyle = g;
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();

        ctx.font = "12px serif";
        ctx.fillStyle = `rgba(255,255,255,${p.a*0.8})`;
        ctx.fillText(p.char,p.x,p.y);

        p.y -= p.s;
        if(p.y<0){p.y=height;p.x=Math.random()*width;p.char=chars[Math.floor(Math.random()*chars.length)];}
      });

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "32px serif";
      ctx.textAlign = "center";
      ctx.fillText(`"${quotes[quoteIndex]}"`, width/2, 80);

      ctx.font = "20px serif";
      ctx.fillStyle = "rgba(173,216,230,0.8)";
      ctx.textAlign = "center";
      const lines = letter.split("\n");
      lines.forEach((line,i)=> ctx.fillText(line,width/2,height/2 + i*24));

      ctx.fillStyle = sending?"gray":"#00ffcc";
      ctx.fillRect(width/2-60,height-100,120,40);
      ctx.fillStyle="#000";
      ctx.font="18px serif";
      ctx.fillText(sending?"Envoi...":"Envoyer",width/2,height-73);

      ctx.fillStyle="#ffcc00";
      ctx.fillRect(width-140,20,120,40);
      ctx.fillStyle="#000";
      ctx.fillText(showAdmin?"Fermer Admin":"Ouvrir Admin",width-80,45);

      if(showAdmin){
        ctx.fillStyle="rgba(0,0,0,0.7)";
        ctx.fillRect(50,100,width-100,height-200);
        ctx.fillStyle="#fff";
        ctx.font="16px monospace";
        ctx.textAlign="left";
        lettersAdmin.forEach((l,i)=> ctx.fillText(`ID:${l.id} User:${l.user_id} Status:${l.status}`,60,130+i*24));
      }

      requestAnimationFrame(render);
    };
    render();

    const handleResize=()=>{
      width=window.innerWidth;
      height=window.innerHeight;
      canvas.width=width;
      canvas.height=height;
      initParticles();
    };
    window.addEventListener("resize",handleResize);
    return ()=>window.removeEventListener("resize",handleResize);

  },[letter,quoteIndex,sending,showAdmin,lettersAdmin]);

  useEffect(()=>{
    const handleKey=(e)=>{
      if(e.key==="Backspace") setLetter(l=>l.slice(0,-1));
      else if(e.key.length===1) setLetter(l=>l+e.key);
      else if(e.key==="Enter") setLetter(l=>l+"\n");
    };
    window.addEventListener("keydown",handleKey);
    return ()=>window.removeEventListener("keydown",handleKey);
  },[]);

  useEffect(()=>{
    const handleClick=async (e)=>{
      const canvas=canvasRef.current;
      if(!canvas) return;
      const rect=canvas.getBoundingClientRect();
      const x=e.clientX-rect.left;
      const y=e.clientY-rect.top;

      if(x>canvas.width/2-60 && x<canvas.width/2+60 && y>canvas.height-100 && y<canvas.height-60 && !sending){
        setSending(true);
        // 1) analyze
        const resAI = await fetch("/api/ai-suggestions",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({text:letter})
        });
        const dataAI = await resAI.json();
        setAiData(dataAI);

        // 2) create letter (pending payment)
        const resLetter = await fetch("/api/ai-delivery",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({content:letter, aiData:dataAI, userId:1})
        });
        const letterRes = await resLetter.json();
        const letterId = letterRes?.letter?.id;
        setPendingLetterId(letterId);

        // 3) create PayPal order via server
        const orderRes = await fetch("/api/create-paypal-order",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({letterId})
        });
        const order = await orderRes.json();
        const orderID = order?.id;
        if(!orderID){
          alert("Impossible de créer la commande PayPal.");
          setSending(false);
          return;
        }

        // 4) open PayPal window (simple popup flow)
        const paypalWin = window.open("", "paypal", "width=600,height=700");
        if(!paypalWin){
          alert("Popup bloquée — autorise les popups pour continuer.");
          setSending(false);
          return;
        }
        paypalWin.document.write("<h3>Completez le paiement PayPal dans cette fenêtre</h3><p>Vous pouvez fermer cette fenêtre après paiement.</p>");

        // Poll capture endpoint to check capture status (simplified)
        const capture = async () => {
          const capRes = await fetch("/api/capture-paypal-order",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({orderID, letterId})
          });
          const capJson = await capRes.json();
          if(capJson?.capture || capJson?.status==="COMPLETED" || (capJson?.capture && capJson.capture.status)){
            // success
            paypalWin.close();
            alert("Paiement reçu — ta lettre est programmée !");
            setLetter("");
            setSending(false);
            if(showAdmin) fetchAdminLetters();
          } else {
            // retry after delay
            setTimeout(capture,3000);
          }
        };

        // In a real integration, you'd redirect the user to PayPal approval page.
        // For sandbox purposes, we attempt immediate capture (may fail until merchant approves).
        capture();
      }

      if(x>canvas.width-140 && x<canvas.width-20 && y>20 && y<60){
        setShowAdmin(!showAdmin);
      }
    };
    window.addEventListener("click",handleClick);
    return ()=>window.removeEventListener("click",handleClick);
  },[letter,sending,showAdmin,aiData]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0"></canvas>;
}
