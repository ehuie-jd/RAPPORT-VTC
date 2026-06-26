import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Copy, CheckCircle2, Download, RefreshCw, 
  Car, Wallet, DollarSign, Clipboard, AlertCircle, Loader2, 
  FileText, Layout, Share2, History, Banknote, Bell, AlertTriangle, TrendingUp,
  Image as ImageIcon, X, Save, Search, Send, Edit
} from 'lucide-react';

const DEPENSES_DEFAUT = [
  "Carburant", "Lavage", "Réparation / Garage", "Vidange", "Frais de route", "Autre..."
];

const MOTIFS_RECETTE = [
  "Recette normale", "Demi-journée", "Panne (Incomplet)", "Autre..."
];

const TYPES_DETTES = [
  "Arriéré (Ancien reste)", "Avance / Prêt", "Dette (Garage/Pièce)", "Autre..."
];

const TYPES_CREANCES = [
  "Avance Chauffeur / Employé", "Crédit accordé (Client)", "Prêt Externe", "Autre..."
];

const TYPES_RAPPORT = [
  "Quotidien", "Hebdomadaire", "Mensuel", "Bilan Spécial"
];

const TYPES_ALERTES = [
  "Assurance / Vignette", "Visite Technique", "Vidange / Entretien", "Réparation urgente", "Autre..."
];

