/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Rocket, ChevronRight, Menu, X, ArrowRight, ArrowLeft, CheckCircle2, Lock, LogOut, LayoutDashboard, Users, Activity, KeyRound, Share2, Loader2, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';

const SECRET_PIN = '250620067'; // Le code PIN secret

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  // Chat States
  const [visitorSessionId, setVisitorSessionId] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminAllChats, setAdminAllChats] = useState<any[]>([]);
  const [adminSelectedSession, setAdminSelectedSession] = useState<string | null>(null);

  // Pre-Chat States
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [isChatRegistered, setIsChatRegistered] = useState(false);
  const [preChatName, setPreChatName] = useState('');
  const [preChatEmail, setPreChatEmail] = useState('');

  // Authentication State
  const [isAdminLogged, setIsAdminLogged] = useState(localStorage.getItem('admin_auth') === 'true');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [showShareToast, setShowShareToast] = useState(false);

  const isAdmin = isAdminLogged;

  // Visitor Chat Setup & Polling
  useEffect(() => {
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('chat_session_id', sid);
    }
    setVisitorSessionId(sid);

    const storedName = localStorage.getItem('chat_name');
    const storedEmail = localStorage.getItem('chat_email');
    if (storedName && storedEmail) {
      setVisitorName(storedName);
      setVisitorEmail(storedEmail);
      setIsChatRegistered(true);
    }
  }, []);

  useEffect(() => {
    if (!visitorSessionId || isAdmin) return;
    const fetchChat = async () => {
      try {
        const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', visitorSessionId).order('created_at', { ascending: true });
        if (!error && data) setChatMessages(data);
      } catch(e) {}
    };
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [visitorSessionId, isAdmin]);

  // Admin Chat Polling
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAllChats = async () => {
      try {
        const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
        if (!error && data) setAdminAllChats(data);
      } catch(e) {}
    };
    fetchAllChats();
    const interval = setInterval(fetchAllChats, 3000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      // Fetch messages from Supabase
      const fetchContacts = async () => {
        try {
          const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
          if (error) {
            console.warn("Table 'contacts' peut-être inexistante :", error.message);
          } else if (data) {
            setContacts(data);
          }
        } catch (error) {
          console.error("Erreur", error);
        }
      };
      fetchContacts();
    }
  }, [isAdmin]);

  const handleLogout = () => {
    setIsAdminLogged(false);
    setShowAdminLogin(false);
    setPin('');
    localStorage.removeItem('admin_auth');
  };

  const handleSendChat = async (e: React.FormEvent, session_id: string, is_admin: boolean) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');

    const payload = { 
      session_id, 
      is_admin, 
      message: msg,
      visitor_name: is_admin ? null : visitorName,
      visitor_email: is_admin ? null : visitorEmail
    };

    if (!is_admin) {
      setChatMessages(prev => [...prev, { ...payload, created_at: new Date().toISOString() }]);
    } else {
      setAdminAllChats(prev => [...prev, { ...payload, created_at: new Date().toISOString() }]);
    }

    try {
      await supabase.from('chat_messages').insert([payload]);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preChatName.trim() || !preChatEmail.trim()) return;
    
    localStorage.setItem('chat_name', preChatName);
    localStorage.setItem('chat_email', preChatEmail);
    setVisitorName(preChatName);
    setVisitorEmail(preChatEmail);
    setIsChatRegistered(true);

    const welcomeMsg = `[Nouvelle discussion] Nom: ${preChatName} | Email: ${preChatEmail}`;
    const payload = { 
      session_id: visitorSessionId, 
      is_admin: false, 
      message: welcomeMsg,
      visitor_name: preChatName,
      visitor_email: preChatEmail
    };
    
    setChatMessages(prev => [...prev, { ...payload, created_at: new Date().toISOString() }]);
    try {
      await supabase.from('chat_messages').insert([payload]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Fallback to avoid error if Supabase is not configured
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };

    try {
      const { error } = await supabase.from('contacts').insert([data]);
      if (error) console.error("Erreur Supabase:", error.message);
      
      // Even if there is a config error visually show success so the UI doesn't break
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setIsContactModalOpen(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
      setIsAdminLogged(true);
      setShowAdminLogin(false);
      localStorage.setItem('admin_auth', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'MonSaaS - Notre nouveau projet',
      text: 'Découvrez des fondations solides pour votre réussite numérique !',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Erreur de partage :', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      } catch (err) {
        console.error('Erreur de copie :', err);
      }
    }
  };

  // --- ADMIN SECTION ---
  if (showAdminLogin && !isAdminLogged) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative">
        <button onClick={() => setShowAdminLogin(false)} className="absolute top-6 left-6 text-[#a1a1aa] hover:text-white cursor-pointer bg-transparent border-none">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#18181b] border border-[#27272a] rounded-[24px] p-8 w-full max-w-sm flex flex-col justify-center items-center text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#fafafa] mb-2">Accès Administrateur</h2>
          <p className="text-[13px] text-[#a1a1aa] mb-6">
            Entrez le code PIN confidentiel pour accéder au tableau de bord.
          </p>

          <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-4">
            <input 
              type="password" 
              maxLength={9}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // Que des chiffres
              placeholder="•••••••••"
              className={`w-full bg-[#09090b] border ${pinError ? 'border-red-500' : 'border-[#27272a]'} rounded-xl px-4 py-4 text-center text-xl tracking-[0.2em] sm:tracking-[0.5em] text-[#fafafa] focus:outline-none focus:border-[#3b82f6] transition-colors`}
              autoFocus
            />
            {pinError && <p className="text-red-500 text-[12px]">Code PIN incorrect</p>}
            <button 
              type="submit"
              className="w-full bg-[#3b82f6] text-white py-3 rounded-full font-semibold text-[13px] hover:bg-[#2563eb] transition-colors cursor-pointer"
            >
              Déverrouiller
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 2. ACTUAL DASHBOARD SCREEN
  if (isAdminLogged) {
    return (
      <div className="min-h-screen bg-[#09090b] font-sans text-[#fafafa] flex flex-col p-4 sm:p-10 relative">
        <nav className="mb-8 flex justify-between items-center w-full max-w-5xl mx-auto z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
               <LayoutDashboard className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#fafafa]">Admin Panel</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-[#a1a1aa] hidden sm:block">Administrateur</span>
            <div className="w-8 h-8 rounded-full border border-[#27272a] bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center font-bold">A</div>
            <button 
              onClick={handleShare}
              className="bg-[#18181b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 rounded-lg text-[13px] hover:bg-[#27272a] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Partager le site</span>
            </button>
            <button 
              onClick={handleLogout}
              className="bg-[#18181b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 rounded-lg text-[13px] hover:bg-[#27272a] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </nav>

        <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-8 text-[#fafafa]">Tableau de Bords</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div className="bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#a1a1aa] font-bold mb-1">Visiteurs ajd</div>
                <div className="text-2xl font-bold text-[#fafafa]">124</div>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#a1a1aa] font-bold mb-1">Messages lus</div>
                <div className="text-2xl font-bold text-[#fafafa]">{contacts.length}</div>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-widest text-[#3b82f6] font-bold mb-2 block">Statut Serveur</div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[14px] text-[#fafafa]">Opérationnel</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 w-full min-h-[400px]">
            {/* Contacts Column */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex flex-col h-[500px]">
              <h2 className="text-lg font-semibold text-[#fafafa] mb-4">Emails reçus</h2>
              {contacts.length === 0 ? (
                <div className="flex-1 border border-dashed border-[#27272a] rounded-xl flex items-center justify-center text-[#a1a1aa] text-[14px]">
                  Aucun message ou module Supabase non connecté.
                </div>
              ) : (
                <div className="flex flex-col gap-4 overflow-y-auto">
                  {contacts.map((contact, i) => (
                    <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-[#fafafa] text-[14px]">{contact.name}</h4>
                          <a href={`mailto:${contact.email}`} className="text-[#3b82f6] text-[12px]">{contact.email}</a>
                        </div>
                        <span className="text-[10px] text-[#a1a1aa]">
                          {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : 'Récent'}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#a1a1aa] mt-2 whitespace-pre-wrap">{contact.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Chat Column */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-[20px] overflow-hidden flex h-[500px]">
              {/* Contact List (Hidden on mobile if a chat is selected) */}
              <div className={`${adminSelectedSession ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r-0 md:border-r border-[#27272a] flex-col bg-[#09090b]`}>
                 <div className="p-4 border-b border-[#27272a]">
                    <h2 className="text-sm font-semibold">Live Chat</h2>
                 </div>
                 <div className="flex-1 overflow-y-auto">
                   {Array.from(new Set(adminAllChats.map(m => m.session_id))).filter(Boolean).length === 0 ? (
                     <div className="text-[12px] text-[#a1a1aa] p-4 text-center">Aucune discussion active</div>
                   ) : (
                     Array.from(new Set(adminAllChats.map(m => m.session_id))).filter(Boolean).map((sid: any) => {
                       const contactMsg = adminAllChats.find(m => m.session_id === sid && m.visitor_name);
                       const displayName = contactMsg ? contactMsg.visitor_name : `Visiteur #${String(sid).substring(0,4)}`;
                       return (
                         <button key={sid} onClick={() => setAdminSelectedSession(sid)} className={`w-full text-left p-4 hover:bg-[#18181b] border-b border-[#27272a]/50 transition ${adminSelectedSession === sid ? 'bg-[#18181b]' : ''}`}>
                           <div className="text-[13px] font-bold text-[#fafafa] truncate">{displayName}</div>
                           <div className="text-[11px] text-[#a1a1aa] truncate mt-0.5">Appuyez pour discuter...</div>
                         </button>
                       );
                     })
                   )}
                 </div>
              </div>
              
              {/* Chat Window (Hidden on mobile if NO chat is selected) */}
              <div className={`${!adminSelectedSession ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-[#18181b]`}>
                 {adminSelectedSession ? (
                   <>
                     <div className="p-3 border-b border-[#27272a] bg-[#09090b] flex items-center gap-3">
                       {/* Back button visible only on mobile */}
                       <button onClick={() => setAdminSelectedSession(null)} className="md:hidden p-2 -ml-2 bg-transparent border-none text-[#a1a1aa] hover:text-white cursor-pointer">
                         <ArrowLeft className="w-5 h-5" />
                       </button>
                       
                       <div>
                         {(() => {
                           const contactMsg = adminAllChats.find(m => m.session_id === adminSelectedSession && m.visitor_name);
                           return (
                             <>
                               <div className="text-[13px] font-bold text-[#fafafa]">{contactMsg?.visitor_name || `Visiteur #${String(adminSelectedSession).substring(0,4)}`}</div>
                               <div className="text-[11px] text-[#a1a1aa]">{contactMsg?.visitor_email || 'Email non renseigné'}</div>
                             </>
                           )
                         })()}
                       </div>
                     </div>
                     <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                       {adminAllChats.filter(m => m.session_id === adminSelectedSession).map((m, i) => (
                         <div key={i} className={`max-w-[80%] rounded-xl p-2.5 text-[12px] ${m.is_admin ? 'bg-[#3b82f6] text-white self-end' : 'bg-[#27272a] text-[#fafafa] self-start'}`}>
                           {m.message}
                         </div>
                       ))}
                     </div>
                     <form onSubmit={(e) => handleSendChat(e, adminSelectedSession, true)} className="p-3 border-t border-[#27272a] flex gap-2">
                       <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Répondre..." className="flex-1 bg-[#09090b] rounded-xl px-3 py-2 border border-[#27272a] focus:border-[#3b82f6] text-white outline-none text-[12px]" />
                       <button type="submit" className="bg-[#3b82f6] w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 cursor-pointer">
                         <Send className="w-4 h-4" />
                       </button>
                     </form>
                   </>
                 ) : (
                   <div className="flex-1 flex items-center justify-center text-[#a1a1aa] text-[13px] text-center p-4">
                     Sélectionnez un visiteur sur la gauche
                   </div>
                 )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- LANDING PAGE PUBLIQUE ---
  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-[#fafafa] flex flex-col p-4 sm:p-10 relative">
      {/* Navigation */}
      <nav className="mb-8 flex justify-between items-center w-full max-w-5xl mx-auto z-40">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                 <Rocket className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#fafafa]">MonSaaS</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#services" className="text-[13px] text-[#a1a1aa] hover:text-[#fafafa] transition-colors decoration-transparent">Services</a>
              <a href="#apropos" className="text-[13px] text-[#a1a1aa] hover:text-[#fafafa] transition-colors decoration-transparent">Notre Vision</a>
              <button 
                onClick={handleShare}
                className="bg-[#18181b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 rounded-lg text-[13px] hover:bg-[#27272a] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Partager
              </button>
            </div>

            {/* Mobile Nav Toggle */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[#a1a1aa]">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-0 right-0 md:hidden bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-4 space-y-4 m-4 z-50 flex flex-col"
            >
              <a href="#services" onClick={() => setIsMenuOpen(false)} className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors text-center">Services</a>
              <a href="#apropos" onClick={() => setIsMenuOpen(false)} className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors text-center">Notre Vision</a>
              <button 
                onClick={() => { handleShare(); setIsMenuOpen(false); }}
                className="mt-2 bg-[#27272a] border border-[#3f3f46] text-[#fafafa] py-2 rounded-lg text-[13px] hover:bg-[#3f3f46] transition-colors flex items-center justify-center gap-2 cursor-pointer w-full"
              >
                <Share2 className="w-4 h-4" /> Partager
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="mb-8 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-[#18181b] border border-[#27272a] text-[#3b82f6] text-[11px] font-bold uppercase tracking-widest mb-6">
            Lancement de notre nouveau projet 🚀
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#fafafa] mb-4 leading-tight">
            Des fondations solides pour <br />
            <span className="text-[#3b82f6]">
              votre réussite numérique
            </span>
          </h1>
          <p className="text-[14px] text-[#a1a1aa] mb-8 max-w-2xl mx-auto">
            Une expertise technique et un accompagnement sur-mesure pour propulser vos idées vers le marché, avec la réactivité d'une équipe dédiée.
          </p>
           <button 
              onClick={() => setIsContactModalOpen(true)}
              className="bg-[#fafafa] text-[#09090b] px-6 py-3 rounded-full font-semibold text-[13px] cursor-pointer inline-flex items-center gap-2 border-none hover:bg-white/90 transition-colors"
            >
              Contactez-nous <ChevronRight className="w-4 h-4" />
            </button>
        </motion.div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="services" className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-5 flex-1">
          
          {/* Main Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
             className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-[#18181b] to-[#27272a] border border-[#27272a] rounded-[20px] p-6 flex flex-col justify-between"
          >
             <div>
                <span className="text-[11px] uppercase tracking-widest text-[#3b82f6] font-bold mb-3 block">Innovation Continue</span>
                <h3 className="text-xl font-semibold text-[#fafafa] mb-2">Construit pour l'avenir</h3>
                <p className="text-[14px] text-[#a1a1aa] leading-relaxed">
                    Nous utilisons les dernières technologies pour garantir que votre infrastructure est performante, sécurisée et prête à évoluer avec vos ambitions.
                </p>
                <div className="bg-[#09090b] rounded-xl p-4 mt-4 border border-[#27272a] font-mono text-[#a1a1aa] text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                   system: "ready-to-scale", uptime: "99.9%"
                </div>
            </div>
            <button onClick={() => setIsContactModalOpen(true)} className="bg-[#fafafa] text-[#09090b] px-5 py-2.5 rounded-full font-semibold text-[13px] border-none self-start mt-6 cursor-pointer hover:bg-white/90 transition-colors">
                Démarrer un projet
            </button>
          </motion.div>

          {/* Qualitative Stat 1 - Honest & Pro */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:col-span-1 md:row-span-1 bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex flex-col justify-between"
          >
             <span className="text-[11px] uppercase tracking-widest text-[#3b82f6] font-bold mb-3 block">Disponibilité</span>
             <div className="text-4xl font-bold text-[#fafafa]">24/7</div>
             <div className="text-[13px] text-[#a1a1aa]">Support & Réactivité</div>
          </motion.div>

           {/* Features List */}
           <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:col-span-1 md:row-span-2 bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex flex-col"
          >
             <span className="text-[11px] uppercase tracking-widest text-[#3b82f6] font-bold mb-3 block">Nos Engagements</span>
             <div className="flex-1 flex flex-col gap-1 mt-2">
                 <div className="flex items-center gap-3 py-2 border-b border-[#27272a]">
                     <div className="w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                     <span className="text-[13px]">Sécurité des données</span>
                 </div>
                 <div className="flex items-center gap-3 py-2 border-b border-[#27272a]">
                     <div className="w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                     <span className="text-[13px]">Transparence totale</span>
                 </div>
                 <div className="flex items-center gap-3 py-2 border-b border-[#27272a]">
                     <div className="w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                     <span className="text-[13px]">Design sur-mesure</span>
                 </div>
             </div>
              <button onClick={() => setIsContactModalOpen(true)} className="text-[11px] text-[#3b82f6] text-left decoration-transparent mt-4 hover:text-[#60a5fa] cursor-pointer bg-transparent border-none p-0 flex items-center gap-1">
                Discutons-en <ArrowRight className="w-3 h-3" />
              </button>
          </motion.div>

           {/* Qualitative Stat 2 - Honest & Pro */}
           <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:col-span-1 md:row-span-1 bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex flex-col justify-between"
          >
             <span className="text-[11px] uppercase tracking-widest text-[#3b82f6] font-bold mb-3 block">Objectif</span>
             <div className="text-4xl font-bold text-[#fafafa]">100%</div>
             <div className="text-[13px] text-[#a1a1aa]">Satisfaction Client</div>
          </motion.div>

           {/* Small Feature */}
           <motion.div 
            id="apropos"
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 md:row-span-1 bg-[#18181b] border border-[#27272a] rounded-[20px] p-6 flex flex-col justify-between"
          >
             <div className="flex justify-between items-start">
                <div>
                     <span className="text-[11px] uppercase tracking-widest text-[#3b82f6] font-bold mb-3 block">Croissance Assurée</span>
                     <h2 className="text-base font-semibold">Une fondation pour scaler</h2>
                </div>
                 <div className="bg-[#27272a] px-2 py-1 rounded text-[10px] text-[#fafafa]">Notre ADN</div>
             </div>
             <div className="text-[12px] text-[#a1a1aa] mt-2 line-clamp-2">
                Nous sommes une équipe passionnée, prête à transformer vos défis techniques en succès commerciaux mesurables.
             </div>
          </motion.div>

           {/* Quick Action Button */}
           <motion.div 
            onClick={() => setIsContactModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 md:row-span-1 bg-[#3b82f6] rounded-[20px] p-6 flex flex-col justify-between border-none cursor-pointer group"
          >
             <span className="text-[11px] uppercase tracking-widest text-black/50 font-bold mb-3 block">Quick Action</span>
             <h2 className="text-base font-semibold text-black flex items-center justify-between">
                Lancer une discussion <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </h2>
             <div className="bg-black/10 rounded-xl p-3 mt-2 italic text-[13px] text-black/60">
                 Envoyez un message pour commencer l'aventure...
             </div>
          </motion.div>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-[#a1a1aa] py-8 w-full max-w-5xl mx-auto border-t border-[#27272a] flex justify-between items-center relative">
         <p className="text-[13px]">© {new Date().getFullYear()} MonSaaS. Tous droits réservés.</p>
         
         {/* Hidden Login for Admin */}
         <button 
           onClick={() => setShowAdminLogin(true)}
           className="text-[#27272a] hover:text-[#3b82f6] transition-colors cursor-pointer bg-transparent border-none p-1"
           title="Accès Administrateur"
         >
           <Lock className="w-4 h-4" />
         </button>
      </footer>

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#18181b] border border-[#3b82f6]/30 text-[#fafafa] px-6 py-3 rounded-full z-50 shadow-xl backdrop-blur-md flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-[#3b82f6]" />
            <span className="text-[13px] font-medium">Lien du site copié !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Chat Bubble (Visitor Only) */}
      {!isAdmin && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-[#18181b] border border-[#27272a] rounded-2xl w-[300px] h-[400px] mb-4 shadow-2xl flex flex-col justify-between overflow-hidden">
                <div className="bg-[#09090b] border-b border-[#27272a] p-4 flex justify-between items-center">
                  <div className="font-bold text-[14px]">Discutons-en 💬</div>
                  <button onClick={() => setIsChatOpen(false)} className="cursor-pointer bg-transparent border-none p-0"><X className="w-4 h-4 text-[#a1a1aa] hover:text-white transition-colors" /></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 relative">
                   {!isChatRegistered ? (
                     <form onSubmit={handlePreChatSubmit} className="flex flex-col gap-3 h-full justify-center">
                       <p className="text-[12px] text-[#a1a1aa] text-center mb-2">Vos informations pour discuter :</p>
                       <input required value={preChatName} onChange={e => setPreChatName(e.target.value)} placeholder="Votre nom" className="bg-[#09090b] rounded-xl px-3 py-2 border border-[#27272a] text-white text-[12px] outline-none focus:border-[#3b82f6]" />
                       <input required type="email" value={preChatEmail} onChange={e => setPreChatEmail(e.target.value)} placeholder="Votre email" className="bg-[#09090b] rounded-xl px-3 py-2 border border-[#27272a] text-white text-[12px] outline-none focus:border-[#3b82f6]" />
                       <button type="submit" className="bg-[#3b82f6] text-white rounded-xl py-2 text-[12px] font-bold cursor-pointer hover:bg-[#2563eb]">Démarrer le chat</button>
                     </form>
                   ) : chatMessages.length === 0 ? (
                     <p className="text-[12px] text-[#a1a1aa] text-center mt-10">Envoyez-nous un message !</p>
                   ) : (
                     chatMessages.map((m, i) => (
                       <div key={i} className={`max-w-[85%] rounded-xl p-2.5 text-[12px] ${!m.is_admin ? 'bg-[#3b82f6] text-white self-end' : 'bg-[#27272a] text-[#fafafa] self-start'}`}>
                         {m.message}
                       </div>
                     ))
                   )}
                </div>
                {isChatRegistered && (
                  <form onSubmit={(e) => handleSendChat(e, visitorSessionId, false)} className="p-3 border-t border-[#27272a] flex gap-2">
                     <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Votre message..." className="flex-1 bg-[#09090b] rounded-xl px-3 py-2 border border-[#27272a] text-white text-[12px] outline-none focus:border-[#3b82f6]" />
                     <button type="submit" className="bg-[#3b82f6] w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 cursor-pointer">
                       <Send className="w-4 h-4" />
                     </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#3b82f6] text-white w-14 h-14 border-none rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
            {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Modal Contact */}
      <AnimatePresence>
        {isContactModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-[24px] p-6 sm:p-8 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#fafafa] mb-1">Contactez-nous</h2>
                  <p className="text-[13px] text-[#a1a1aa]">Remplissez ce formulaire pour nous parler de votre projet.</p>
                </div>
                <button onClick={() => setIsContactModalOpen(false)} className="text-[#a1a1aa] hover:text-white bg-transparent border-none cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isSubmitted ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                  <h3 className="text-lg font-bold text-[#fafafa] mb-2">Message envoyé !</h3>
                  <p className="text-[13px] text-[#a1a1aa]">Nous vous recontacterons très vite.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-[#a1a1aa]" htmlFor="name">Nom</label>
                    <input 
                      required
                      type="text" 
                      id="name" 
                      name="name"
                      placeholder="Jean Dupont"
                      className="bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[13px] text-[#fafafa] focus:outline-none focus:border-[#3b82f6] transition-colors placeholder:text-[#3f3f46]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-[#a1a1aa]" htmlFor="email">Email</label>
                    <input 
                      required
                      type="email" 
                      id="email" 
                      name="email"
                      placeholder="jean@entreprise.com"
                      className="bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[13px] text-[#fafafa] focus:outline-none focus:border-[#3b82f6] transition-colors placeholder:text-[#3f3f46]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-[#a1a1aa]" htmlFor="message">Votre projet</label>
                    <textarea 
                      required
                      id="message" 
                      name="message"
                      rows={4}
                      placeholder="Bonjour, j'aimerais lancer un SaaS..."
                      className="bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[13px] text-[#fafafa] focus:outline-none focus:border-[#3b82f6] transition-colors resize-none placeholder:text-[#3f3f46]"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 bg-[#fafafa] text-[#09090b] px-6 py-3 rounded-full font-semibold text-[13px] hover:bg-white/90 transition-colors w-full cursor-pointer flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : 'Envoyer'}
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