export default function App() {
  const [formData, setFormData] = useState({
    typeRapport: TYPES_RAPPORT[0],
    date: new Date().toISOString().split('T')[0],
    flotteName: 'Ma Flotte Auto',
    chauffeur: '',
    recettes: [{ id: Date.now(), vehicule: '', montant: '', motif: MOTIFS_RECETTE[0], justification: '' }],
    depenses: [],
    dettes: [],
    creances: [],
    caisseDisponible: '',
    versement: '',
    alertes: [],
    besoins: '',
    remarques: ''
  });

  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState('fiche'); // 'fiche' ou 'whatsapp'
  const [companyLogo, setCompanyLogo] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // NOUVEAUX ÉTATS : Historique et Recherche
  const [reportsHistory, setReportsHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('form'); // 'form' ou 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentEditId, setCurrentEditId] = useState(null);

  // Sauvegarde automatique dans le navigateur
  useEffect(() => {
    const saved = localStorage.getItem('fleet_pro_draft');
    const savedLogo = localStorage.getItem('fleet_pro_logo');
    const savedHistory = localStorage.getItem('fleet_pro_history');
    
    if (saved) setFormData(JSON.parse(saved));
    if (savedLogo) setCompanyLogo(savedLogo);
    if (savedHistory) setReportsHistory(JSON.parse(savedHistory));
    
    // Enregistrer le Service Worker (OBLIGATOIRE POUR L'INSTALLATION PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => { console.log('ServiceWorker enregistré avec succès:', registration.scope); },
        (err) => { console.log('Échec ServiceWorker:', err); }
      );
    }

    // Écouteur pour l'installation PWA (Progressive Web App)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    localStorage.setItem('fleet_pro_draft', JSON.stringify(formData));
  }, [formData]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result);
        localStorage.setItem('fleet_pro_logo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompanyLogo(null);
    localStorage.removeItem('fleet_pro_logo');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const dismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addRecette = () => {
    setFormData(prev => ({
      ...prev,
      recettes: [...prev.recettes, { id: Date.now(), vehicule: '', montant: '', motif: MOTIFS_RECETTE[0], justification: '' }]
    }));
  };

  const updateRecette = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      recettes: prev.recettes.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const removeRecette = (id) => {
    setFormData(prev => ({ ...prev, recettes: prev.recettes.filter(r => r.id !== id) }));
  };

  const addDepense = () => {
    setFormData(prev => ({
      ...prev,
      depenses: [...prev.depenses, { id: Date.now(), type: DEPENSES_DEFAUT[0], montant: '', detail: '' }]
    }));
  };

  const updateDepense = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      depenses: prev.depenses.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  const removeDepense = (id) => {
    setFormData(prev => ({ ...prev, depenses: prev.depenses.filter(d => d.id !== id) }));
  };

  const addDette = () => {
    setFormData(prev => ({
      ...prev,
      dettes: [...(prev.dettes || []), { id: Date.now(), type: TYPES_DETTES[0], montantDu: '', montantPaye: '', detail: '' }]
    }));
  };

  const updateDette = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      dettes: prev.dettes.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  const removeDette = (id) => {
    setFormData(prev => ({ ...prev, dettes: prev.dettes.filter(d => d.id !== id) }));
  };

  const addCreance = () => {
    setFormData(prev => ({
      ...prev,
      creances: [...(prev.creances || []), { id: Date.now(), type: TYPES_CREANCES[0], montantDu: '', montantRembourse: '', detail: '' }]
    }));
  };

  const updateCreance = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      creances: prev.creances.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const removeCreance = (id) => {
    setFormData(prev => ({ ...prev, creances: prev.creances.filter(c => c.id !== id) }));
  };

  const addAlerte = () => {
    setFormData(prev => ({
      ...prev,
      alertes: [...(prev.alertes || []), { id: Date.now(), type: TYPES_ALERTES[0], description: '' }]
    }));
  };

  const updateAlerte = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      alertes: prev.alertes.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAlerte = (id) => {
    setFormData(prev => ({ ...prev, alertes: prev.alertes.filter(a => a.id !== id) }));
  };

  const resetForm = () => {
    if(window.confirm('Voulez-vous vraiment effacer cette fiche pour en commencer une nouvelle ?')) {
      setFormData({
        typeRapport: TYPES_RAPPORT[0],
        date: new Date().toISOString().split('T')[0],
        flotteName: formData.flotteName,
        chauffeur: '',
        recettes: [{ id: Date.now(), vehicule: '', montant: '', motif: MOTIFS_RECETTE[0], justification: '' }],
        depenses: [],
        dettes: [],
        creances: [],
        caisseDisponible: '',
        versement: '',
        alertes: [],
        besoins: '',
        remarques: ''
      });
      setCurrentEditId(null);
    }
  };

  // NOUVEAU : Sauvegarder dans la base d'historique
  const saveReport = () => {
    const reportToSave = { ...formData, id: currentEditId || Date.now(), updatedAt: new Date().toISOString() };
    let newHistory;
    
    if (currentEditId) {
      newHistory = reportsHistory.map(r => r.id === currentEditId ? reportToSave : r);
    } else {
      newHistory = [reportToSave, ...reportsHistory]; // Ajoute le nouveau rapport en haut de la liste
    }
    
    setReportsHistory(newHistory);
    localStorage.setItem('fleet_pro_history', JSON.stringify(newHistory));
    setCurrentEditId(reportToSave.id);
    alert('✅ Rapport sauvegardé avec succès dans l\'historique !');
  };

  // NOUVEAU : Charger un rapport depuis l'historique
  const loadReport = (report) => {
    setFormData(report);
    setCurrentEditId(report.id);
    setActiveTab('form');
  };

  // NOUVEAU : Supprimer un rapport
  const deleteReport = (id) => {
    if(window.confirm('Voulez-vous vraiment supprimer ce rapport de l\'historique ?')) {
      const newHistory = reportsHistory.filter(r => r.id !== id);
      setReportsHistory(newHistory);
      localStorage.setItem('fleet_pro_history', JSON.stringify(newHistory));
      if (currentEditId === id) resetForm();
    }
  };

  // NOUVEAU : Filtre de recherche
  const filteredHistory = reportsHistory.filter(report => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.flotteName?.toLowerCase().includes(searchLower) ||
      report.chauffeur?.toLowerCase().includes(searchLower) ||
      report.date?.includes(searchLower) ||
      report.typeRapport?.toLowerCase().includes(searchLower)
    );
  });

  const formatArgent = (val) => {
    if (!val) return "0";
    const num = parseFloat(val);
    return isNaN(num) ? "0" : num.toLocaleString('fr-FR');
  };

  const totaux = useMemo(() => {
    const recettes = formData.recettes.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
    const depenses = formData.depenses.reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0);
    const resteDettes = (formData.dettes || []).reduce((sum, d) => sum + ((parseFloat(d.montantDu) || 0) - (parseFloat(d.montantPaye) || 0)), 0);
    
    // L'argent qui rentre des créances
    const creancesRecuperees = (formData.creances || []).reduce((sum, c) => sum + (parseFloat(c.montantRembourse) || 0), 0);
    
    // L'argent qui sort pour payer les anciennes dettes
    const totalArrieresPayes = (formData.dettes || []).reduce((sum, d) => sum + (parseFloat(d.montantPaye) || 0), 0);
    
    // SOLDE NET : Ce qui a été gagné aujourd'hui
    const solde = recettes + creancesRecuperees - depenses - totalArrieresPayes; 
    
    const caisseInitiale = parseFloat(formData.caisseDisponible) || 0;
    const versement = parseFloat(formData.versement) || 0;
    
    // CALCUL DU RESTE EN CAISSE : On ajoute le solde (qu'il soit positif ou négatif) à la caisse initiale, puis on retire le versement
    const resteEnCaisse = caisseInitiale + solde - versement;
    
    return { recettes, depenses, creancesRecuperees, totalArrieresPayes, solde, resteDettes, caisseInitiale, resteEnCaisse, versement };
  }, [formData.recettes, formData.depenses, formData.dettes, formData.creances, formData.caisseDisponible, formData.versement]);

  const generateText = () => {
    const d = formData;
    const dateFr = new Date(d.date).toLocaleDateString('fr-FR');
    
    let text = `📋 *RAPPORT ${d.typeRapport ? d.typeRapport.toUpperCase() : 'JOURNALIER'}*\n`;
    text += `🏢 Flotte : ${d.flotteName}\n`;
    if (d.chauffeur) text += `👤 Chauffeur / Gérant : ${d.chauffeur}\n`;
    text += `📅 Date : ${dateFr}\n\n`;

    text += `💰 *RECETTES VÉHICULES*\n`;
    d.recettes.forEach(r => {
      const nom = r.vehicule || 'Véhicule non précisé';
      const motif = r.motif === 'Autre...' ? '' : r.motif;
      const justif = r.justification ? `(${r.justification})` : '';
      const motifText = motif && motif !== 'Recette normale' ? `_[${motif}]_` : '';
      text += `• ${nom} : *${formatArgent(r.montant)} FCFA* ${motifText} ${justif}\n`;
    });
    text += `💵 *Total Recettes : ${formatArgent(totaux.recettes)} FCFA*\n\n`;

    if (d.depenses.length > 0) {
      text += `💸 *DÉPENSES*\n`;
      d.depenses.forEach(dep => {
        const type = dep.type === 'Autre...' ? (dep.customType || 'Autre') : dep.type;
        const detail = dep.detail ? `(${dep.detail})` : '';
        const nomDepense = [type, detail].filter(Boolean).join(' ');
        text += `• ${nomDepense} : *-${formatArgent(dep.montant)} FCFA*\n`;
      });
      text += `🔻 *Total Dépenses : ${formatArgent(totaux.depenses)} FCFA*\n\n`;
    }

    if (d.dettes && d.dettes.length > 0) {
      text += `📜 *ARRIÉRÉS & DETTES (À payer)*\n`;
      d.dettes.forEach(dette => {
        const type = dette.type === 'Autre...' ? dette.detail : dette.type;
        const du = parseFloat(dette.montantDu) || 0;
        const paye = parseFloat(dette.montantPaye) || 0;
        const reste = du - paye;
        text += `• ${type} :\n  Dû : ${formatArgent(du)} F | Remboursé : *${formatArgent(paye)} F*\n  _Reste non payé : ${formatArgent(reste)} F_\n`;
      });
      text += `\n`;
    }

    if (d.creances && d.creances.length > 0) {
      text += `📈 *CRÉANCES (Argent qu'on vous doit)*\n`;
      d.creances.forEach(creance => {
        const type = creance.type === 'Autre...' ? creance.detail : creance.type;
        const du = parseFloat(creance.montantDu) || 0;
        const paye = parseFloat(creance.montantRembourse) || 0;
        const reste = du - paye;
        text += `• ${type} :\n  Prêté/Dû : ${formatArgent(du)} F | Récupéré : *+${formatArgent(paye)} F*\n  _Reste à percevoir : ${formatArgent(reste)} F_\n`;
      });
      text += `\n`;
    }

    text += `📊 *BILAN DU JOUR*\n`;
    if (totaux.totalArrieresPayes > 0) {
      text += `• Dettes payées : *-${formatArgent(totaux.totalArrieresPayes)} FCFA*\n`;
    }
    text += `• Solde Net du jour : *${formatArgent(totaux.solde)} FCFA*\n`;
    text += `_(Recettes + Créances - Dépenses - Dettes payées)_\n\n`;
    
    if (d.caisseDisponible) text += `• 🏦 Caisse Générale (Initiale) : ${formatArgent(totaux.caisseInitiale)} FCFA\n`;
    if (d.versement) text += `• 🟢 Versement Propriétaire : -${formatArgent(totaux.versement)} FCFA\n`;
    
    if (d.caisseDisponible || d.versement || totaux.solde !== 0) {
      text += `• 🏁 *Reste en Caisse Générale : ${formatArgent(totaux.resteEnCaisse)} FCFA*\n`;
    }

    if (d.alertes && d.alertes.length > 0) {
      text += `\n⚠️ *ALERTES & VIGILANCE*\n`;
      d.alertes.forEach(a => {
        const type = a.type === 'Autre...' ? 'Alerte' : a.type;
        text += `• 🔴 [${type}] : ${a.description}\n`;
      });
    }

    if (d.besoins) text += `\n🆘 *BESOINS / DEMANDES*\n_${d.besoins}_\n`;
    if (d.remarques) text += `\n📝 *REMARQUES*\n_${d.remarques}_\n\n`;
    
    text += `🚀 _Généré par Flotte Pro_`;
    return text;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadImage = () => {
    const element = document.getElementById('fiche-preview');
    if (!element) return;
    
    setIsGenerating(true);
    
    const renderCanvas = () => {
      window.html2canvas(element, { scale: 2, backgroundColor: '#f8fafc', useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Fiche_${formData.date}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsGenerating(false);
      });
    };

    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = renderCanvas;
      document.body.appendChild(script);
    } else {
      renderCanvas();
    }
  };

  // NOUVEAU : Envoyer par WhatsApp directement
  const sendWhatsApp = () => {
    const text = encodeURIComponent(generateText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-24 lg:pb-8">
      
      {/* En-tête */}
      <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Car className="text-blue-400" /> Flotte <span className="font-light">Pro</span>
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 mr-1 sm:mr-2">
              <button onClick={() => setActiveTab('form')} className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${activeTab === 'form' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Edit size={12}/> <span className="hidden sm:inline">Édition</span>
              </button>
              <button onClick={() => setActiveTab('history')} className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <History size={12}/> Historique
              </button>
            </div>
            
            <button onClick={saveReport} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-colors">
              <Save size={14} /> <span className="hidden sm:inline">Sauvegarder</span>
            </button>
            
            <button onClick={resetForm} className="bg-slate-700 hover:bg-slate-600 text-[10px] sm:text-sm px-2 sm:px-3 py-2 rounded-lg flex items-center gap-1 transition-colors border border-slate-600">
              <RefreshCw size={14} /> <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-6 p-4 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* --- COLONNE GAUCHE : L'ÉDITEUR OU HISTORIQUE --- */}
        <div className="w-full lg:w-3/5 space-y-6">
          
          {activeTab === 'form' ? (
            <>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16}/> Infos Générales</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nom de la Flotte</label>
                    <input type="text" value={formData.flotteName} onChange={e => updateField('flotteName', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Type de Rapport</label>
                    <select value={formData.typeRapport} onChange={e => updateField('typeRapport', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm text-slate-700">
                      {TYPES_RAPPORT.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                    <input type="date" value={formData.date} onChange={e => updateField('date', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm" />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Chauffeur / Gérant (Optionnel)</label>
                    <input type="text" placeholder="Ex: Ali" value={formData.chauffeur} onChange={e => updateField('chauffeur', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm" />
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                     {companyLogo ? (
                       <div className="relative shrink-0">
                         <img src={companyLogo} alt="Logo" className="h-12 w-12 object-contain bg-white rounded-lg border border-slate-200 shadow-sm" />
                         <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"><X size={12}/></button>
                       </div>
                     ) : (
                       <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0">
                         <ImageIcon size={16} className="text-blue-500"/>
                         Ajouter un Logo
                         <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                       </label>
                     )}
                     <p className="text-xs text-slate-400">Ce logo apparaîtra en haut à droite sur votre fiche au format Image/PDF.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Wallet size={16}/> Recettes Véhicules</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-lg">Total : {formatArgent(totaux.recettes)} F</span>
                </div>
                
                <div className="space-y-3">
                  {formData.recettes.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 relative">
                      {formData.recettes.length > 1 && (
                        <button onClick={() => removeRecette(r.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Véhicule (Nom ou Immatriculation)</label>
                          <input type="text" placeholder="Ex: Suzuki Noire AB-1234..." value={r.vehicule} onChange={(e) => updateRecette(r.id, 'vehicule', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Montant (FCFA)</label>
                          <input type="number" placeholder="Ex: 15000" value={r.montant} onChange={(e) => updateRecette(r.id, 'montant', e.target.value)} className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Motif de la recette</label>
                           <select value={r.motif} onChange={(e) => updateRecette(r.id, 'motif', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-emerald-500">
                             {MOTIFS_RECETTE.map(opt => <option key={opt}>{opt}</option>)}
                           </select>
                        </div>
                        <div className="sm:col-span-2">
                           <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Détails / Justification (Optionnel)</label>
                           <input type="text" placeholder="Préciser si besoin (ex: demi-journée à cause de la pluie)..." value={r.justification} onChange={(e) => updateRecette(r.id, 'justification', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addRecette} className="w-full py-2.5 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16}/> Ajouter une Ligne de Recette
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-rose-600 uppercase tracking-widest flex items-center gap-2"><DollarSign size={16}/> Dépenses</h2>
                  <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-1 rounded-lg">Total : {formatArgent(totaux.depenses)} F</span>
                </div>
                
                <div className="space-y-3">
                  {formData.depenses.map((d) => (
                    <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 relative">
                      <button onClick={() => removeDepense(d.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Motif de dépense</label>
                          <select value={d.type} onChange={(e) => updateDepense(d.id, 'type', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-rose-500">
                            {DEPENSES_DEFAUT.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                          {d.type === 'Autre...' && (
                            <input type="text" placeholder="Quelle dépense ?" value={d.customType || ''} onChange={e => updateDepense(d.id, 'customType', e.target.value)} className="w-full mt-2 p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-rose-500" />
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Montant (FCFA)</label>
                          <input type="number" placeholder="Ex: 5000" value={d.montant} onChange={(e) => updateDepense(d.id, 'montant', e.target.value)} className="w-full p-2 bg-white border border-rose-200 rounded-lg text-sm font-bold text-rose-700 outline-none focus:border-rose-500" />
                        </div>
                        <div className="sm:col-span-2">
                           <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Détails de la dépense</label>
                           <input type="text" placeholder="Précisez (ex: nom du garage, type de pièce)..." value={d.detail || ''} onChange={e => updateDepense(d.id, 'detail', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-rose-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.depenses.length === 0 && <p className="text-xs text-slate-400 italic">Aucune dépense ajoutée.</p>}
                  <button onClick={addDepense} className="w-full py-2.5 border-2 border-dashed border-rose-300 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16}/> Ajouter une Dépense
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2"><History size={16}/> Arriérés & Dettes</h2>
                </div>
                
                <div className="space-y-3">
                  {(formData.dettes || []).map((dette) => (
                    <div key={dette.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 relative">
                      <button onClick={() => removeDette(dette.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Type d'arriéré / dette</label>
                        <select value={dette.type} onChange={(e) => updateDette(dette.id, 'type', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none pr-8">
                          {TYPES_DETTES.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        {dette.type === 'Autre...' && (
                          <input type="text" placeholder="Précisez..." value={dette.detail} onChange={e => updateDette(dette.id, 'detail', e.target.value)} className="w-full mt-2 p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Montant Dû (Total)</label>
                          <input type="number" placeholder="Ex: 10000" value={dette.montantDu} onChange={(e) => updateDette(dette.id, 'montantDu', e.target.value)} className="w-full p-2 bg-white border border-amber-200 rounded-lg text-sm font-bold text-amber-700 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Payé ce jour</label>
                          <input type="number" placeholder="Ex: 5000" value={dette.montantPaye} onChange={(e) => updateDette(dette.id, 'montantPaye', e.target.value)} className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 outline-none" />
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-500">Reste non payé : <span className="text-amber-600">{formatArgent((parseFloat(dette.montantDu) || 0) - (parseFloat(dette.montantPaye) || 0))} FCFA</span></span>
                      </div>
                    </div>
                  ))}
                  {(!formData.dettes || formData.dettes.length === 0) && <p className="text-xs text-slate-400 italic">Aucun arriéré ou dette.</p>}
                  <button onClick={addDette} className="w-full py-2.5 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16}/> Ajouter Dette / Arriéré
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-cyan-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-cyan-600 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16}/> Créances (Argent qu'on vous doit)</h2>
                </div>
                
                <div className="space-y-3">
                  {(formData.creances || []).map((creance) => (
                    <div key={creance.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 relative">
                      <button onClick={() => removeCreance(creance.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Type de Créance / Débiteur</label>
                        <select value={creance.type} onChange={(e) => updateCreance(creance.id, 'type', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none pr-8">
                          {TYPES_CREANCES.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        {creance.type === 'Autre...' && (
                          <input type="text" placeholder="Précisez..." value={creance.detail} onChange={e => updateCreance(creance.id, 'detail', e.target.value)} className="w-full mt-2 p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Montant Prêté/Dû</label>
                          <input type="number" placeholder="Ex: 15000" value={creance.montantDu} onChange={(e) => updateCreance(creance.id, 'montantDu', e.target.value)} className="w-full p-2 bg-white border border-cyan-200 rounded-lg text-sm font-bold text-cyan-700 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Récupéré ce jour</label>
                          <input type="number" placeholder="Ex: 5000" value={creance.montantRembourse} onChange={(e) => updateCreance(creance.id, 'montantRembourse', e.target.value)} className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 outline-none" />
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-500">Reste à percevoir : <span className="text-cyan-600">{formatArgent((parseFloat(creance.montantDu) || 0) - (parseFloat(creance.montantRembourse) || 0))} FCFA</span></span>
                      </div>
                    </div>
                  ))}
                  {(!formData.creances || formData.creances.length === 0) && <p className="text-xs text-slate-400 italic">Aucune créance en cours.</p>}
                  <button onClick={addCreance} className="w-full py-2.5 border-2 border-dashed border-cyan-300 text-cyan-600 rounded-xl text-sm font-bold hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16}/> Ajouter une Créance
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Clipboard size={16}/> Bilan & Caisse</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-teal-600 uppercase mb-1 flex items-center gap-1"><Banknote size={14}/> Caisse Générale (Initiale)</label>
                    <input type="number" placeholder="Ex: 138500" value={formData.caisseDisponible} onChange={e => updateField('caisseDisponible', e.target.value)} className="w-full p-2.5 bg-teal-50 border border-teal-200 rounded-xl outline-none focus:border-teal-500 font-bold text-sm text-teal-800" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-600 uppercase mb-1">Versement effectué</label>
                    <input type="number" placeholder="Ex: 10000" value={formData.versement} onChange={e => updateField('versement', e.target.value)} className="w-full p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm text-indigo-800" />
                  </div>
                  
                  <div className="sm:col-span-2 flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Reste en Caisse Générale :</span>
                    <span className={`text-lg font-black ${totaux.resteEnCaisse < 0 ? 'text-red-500' : 'text-slate-800'}`}>{formatArgent(totaux.resteEnCaisse)} FCFA</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Remarques générales</label>
                  <textarea placeholder="Signalements, informations générales..." value={formData.remarques} onChange={e => updateField('remarques', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm min-h-[80px] resize-none"></textarea>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2"><Bell size={16}/> Alertes & Besoins</h2>
                </div>
                
                <div className="space-y-3 mb-5">
                  {(formData.alertes || []).map((alerte) => (
                    <div key={alerte.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 relative">
                      <button onClick={() => removeAlerte(alerte.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Type d'alerte</label>
                          <select value={alerte.type} onChange={(e) => updateAlerte(alerte.id, 'type', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none">
                            {TYPES_ALERTES.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Détails / Date butoir</label>
                          <input type="text" placeholder="Ex: Expire le 12 Mars..." value={alerte.description} onChange={(e) => updateAlerte(alerte.id, 'description', e.target.value)} className="w-full p-2 bg-white border border-orange-200 rounded-lg text-sm font-medium outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addAlerte} className="w-full py-2.5 border-2 border-dashed border-orange-300 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16}/> Ajouter une Alerte (Assurance, Vidange...)
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-orange-600 uppercase mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Besoins / Demandes au propriétaire</label>
                  <textarea placeholder="Ex: Besoin d'argent pour acheter une nouvelle batterie..." value={formData.besoins} onChange={e => updateField('besoins', e.target.value)} className="w-full p-3 bg-orange-50/50 border border-orange-200 rounded-xl outline-none focus:border-orange-500 text-sm min-h-[60px] resize-none"></textarea>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <History className="text-blue-500"/> Archives
                </h2>
                <div className="relative w-full sm:w-64">
                  <input type="text" placeholder="Rechercher (date, chauffeur, type)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-medium" />
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <History size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Aucun rapport trouvé dans l'historique.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map(report => (
                    <div key={report.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase tracking-wider">{report.typeRapport}</span>
                          <span className="text-sm font-bold text-slate-800">{new Date(report.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="text-xs text-slate-600">Flotte: <span className="font-bold text-slate-800">{report.flotteName}</span> {report.chauffeur && ` | Chauffeur: ${report.chauffeur}`}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => loadReport(report)} className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                          <Edit size={14}/> Éditer
                        </button>
                        <button onClick={() => deleteReport(report.id)} className="px-3 py-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 text-xs rounded-lg transition-colors flex items-center justify-center">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- COLONNE DROITE : L'APERÇU --- */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4 lg:sticky lg:top-20">
          
          {/* Boutons d'Action Rapides */}
          <div className="bg-white p-2 flex border border-slate-200 rounded-2xl shadow-sm gap-2">
            <button onClick={() => setPreviewMode('fiche')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${previewMode === 'fiche' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              <Layout size={15}/> Fiche Pro
            </button>
            <button onClick={() => setPreviewMode('whatsapp')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${previewMode === 'whatsapp' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              <FileText size={15}/> WhatsApp
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={copyToClipboard} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm px-2">
              {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
              <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
            </button>
            <button onClick={sendWhatsApp} className="flex-1 py-3 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm px-2">
              <Send size={16} />
              <span className="hidden sm:inline">Envoyer</span>
            </button>
            <button onClick={downloadImage} disabled={isGenerating} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm px-2">
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="hidden sm:inline">Image</span>
            </button>
          </div>

          <div className="bg-slate-200/50 p-4 rounded-3xl border border-slate-200 flex justify-center overflow-hidden">
            
            {}
            {previewMode === 'fiche' && (
              <div id="fiche-preview" className="w-full max-w-sm bg-[#f8fafc] rounded-2xl shadow-lg border border-slate-200 flex flex-col overflow-hidden text-slate-800 pb-4">
                <div className="bg-slate-900 p-5 text-white">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-black uppercase tracking-wider leading-tight">{formData.flotteName || 'SANS NOM'}</h3>
                      <p className="text-[10px] text-blue-300 font-bold mt-1 tracking-widest uppercase">{formData.typeRapport}</p>
                    </div>
                    {companyLogo && (
                      <div className="shrink-0 bg-white p-1 rounded-xl shadow-sm">
                        <img src={companyLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                      </div>
                    )}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-300">Date: <br className="sm:hidden"/>{new Date(formData.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  {formData.chauffeur && <p className="text-xs font-medium text-slate-300 mt-3 pt-2 border-t border-slate-800">Chauffeur / Gérant: <span className="font-bold text-white">{formData.chauffeur}</span></p>}
                </div>

                <div className="p-5 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">1. Recettes</h4>
                    {formData.recettes.map(r => (
                      <div key={r.id} className="flex justify-between items-start text-sm py-1.5 border-b border-slate-200/60 last:border-0">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{r.vehicule || 'Véhicule non précisé'}</span>
                          {(r.motif !== 'Recette normale' || r.justification) && (
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {r.motif !== 'Recette normale' && <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded mr-1">{r.motif}</span>}
                              {r.justification}
                            </span>
                          )}
                        </div>
                        <span className="font-bold whitespace-nowrap ml-2">{formatArgent(r.montant)} F</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-slate-300 font-bold text-emerald-600">
                      <span>Total Recettes</span>
                      <span>{formatArgent(totaux.recettes)} FCFA</span>
                    </div>
                  </div>

                  {formData.depenses.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">2. Dépenses</h4>
                      {formData.depenses.map(d => (
                        <div key={d.id} className="flex justify-between items-start text-sm py-1.5 text-slate-600 border-b border-slate-200/60 last:border-0">
                          <div className="flex flex-col">
                            <span className="font-medium">{d.type === 'Autre...' ? (d.customType || 'Autre') : d.type}</span>
                            {d.detail && <span className="text-[10px] text-slate-400 mt-0.5">{d.detail}</span>}
                          </div>
                          <span className="font-bold text-rose-500 whitespace-nowrap ml-2">-{formatArgent(d.montant)} F</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-slate-300 font-bold text-rose-600">
                        <span>Total Dépenses</span>
                        <span>{formatArgent(totaux.depenses)} FCFA</span>
                      </div>
                    </div>
                  )}

                  {formData.dettes && formData.dettes.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1 flex items-center gap-1"><History size={12}/> Arriérés & Dettes</h4>
                      <div className="space-y-2">
                        {formData.dettes.map(dette => {
                           const du = parseFloat(dette.montantDu) || 0;
                           const paye = parseFloat(dette.montantPaye) || 0;
                           return (
                            <div key={dette.id} className="bg-amber-50/50 p-2 rounded-lg border border-amber-100 text-xs">
                              <div className="font-medium text-slate-700 mb-1">{dette.type === 'Autre...' ? dette.detail : dette.type}</div>
                              <div className="flex justify-between text-slate-600">
                                <span>Dû : {formatArgent(du)} F</span>
                                <span className="font-bold text-emerald-600">Payé : {formatArgent(paye)} F</span>
                              </div>
                              <div className="flex justify-between border-t border-amber-200/60 mt-1 pt-1 font-bold">
                                <span className="text-slate-500">Reste non payé</span>
                                <span className="text-amber-600">{formatArgent(du - paye)} F</span>
                              </div>
                            </div>
                           )
                        })}
                      </div>
                    </div>
                  )}

                  {formData.creances && formData.creances.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={12} className="text-cyan-500"/> Créances (Crédits)</h5>
                      <div className="space-y-2.5">
                        {formData.creances.map(creance => {
                           const du = parseFloat(creance.montantDu) || 0;
                           const paye = parseFloat(creance.montantRembourse) || 0;
                           return (
                            <div key={creance.id} className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100 text-xs shadow-sm">
                              <div className="font-bold text-slate-700 mb-1.5">{creance.type === 'Autre...' ? creance.detail : creance.type}</div>
                              <div className="flex justify-between text-slate-600 text-xs">
                                <span>Prêté/Dû : {formatArgent(du)} F</span>
                                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Récupéré : +{formatArgent(paye)} F</span>
                              </div>
                              <div className="flex justify-between border-t border-cyan-200 mt-2 pt-2 text-xs">
                                <span className="font-medium text-slate-500">Reste à percevoir :</span>
                                <span className="font-bold text-cyan-700">{formatArgent(du - paye)} F</span>
                              </div>
                            </div>
                           )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl shadow-sm">
                    <h5 className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Clipboard size={14} className="text-indigo-600"/> 3. Bilan & Caisse
                    </h5>

                    <div className="space-y-3 mt-4">
                      
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                           <span className="block font-bold text-slate-800 text-sm">Solde Net du jour</span>
                           <span className="text-[9px] text-slate-500">Recettes + Créances - Dép. {totaux.totalArrieresPayes > 0 ? '- Dettes' : ''}</span>
                        </div>
                        <span className="font-black text-slate-900 text-lg">{formatArgent(totaux.solde)} F</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <span className="block font-medium text-slate-600 text-sm">Caisse Générale (Initiale)</span>
                        <span className="font-bold text-slate-800 text-base">{formatArgent(totaux.caisseInitiale)} F</span>
                      </div>

                      {totaux.versement > 0 && (
                        <div className="px-2 pt-1 flex justify-between items-center text-xs text-rose-600 font-bold">
                          <span>Versement Propriétaire :</span>
                          <span>- {formatArgent(totaux.versement)} F</span>
                        </div>
                      )}

                      <div className="border-t border-slate-300 pt-4 pb-1 flex flex-col items-center mt-2">
                        <span className="font-bold text-slate-800 text-sm mb-1">Reste en Caisse Générale :</span>
                        <span className="font-black text-indigo-700 text-2xl tracking-tight">{formatArgent(totaux.resteEnCaisse)} FCFA</span>
                      </div>
                      
                    </div>
                  </div>

                  {(formData.alertes?.length > 0 || formData.besoins) && (
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-3">
                      <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Bell size={12}/> Alertes & Nécessités</h4>
                      
                      {formData.alertes?.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {formData.alertes.map(a => (
                            <div key={a.id} className="text-xs bg-white p-2 rounded-lg border border-orange-100 flex gap-2">
                              <span className="font-bold text-orange-800 shrink-0">{a.type === 'Autre...' ? 'Alerte' : a.type} :</span>
                              <span className="text-orange-900">{a.description}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {formData.besoins && (
                        <div className="text-xs bg-white p-2.5 rounded-lg border border-orange-200 text-orange-900 italic">
                          <span className="font-bold block mb-0.5 not-italic">Demandes / Besoins :</span>
                          {formData.besoins}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.remarques && (
                    <div className="text-xs bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-100 whitespace-pre-wrap mt-3">
                      <span className="font-bold block mb-1">Remarques :</span>
                      {formData.remarques}
                    </div>
                  )}

                  <div className="text-center pt-2 mt-2">
                     <span className="text-[8px] uppercase tracking-widest text-slate-300 font-bold">Généré par Flotte Pro</span>
                  </div>
                </div>
              </div>
            )}

            {previewMode === 'whatsapp' && (
              <div className="w-full max-w-sm bg-[#e1fcdc] rounded-2xl shadow-sm border border-emerald-200 p-5 font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {generateText()}
              </div>
            )}

          </div>

        </div>

      </main>

      {/* POPUP D'INSTALLATION PWA AUTOMATIQUE */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[400px] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shrink-0"><Download size={20}/></div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">Installer l'application</h4>
              <p className="text-xs text-slate-300 mt-0.5">Ajoutez Flotte Pro à votre écran d'accueil pour un accès direct et hors-ligne comme une vraie application.</p>
            </div>
            <button onClick={dismissInstall} className="text-slate-400 hover:text-white shrink-0 p-1"><X size={18}/></button>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={dismissInstall} className="flex-1 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">Plus tard</button>
            <button onClick={handleInstallClick} className="flex-1 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-sm">Installer maintenant</button>
          </div>
        </div>
      )}

    </div>
  );
}
