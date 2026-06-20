import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Copy, CheckCircle2, AlertCircle, FileText, History, 
  Edit, Save, Download, Image as ImageIcon, Smartphone, Check, 
  X, AlertTriangle, Car, Wallet, FileOutput, Loader2, UserPlus, 
  Users, Calendar, Paperclip, Share2, Printer, Clipboard, RotateCcw,
  Search, ShieldAlert, DollarSign, Send, ArrowRight, Eye, Layout,
  Phone, Video, MoreVertical, CheckCheck, TrendingUp, Camera
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

// --- Configuration Firebase Intégrée ---
const firebaseConfig = {
  apiKey: "AIzaSyAZrIZAkt4EHRYxRZZ0sbaK1gGERcNplIY",
  authDomain: "rapport-vehicule-bd4c6.firebaseapp.com",
  databaseURL: "https://rapport-vehicule-bd4c6-default-rtdb.firebaseio.com",
  projectId: "rapport-vehicule-bd4c6",
  storageBucket: "rapport-vehicule-bd4c6.firebasestorage.app",
  messagingSenderId: "770858666949",
  appId: "1:770858666949:web:bdd636cff310c68c4d59ac",
  measurementId: "G-PRXEN0M1KQ"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constantes & Données par défaut ---
const LISTE_MOTIFS = [
  "RAS (Journée normale)", 
  "Journée au garage", 
  "Maintenance / Réparation", 
  "Complément carburant", 
  "Panne en route", 
  "Chauffeur absent", 
  "Autre..."
];

const LISTE_DEPENSES = [
  "Carburant / Essence",
  "Lavage véhicule",
  "Pièces auto (Cardans, Biellettes, etc.)", 
  "Main d'œuvre mécanicien", 
  "Vidange moteur", 
  "Pneus & parallélisme",
  "Frais de route & péages",
  "Amendes & Contraventions",
  "Autre..."
];

const LISTE_CATEGORIES_ALERTES = [
  "Assurance expirée / Proche expiration",
  "Visite technique à renouveler",
  "Patente en retard de paiement",
  "Vidange imminente",
  "Contrôle médical chauffeur",
  "Autre problème administratif"
];

// Valeurs par défaut pour débloquer la première utilisation
const PROPRIETAIRES_PAR_DEFAUT = [
  { id: 'prop-1', name: 'M. Koné', phone: '0708091011', company: 'Koné Transports' }
];

const VEHICULES_PAR_DEFAUT = [
  "Suzuki blanche",
  "Suzuki bleue"
];

const formatAmount = (val) => {
  if (val === undefined || val === null || val === '') return "0";
  const num = parseFloat(val);
  return isNaN(num) ? "0" : num.toLocaleString('fr-FR');
};

const INITIAL_FORM_STATE = {
  reportDate: new Date().toISOString().split('T')[0],
  reportType: 'Quotidien',
  ownerId: 'prop-1',
  vehicles: [
    { id: 1, name: 'Suzuki blanche', amount: '', reason: 'RAS (Journée normale)', customReason: '' }
  ],
  expenses: [],
  arrears: {
    previous: '',
    paid: '',    
    reason: '',  
    proofName: '',
    proofImage: null, 
    cashierName: '' 
  },
  alerts: [],
  customProblem: ''
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('form');
  const [previewMode, setPreviewMode] = useState('fiche');
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [firebaseErrorMsg, setFirebaseErrorMsg] = useState('');
  
  const [owners, setOwners] = useState(PROPRIETAIRES_PAR_DEFAUT);
  const [availableVehicles, setAvailableVehicles] = useState(VEHICULES_PAR_DEFAUT);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  
  const [newOwner, setNewOwner] = useState({ name: '', phone: '', company: '' });
  const [newVehicleName, setNewVehicleName] = useState('');
  
  const [editingOwnerId, setEditingOwnerId] = useState(null);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // 1. Initialisation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = "theme-color";
      metaTheme.content = "#b45309";
      document.head.appendChild(metaTheme);
    }
    
    let metaApple = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!metaApple) {
      metaApple = document.createElement('meta');
      metaApple.name = "apple-mobile-web-app-capable";
      metaApple.content = "yes";
      document.head.appendChild(metaApple);
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Erreur d'authentification:", error);
        setFirebaseErrorMsg("Connexion Cloud impossible. Mode local activé.");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    
    // Chargement de l'historique local au démarrage
    const localHistory = localStorage.getItem('fleet_local_history');
    if (localHistory) {
      setHistory(JSON.parse(localHistory));
    }
    
    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Synchronisation Firebase (Avec fusion locale)
  useEffect(() => {
    if (!user) return;
    try {
      // Chemin standard corrigé !
      const q = collection(db, 'users', user.uid, 'reports');
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const fetchedReports = [];
          snapshot.forEach((doc) => fetchedReports.push({ id: doc.id, ...doc.data() }));
          
          setHistory(prevLocal => {
            // Fusionner l'historique Firebase et Local sans doublons
            const merged = [...fetchedReports];
            const firebaseIds = new Set(fetchedReports.map(r => r.id));
            
            prevLocal.forEach(localItem => {
              if (!firebaseIds.has(localItem.id)) {
                merged.push(localItem);
              }
            });
            return merged.sort((a, b) => new Date(b.reportDate).valueOf() - new Date(a.reportDate).valueOf());
          });
        }, 
        (error) => {
          console.error("Erreur Firestore Permissions:", error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // 3. Récupération des listes personnalisées
  useEffect(() => {
    const savedOwners = localStorage.getItem('fleet_owners');
    const savedVehicles = localStorage.getItem('fleet_vehicles');
    if (savedOwners) setOwners(JSON.parse(savedOwners));
    if (savedVehicles) setAvailableVehicles(JSON.parse(savedVehicles));
  }, []);

  const saveOwnersToLocal = (updatedOwners) => {
    setOwners(updatedOwners);
    localStorage.setItem('fleet_owners', JSON.stringify(updatedOwners));
  };

  const saveVehiclesToLocal = (updatedVehicles) => {
    setAvailableVehicles(updatedVehicles);
    localStorage.setItem('fleet_vehicles', JSON.stringify(updatedVehicles));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const resetForm = () => {
    setFormData({
      ...INITIAL_FORM_STATE,
      reportDate: new Date().toISOString().split('T')[0],
      ownerId: owners.length > 0 ? owners[0].id : 'prop-1'
    });
    setEditingId(null);
    showToast("📝 Nouveau formulaire vierge prêt !");
  };

  const saveToLocalHistory = (dataToSave) => {
    setHistory(prev => {
      let newHistory;
      if (editingId) {
        newHistory = prev.map(item => item.id === editingId ? dataToSave : item);
      } else {
        newHistory = [dataToSave, ...prev].sort((a, b) => new Date(b.reportDate).valueOf() - new Date(a.reportDate).valueOf());
      }
      localStorage.setItem('fleet_local_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // --- NOUVELLE FONCTION DE SAUVEGARDE SANS RESET ---
  const saveToHistory = async () => {
    if (owners.length === 0 || !formData.ownerId) {
      showToast('⚠️ Vous devez sélectionner un propriétaire !');
      return;
    }

    const dataToSave = { ...formData, updatedAt: new Date().toISOString() };
    if (!editingId) dataToSave.createdAt = new Date().toISOString();

    if (!user) {
      // Sauvegarde Hors-Ligne
      dataToSave.id = editingId || Date.now().toString();
      saveToLocalHistory(dataToSave);
      setEditingId(dataToSave.id); // On passe en mode "édition" pour ne pas créer de doublons si on reclique
      showToast('📌 Rapport sauvegardé localement (Hors-ligne)');
      return;
    }
    
    try {
      if (editingId) {
        // Mise à jour Cloud
        await setDoc(doc(db, 'users', user.uid, 'reports', editingId), dataToSave, { merge: true });
        showToast('📌 Rapport mis à jour avec succès (Cloud) !');
      } else {
        // Création Cloud
        const docRef = await addDoc(collection(db, 'users', user.uid, 'reports'), dataToSave);
        setEditingId(docRef.id); // L'ID firebase est affecté au formulaire courant
        showToast('📌 Nouveau rapport enregistré (Cloud) !');
      }
      // NOTE IMPORTANTE: On NE FAIT PLUS "resetForm()" ici. 
      // Le rapport reste à l'écran pour que l'utilisateur aille dans "Aperçu".
    } catch (error) {
      console.error("Firebase a bloqué, sauvegarde locale...", error);
      dataToSave.id = editingId || Date.now().toString();
      saveToLocalHistory(dataToSave);
      setEditingId(dataToSave.id);
      showToast('📌 Sauvegardé localement (Permission Cloud refusée)');
    }
  };

  const loadReport = (item) => {
    setEditingId(item.id);
    setFormData({
      reportDate: item.reportDate || INITIAL_FORM_STATE.reportDate,
      reportType: item.reportType || INITIAL_FORM_STATE.reportType,
      ownerId: item.ownerId || (owners.length > 0 ? owners[0].id : ''),
      vehicles: item.vehicles || [],
      expenses: item.expenses || [],
      arrears: item.arrears || { previous: '', paid: '', reason: '', proofName: '', proofImage: null, cashierName: '' },
      alerts: item.alerts || [],
      customProblem: item.customProblem || ''
    });
    setActiveTab('form');
    showToast('✏️ Rapport chargé pour édition');
  };

  const duplicateReport = (item) => {
    setEditingId(null); // Force a new ID
    setFormData({
      reportDate: new Date().toISOString().split('T')[0],
      reportType: item.reportType,
      ownerId: item.ownerId,
      vehicles: item.vehicles.map(v => ({ ...v, id: Math.random() })),
      expenses: item.expenses.map(e => ({ ...e, id: Math.random() })),
      arrears: { ...item.arrears, paid: '', proofName: '', proofImage: null },
      alerts: item.alerts || [],
      customProblem: item.customProblem || ''
    });
    setActiveTab('form');
    showToast('📋 Rapport copié. Modifiez-le puis Sauvegardez.');
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    // Tenter suppression Cloud
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'reports', itemToDelete));
      } catch (e) {
        console.error("Erreur Firebase delete", e);
      }
    }
    
    // Forcer suppression locale
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== itemToDelete);
      localStorage.setItem('fleet_local_history', JSON.stringify(newHistory));
      return newHistory;
    });

    showToast('🗑️ Rapport supprimé définitivement');
    if (editingId === itemToDelete) resetForm();
    setItemToDelete(null);
  };

  // --- GESTION PROPRIÉTAIRES ---
  const handleSaveOwner = (e) => {
    e.preventDefault();
    if (!newOwner.name.trim()) return;
    
    if (editingOwnerId) {
      const updated = owners.map(o => o.id === editingOwnerId ? { ...o, ...newOwner } : o);
      saveOwnersToLocal(updated);
      setEditingOwnerId(null);
      showToast('🏢 Propriétaire modifié');
    } else {
      const newO = { id: `prop-${Date.now()}`, ...newOwner };
      const updated = [...owners, newO];
      saveOwnersToLocal(updated);
      updateForm('ownerId', newO.id);
      showToast('🏢 Nouveau propriétaire ajouté');
    }
    setNewOwner({ name: '', phone: '', company: '' });
  };

  const handleDeleteOwner = (id) => {
    const updated = owners.filter(o => o.id !== id);
    saveOwnersToLocal(updated);
    if (formData.ownerId === id) updateForm('ownerId', updated.length > 0 ? updated[0].id : '');
    showToast('🗑️ Propriétaire supprimé');
  };

  const editOwnerSetup = (o) => {
    setNewOwner({ name: o.name, phone: o.phone || '', company: o.company || '' });
    setEditingOwnerId(o.id);
  };

  // --- GESTION VÉHICULES ---
  const handleSaveVehicleOption = (e) => {
    e.preventDefault();
    if (!newVehicleName.trim()) return;
    
    if (editingVehicleIndex !== null) {
      const updated = [...availableVehicles];
      updated[editingVehicleIndex] = newVehicleName.trim();
      saveVehiclesToLocal(updated);
      setEditingVehicleIndex(null);
      showToast('🚗 Véhicule modifié');
    } else {
      const updated = [...availableVehicles, newVehicleName.trim()];
      saveVehiclesToLocal(updated);
      showToast('🚗 Véhicule ajouté à la flotte');
    }
    setNewVehicleName('');
  };

  const handleDeleteVehicleOption = (index) => {
    const updated = availableVehicles.filter((_, i) => i !== index);
    saveVehiclesToLocal(updated);
    showToast('🗑️ Véhicule supprimé de la flotte');
  };

  const editVehicleSetup = (name, index) => {
    setNewVehicleName(name);
    setEditingVehicleIndex(index);
  };

  // --- PHOTO ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast("⏳ Compression de l'image...");
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > 800) { height *= 800 / width; width = 800; }
        } else {
          if (height > 800) { width *= 800 / height; height = 800; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
        
        updateArrears('proofImage', dataUrl);
        updateArrears('proofName', file.name);
        showToast("📸 Photo attachée au rapport !");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    updateArrears('proofImage', null);
    updateArrears('proofName', '');
  };

  // --- UPDATES FORMULAIRE ---
  const updateForm = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const updateVehicle = (id, field, value) => {
    const newVehicles = formData.vehicles.map(v => v.id === id ? { ...v, [field]: value } : v);
    updateForm('vehicles', newVehicles);
  };
  const addVehicle = () => {
    if (availableVehicles.length === 0) {
      showToast('⚠️ Vous devez d\'abord ajouter un véhicule dans "Gérer Véhicules".');
      setIsVehicleModalOpen(true);
      return;
    }
    updateForm('vehicles', [
      ...formData.vehicles, 
      { id: Date.now(), name: availableVehicles[0], amount: '', reason: 'RAS (Journée normale)', customReason: '' }
    ]);
  };
  const removeVehicle = (id) => updateForm('vehicles', formData.vehicles.filter(v => v.id !== id));

  const updateExpense = (id, field, value) => {
    const newExpenses = formData.expenses.map(e => e.id === id ? { ...e, [field]: value } : e);
    updateForm('expenses', newExpenses);
  };
  const addExpense = () => {
    if (availableVehicles.length === 0) {
      showToast('⚠️ Vous devez d\'abord ajouter un véhicule.');
      setIsVehicleModalOpen(true);
      return;
    }
    updateForm('expenses', [
      ...formData.expenses, 
      { id: Date.now(), vehicleName: availableVehicles[0], description: LISTE_DEPENSES[0], customDescription: '', amount: '' }
    ]);
  };
  const removeExpense = (id) => updateForm('expenses', formData.expenses.filter(e => e.id !== id));

  const addAlert = () => {
    if (availableVehicles.length === 0) {
      showToast('⚠️ Vous devez d\'abord ajouter un véhicule.');
      setIsVehicleModalOpen(true);
      return;
    }
    updateForm('alerts', [
      ...formData.alerts,
      { id: Date.now(), category: LISTE_CATEGORIES_ALERTES[0], vehicleName: availableVehicles[0], description: '', urgency: 'Orange' }
    ]);
  };
  const updateAlert = (id, field, value) => {
    const newAlerts = formData.alerts.map(a => a.id === id ? { ...a, [field]: value } : a);
    updateForm('alerts', newAlerts);
  };
  const removeAlert = (id) => updateForm('alerts', formData.alerts.filter(a => a.id !== id));

  const updateArrears = (field, value) => updateForm('arrears', { ...formData.arrears, [field]: value });

  // --- CALCULS FINANCIERS ---
  const totalRecette = useMemo(() => formData.vehicles.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0), [formData.vehicles]);
  const totalExpenses = useMemo(() => formData.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0), [formData.expenses]);
  const soldeDuJour = totalRecette - totalExpenses;

  const arrearsCalculated = useMemo(() => {
    const previous = parseFloat(formData.arrears.previous) || 0;
    const paid = parseFloat(formData.arrears.paid) || 0; 
    const totalDetteDûe = previous + soldeDuJour;
    const resteDette = totalDetteDûe - paid;
    return { totalDetteDûe, resteDette, soldeDuJour };
  }, [formData.arrears.previous, formData.arrears.paid, soldeDuJour]);

  const activeOwnerObj = useMemo(() => {
    return owners.find(o => o.id === formData.ownerId) || null;
  }, [formData.ownerId, owners]);

  const generateWhatsAppText = () => {
    const d = formData;
    const owner = activeOwnerObj;
    const formattedDate = new Date(d.reportDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let text = "";

    text += `📁 *RAPPORT DE GESTION* (${d.reportType.toUpperCase()})\n`;
    text += `🏢 *Propriété :* ${owner?.company || 'Non spécifié'} (${owner?.name || 'Inconnu'})\n`;
    text += `📅 *Date :* ${formattedDate}\n`;
    text += `───────────────────\n\n`;

    text += `💰 *1. RECETTES VÉHICULES*\n\n`;
    d.vehicles.forEach((v, index) => {
      const vName = v.name === 'Autre...' ? v.customReason : v.name;
      const vNotes = v.reason ? (v.reason === 'Autre...' ? v.customReason : v.reason) : '';
      text += `${index + 1}. *${vName}* : ${v.amount ? `${formatAmount(v.amount)} FCFA` : `0 FCFA`}${vNotes && vNotes !== 'RAS (Journée normale)' ? ` _(${vNotes})_` : ``}\n`;
    });
    text += `\n💵 *TOTAL RECETTE :* ${formatAmount(totalRecette)} FCFA\n`;
    text += `───────────────────\n\n`;

    text += `💸 *2. DÉPENSES & SOLDE*\n`;
    if (d.expenses.length > 0) {
      d.expenses.forEach(e => {
        const desc = e.description === 'Autre...' ? e.customDescription : e.description;
        text += `• ${e.vehicleName} - ${desc} : *${formatAmount(e.amount)} FCFA*\n`;
      });
      text += `\n🔻 *Total Dépenses :* ${formatAmount(totalExpenses)} FCFA\n`;
    } else {
      text += `\n_Aucune dépense enregistrée ce jour._\n`;
      text += `🔻 *Total Dépenses :* 0 FCFA\n`;
    }
    
    text += `\n💰 *SOLDE DU JOUR :* *${formatAmount(arrearsCalculated.soldeDuJour)} FCFA*\n`;
    text += `_(Recette totale - Dépenses)_\n`;
    text += `───────────────────\n\n`;

    text += `🧾 *3. VERSEMENT CAISSE & ARRIÉRÉS*\n`;
    text += `• Ancien arriéré : ${formatAmount(d.arrears.previous)} FCFA\n`;
    text += `• Total attendu (Solde + Arriéré) : ${formatAmount(arrearsCalculated.totalDetteDûe)} FCFA\n`;
    text += `\n💵 *Versement effectué :* *${formatAmount(d.arrears.paid)} FCFA*\n`;
    
    if (d.arrears.cashierName) {
      text += `👤 _Reçu en caisse par : ${d.arrears.cashierName}_\n`;
    }
    if (d.arrears.reason) {
      text += `📝 _Note : ${d.arrears.reason}_\n`;
    }
    if (d.arrears.proofImage) {
      text += `📎 _Preuve en image disponible dans la fiche PDF/Image_\n`;
    }
    
    text += `\n📌 *RESTE DÛ AU PROPRIÉTAIRE :* *${formatAmount(arrearsCalculated.resteDette)} FCFA*\n`;
    text += `───────────────────\n\n`;

    if (d.alerts.length > 0 || d.customProblem.trim()) {
      text += `⚠️ *4. ALERTES & REMARQUES*\n\n`;
      d.alerts.forEach(a => {
        text += `• [${a.urgency.toUpperCase()}] *${a.vehicleName}* : ${a.category} - ${a.description || 'RAS'}\n`;
      });
      if (d.customProblem.trim()) {
        text += `• Autre remarque : _${d.customProblem}_\n`;
      }
    } else {
      text += `✨ *4. ALERTES :* RAS (Aucune alerte)\n`;
    }
    
    text += `\n🚀 _Généré par Rapport Véhicule_`;
    return text;
  };

  const copyToClipboard = () => {
    try {
      const targetText = generateWhatsAppText();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(targetText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = targetText;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      showToast('📋 Rapport copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('❌ Erreur de copie');
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadImage = () => {
    const elementId = previewMode === 'whatsapp' ? 'report-whatsapp-container' : 'report-fiche-container';
    const element = document.getElementById(elementId);
    if (!element) {
      setActiveTab('preview');
      setTimeout(() => handleDownloadImage(), 500);
      return;
    }
    
    setIsGeneratingImg(true);
    showToast(`📸 Génération de l'image en cours...`);

    const generateImage = (el) => {
      window.html2canvas(el, { 
        scale: 2, 
        backgroundColor: previewMode === 'whatsapp' ? '#efeae2' : '#ffffff', 
        useCORS: true, 
        logging: false 
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `rapport-${previewMode}-${formData.reportDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsGeneratingImg(false);
        showToast('📸 Image téléchargée !');
      }).catch(err => {
        console.error(err);
        setIsGeneratingImg(false);
        showToast('❌ Échec de la capture d\'image');
      });
    };

    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = () => generateImage(element);
      document.body.appendChild(script);
    } else {
      setTimeout(() => generateImage(element), 100);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        showToast("🚀 Merci d'avoir installé l'application !");
      }
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const owner = owners.find(o => o.id === item.ownerId);
      const searchStr = `${item.reportType} ${item.reportDate} ${owner?.name || ''} ${owner?.company || ''}`.toLowerCase();
      return searchStr.includes(searchFilter.toLowerCase());
    });
  }, [history, searchFilter, owners]);

  const renderFormattedBubbleText = (rawText) => {
    const lines = rawText.split('\n');
    return lines.map((line, i) => {
      let textClass = "text-slate-800 whitespace-pre-wrap break-words";
      let containerClass = "min-h-[1.2rem] leading-relaxed";
      
      if (line.includes('📁') || line.includes('🏢') || line.includes('📅')) {
        textClass = "text-slate-700 font-medium";
      } else if (line.includes('💰') || line.includes('TOTAL RECETTE') || line.includes('SOLDE DU JOUR')) {
        textClass = "text-emerald-700 font-bold";
        containerClass += " mt-1";
      } else if (line.includes('💸') || line.includes('Total Dépenses') || line.includes('🔻')) {
        textClass = "text-rose-700 font-bold";
        containerClass += " mt-1";
      } else if (line.includes('🧾') || line.includes('RESTE DÛ') || line.includes('📌') || line.includes('Versement effectué')) {
        textClass = "text-purple-700 font-bold";
        containerClass += " mt-1";
      } else if (line.includes('⚠️') || line.includes('ALERTES')) {
        textClass = "text-amber-700 font-bold";
        containerClass += " mt-1";
      } else if (line.includes('✨')) {
        textClass = "text-teal-700 font-bold";
        containerClass += " mt-1";
      } else if (line.startsWith('•') || line.match(/^\d+\./)) {
        textClass = "text-slate-800 pl-1";
      } else if (line.startsWith('───')) {
        textClass = "text-emerald-300/60 font-light select-none";
      }

      const formatMarkdown = (str) => {
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\*([^*]+)\*/g, '<strong class="font-extrabold text-slate-900">$1</strong>')
          .replace(/_([^_]+)_/g, '<em class="text-slate-600 italic font-medium">$1</em>');
      };

      return (
        <div key={i} className={containerClass}>
          <span className={textClass} dangerouslySetInnerHTML={{ __html: formatMarkdown(line) }} />
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans text-slate-800 pb-20 lg:pb-8 flex flex-col">
      
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 font-bold border-2 border-slate-700 flex items-center gap-2 text-sm whitespace-nowrap">
           <AlertCircle size={16} className="text-amber-400"/> {toast}
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fef9c3] rounded-2xl shadow-2xl max-w-sm w-full p-6 border-4 border-amber-400 rotate-1 relative">
            <div className="absolute top-2 left-2 w-10 h-3 bg-amber-200/50 -rotate-12"></div>
            <div className="text-amber-700 mb-4 mx-auto w-12 h-12 flex items-center justify-center bg-amber-200 rounded-full">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-center text-amber-950 mb-2">Supprimer ?</h3>
            <p className="text-amber-800 text-center text-sm mb-6">Cette action détruira définitivement ce rapport.</p>
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-2 rounded-xl font-bold text-slate-700 bg-white border-2 border-slate-300 hover:bg-slate-100 transition-all">Garder</button>
              <button onClick={confirmDelete} className="flex-1 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow transition-all">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE GESTION PROPRIÉTAIRES --- */}
      {isOwnerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#eff6ff] rounded-2xl shadow-xl max-w-md w-full p-6 border-4 border-blue-400 relative flex flex-col max-h-[90vh]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/70 rotate-2 border-x border-dashed border-blue-200"></div>
            <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-blue-200 pb-2 shrink-0">
              <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2"><UserPlus size={20}/> Gérer les Propriétaires</h3>
              <button onClick={() => { setIsOwnerModalOpen(false); setEditingOwnerId(null); setNewOwner({ name: '', phone: '', company: '' }); }} className="text-blue-500 hover:text-blue-700"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveOwner} className="space-y-4 shrink-0 mb-4">
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Nom Complet</label>
                <input required type="text" placeholder="Ex: M. Koné" value={newOwner.name} onChange={e => setNewOwner({...newOwner, name: e.target.value})} className="w-full p-2.5 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Téléphone</label>
                  <input type="text" placeholder="Ex: 07 08..." value={newOwner.phone} onChange={e => setNewOwner({...newOwner, phone: e.target.value})} className="w-full p-2.5 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Flotte/Société</label>
                  <input type="text" placeholder="Ex: Transports..." value={newOwner.company} onChange={e => setNewOwner({...newOwner, company: e.target.value})} className="w-full p-2.5 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                {editingOwnerId && (
                  <button type="button" onClick={() => { setEditingOwnerId(null); setNewOwner({ name: '', phone: '', company: '' }); }} className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all">Annuler</button>
                )}
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                  {editingOwnerId ? 'Mettre à jour' : 'Ajouter Propriétaire'}
                </button>
              </div>
            </form>

            <div className="overflow-y-auto flex-1 pr-2 space-y-2 border-t border-blue-100 pt-4">
              <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">Liste des Propriétaires</label>
              {owners.length === 0 ? (
                <p className="text-xs text-blue-500 italic">Aucun propriétaire enregistré.</p>
              ) : (
                owners.map(o => (
                  <div key={o.id} className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center shadow-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-sm text-blue-950 truncate">{o.name}</p>
                      {o.company && <p className="text-[10px] text-blue-600 truncate">{o.company}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => editOwnerSetup(o)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14}/></button>
                      <button onClick={() => handleDeleteOwner(o.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE GESTION VÉHICULES --- */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fdf2f8] rounded-2xl shadow-xl max-w-sm w-full p-6 border-4 border-pink-400 relative flex flex-col max-h-[90vh]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/70 rotate-2 border-x border-dashed border-pink-200"></div>
            <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-pink-200 pb-2 shrink-0">
              <h3 className="text-lg font-bold text-pink-900 flex items-center gap-2"><Car size={20}/> Gérer les Véhicules</h3>
              <button onClick={() => { setIsVehicleModalOpen(false); setEditingVehicleIndex(null); setNewVehicleName(''); }} className="text-pink-500 hover:text-pink-700"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveVehicleOption} className="space-y-4 shrink-0 mb-4">
              <div>
                <label className="block text-xs font-bold text-pink-800 uppercase tracking-wider mb-1">Nom / Immatriculation</label>
                <input required type="text" placeholder="Ex: Suzuki Noire (AA-000-BB)" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} className="w-full p-2.5 bg-white border-2 border-pink-200 rounded-xl focus:border-pink-500 outline-none text-sm" />
              </div>
              <div className="flex gap-2">
                {editingVehicleIndex !== null && (
                  <button type="button" onClick={() => { setEditingVehicleIndex(null); setNewVehicleName(''); }} className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all">Annuler</button>
                )}
                <button type="submit" className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                  {editingVehicleIndex !== null ? 'Mettre à jour' : 'Ajouter Véhicule'}
                </button>
              </div>
            </form>

            <div className="overflow-y-auto flex-1 pr-2 space-y-2 border-t border-pink-100 pt-4">
              <label className="block text-[10px] font-bold text-pink-800 uppercase tracking-wider mb-2">Flotte enregistrée</label>
              {availableVehicles.length === 0 ? (
                <p className="text-xs text-pink-500 italic">Aucun véhicule enregistré.</p>
              ) : (
                availableVehicles.map((name, index) => (
                  <div key={index} className="bg-white p-3 rounded-xl border border-pink-100 flex justify-between items-center shadow-sm">
                    <span className="font-bold text-sm text-pink-950 truncate flex-1 pr-2">{name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => editVehicleSetup(name, index)} className="p-1.5 text-pink-500 hover:bg-pink-50 rounded-lg transition-colors"><Edit size={14}/></button>
                      <button onClick={() => handleDeleteVehicleOption(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <div className="bg-amber-100 p-1.5 rounded-lg text-amber-800"><Car size={20} /></div>
            Rapport <span className="text-amber-200 font-normal hidden sm:inline">Véhicule</span>
          </h1>
          
          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <button onClick={handleInstallClick} className="mr-2 text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl border border-white/30 flex items-center gap-1.5 transition-all shadow-sm">
                <Download size={14} /> Installer
              </button>
            )}

            <div className="hidden lg:flex bg-amber-950/40 p-1 rounded-xl border border-amber-600/30">
              <button onClick={() => setActiveTab('form')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'form' ? 'bg-amber-100 text-amber-950 shadow-sm' : 'text-amber-100 hover:text-white'}`}>Création Rapport</button>
              <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-amber-100 text-amber-950 shadow-sm' : 'text-amber-100 hover:text-white'}`}>Aperçu</button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-amber-100 text-amber-950 shadow-sm' : 'text-amber-100 hover:text-white'}`}>
                Historique <span className="bg-amber-800 text-white text-[10px] px-2 py-0.5 rounded-full">{history.length}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 w-full flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* --- COLONNE GAUCHE (FORMULAIRE) --- */}
        <div className={`w-full lg:w-[55%] xl:w-[60%] flex flex-col gap-6 ${activeTab !== 'form' && activeTab !== 'preview' ? 'lg:hidden hidden' : (activeTab === 'preview' ? 'hidden lg:flex' : 'flex')}`}>
          
          {activeTab === 'form' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              <div className="bg-[#eff6ff] p-6 rounded-3xl border-2 border-blue-200 relative shadow-[5px_5px_0px_0px_rgba(191,219,254,1)] transform hover:rotate-1 transition-transform">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/55 backdrop-blur-sm rotate-2 border-x border-dashed border-blue-300"></div>
                
                {editingId && (
                  <div className="absolute -top-3 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                    <Edit size={12}/> Modification
                  </div>
                )}

                <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-blue-200 pb-3">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2"><Users size={18}/> Propriété & Date</h3>
                  <button onClick={() => setIsOwnerModalOpen(true)} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                    <Plus size={14}/> Gérer Propriétaires
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Propriétaire</label>
                    {owners.length > 0 ? (
                      <select value={formData.ownerId} onChange={(e) => updateForm('ownerId', e.target.value)} className="w-full p-2.5 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none font-bold text-blue-900 text-sm cursor-pointer">
                        {owners.map(o => <option key={o.id} value={o.id}>{o.company ? `${o.company} (${o.name})` : o.name}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setIsOwnerModalOpen(true)} className="w-full p-2.5 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 text-sm font-bold flex items-center justify-center gap-1">
                        <Plus size={14} /> Ajouter un propriétaire
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Type de rapport</label>
                    <select value={formData.reportType} onChange={(e) => updateForm('reportType', e.target.value)} className="w-full p-2.5 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none font-bold text-blue-950 text-sm cursor-pointer">
                      <option value="Quotidien">Quotidien</option>
                      <option value="Hebdomadaire">Hebdomadaire</option>
                      <option value="Mensuel">Mensuel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Date</label>
                    <input type="date" value={formData.reportDate} onChange={(e) => updateForm('reportDate', e.target.value)} className="w-full p-2.5 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 outline-none font-bold text-blue-950 text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-[#fef9c3] p-6 rounded-3xl border-2 border-yellow-200 relative shadow-[5px_5px_0px_0px_rgba(254,240,138,1)] transform hover:-rotate-1 transition-transform">
                <div className="absolute -top-4 left-1/3 w-20 h-6 bg-white/55 backdrop-blur-sm -rotate-3 border-x border-dashed border-yellow-300"></div>

                <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-yellow-300 pb-3">
                  <h3 className="font-bold text-yellow-950 flex items-center gap-2"><Wallet size={18}/> 1. Recettes par Véhicule</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-yellow-800 bg-yellow-200/50 px-2 py-1 rounded-lg">Total : {formatAmount(totalRecette)} F</span>
                    <button type="button" onClick={() => setIsVehicleModalOpen(true)} className="text-xs bg-yellow-200/50 hover:bg-yellow-200 text-yellow-900 font-bold px-2 py-1 rounded-lg flex items-center gap-1"><Plus size={14}/> Gérer Véhicules</button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.vehicles.map((v, index) => (
                    <div key={v.id} className="p-4 bg-white/75 rounded-2xl border border-yellow-200 shadow-sm relative group">
                      <button onClick={() => removeVehicle(v.id)} className="absolute top-2 right-2 p-1.5 bg-white hover:bg-red-50 text-red-500 rounded-full border border-red-100 transition-colors">
                        <Trash2 size={13} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-yellow-800 mb-0.5 block">Véhicule</label>
                          <select value={v.name} onChange={(e) => updateVehicle(v.id, 'name', e.target.value)} className="w-full p-2 bg-yellow-50/50 border border-yellow-200 rounded-xl outline-none text-xs font-semibold text-yellow-950">
                            {availableVehicles.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-yellow-800 mb-0.5 block">Montant (FCFA)</label>
                          <div className="relative">
                            <input type="number" placeholder="Ex: 15000" value={v.amount} onChange={(e) => updateVehicle(v.id, 'amount', e.target.value)} className="w-full p-2 bg-yellow-50/50 border border-yellow-200 rounded-xl outline-none text-xs font-bold text-emerald-700 pr-10" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-yellow-600">FCFA</span>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-yellow-800 mb-0.5 block">Justification / Incident (Facultatif)</label>
                          <select value={v.reason} onChange={(e) => updateVehicle(v.id, 'reason', e.target.value)} className="w-full p-2 bg-yellow-50/50 border border-yellow-200 rounded-xl outline-none text-xs text-yellow-900">
                            {LISTE_MOTIFS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          {v.reason === 'Autre...' && (
                            <input type="text" placeholder="Précisez la remarque..." value={v.customReason} onChange={(e) => updateVehicle(v.id, 'customReason', e.target.value)} className="w-full p-2 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg outline-none text-xs" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={addVehicle} className="w-full py-2.5 rounded-2xl border-2 border-dashed border-yellow-400 text-yellow-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-yellow-100 transition-all">
                    <Plus size={16}/> Ajouter un Véhicule
                  </button>
                </div>
              </div>

              <div className="bg-[#dcfce7] p-6 rounded-3xl border-2 border-green-200 relative shadow-[5px_5px_0px_0px_rgba(187,247,208,1)] transform hover:rotate-1 transition-transform">
                <div className="absolute -top-4 right-1/4 w-20 h-6 bg-white/55 backdrop-blur-sm rotate-3 border-x border-dashed border-green-300"></div>

                <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-green-300 pb-3">
                  <h3 className="font-bold text-green-950 flex items-center gap-2"><DollarSign size={18}/> 2. Dépenses du Jour</h3>
                  <span className="text-[10px] sm:text-xs font-bold text-green-800 bg-green-200/50 px-2 py-1 rounded-lg">Total : {formatAmount(totalExpenses)} F</span>
                </div>

                <div className="space-y-4">
                  {formData.expenses.map((e) => (
                    <div key={e.id} className="p-4 bg-white/75 rounded-2xl border border-green-200 shadow-sm relative">
                      <button onClick={() => removeExpense(e.id)} className="absolute top-2 right-2 p-1.5 bg-white hover:bg-red-50 text-red-500 rounded-full border border-red-100 transition-colors">
                        <Trash2 size={13} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-green-800 mb-0.5 block">Véhicule concerné</label>
                          <select value={e.vehicleName} onChange={(ev) => updateExpense(e.id, 'vehicleName', ev.target.value)} className="w-full p-2 bg-green-50/50 border border-green-200 rounded-xl outline-none text-xs text-green-950">
                            {availableVehicles.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-green-800 mb-0.5 block">Montant dépensé</label>
                          <div className="relative">
                            <input type="number" placeholder="Ex: 5000" value={e.amount} onChange={(ev) => updateExpense(e.id, 'amount', ev.target.value)} className="w-full p-2 bg-green-50/50 border border-green-200 rounded-xl outline-none text-xs font-bold text-green-700 pr-10" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600">FCFA</span>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-green-800 mb-0.5 block">Nature de la dépense</label>
                          <select value={e.description} onChange={(ev) => updateExpense(e.id, 'description', ev.target.value)} className="w-full p-2 bg-green-50/50 border border-green-200 rounded-xl outline-none text-xs text-green-900">
                            {LISTE_DEPENSES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          {e.description === 'Autre...' && (
                            <input type="text" placeholder="Précisez la dépense..." value={e.customDescription} onChange={(ev) => updateExpense(e.id, 'customDescription', ev.target.value)} className="w-full p-2 mt-1.5 bg-green-50 border border-green-200 rounded-lg outline-none text-xs" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={addExpense} className="w-full py-2.5 rounded-2xl border-2 border-dashed border-green-400 text-green-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-100 transition-all">
                    <Plus size={16}/> Ajouter une Dépense
                  </button>
                </div>
              </div>

              <div className="bg-[#f3e8ff] p-6 rounded-3xl border-2 border-purple-200 relative shadow-[5px_5px_0px_0px_rgba(233,213,255,1)] transform hover:-rotate-1 transition-transform">
                <div className="absolute -top-4 left-1/4 w-20 h-6 bg-white/55 backdrop-blur-sm -rotate-2 border-x border-dashed border-purple-300"></div>

                <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-purple-300 pb-3">
                  <h3 className="font-bold text-purple-950 flex items-center gap-2"><Clipboard size={18}/> 3. Bilan & Versement Caisse</h3>
                  <span className="text-[10px] sm:text-xs font-bold text-purple-800 bg-purple-200/50 px-2 py-1 rounded-lg">Reste dû : {formatAmount(arrearsCalculated.resteDette)} F</span>
                </div>

                <div className="bg-white/60 p-3 rounded-xl border border-purple-100 mb-5 flex justify-between items-center shadow-sm">
                  <span className="text-xs font-bold text-purple-800">Solde du Jour (Recette - Dépenses) :</span>
                  <span className="text-sm font-black text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">{formatAmount(arrearsCalculated.soldeDuJour)} FCFA</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-purple-800 mb-0.5 block">Ancien Arriéré (Dette d'hier)</label>
                    <div className="relative">
                      <input type="number" placeholder="0" value={formData.arrears.previous} onChange={e => updateArrears('previous', e.target.value)} className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl focus:border-purple-500 outline-none text-sm text-purple-900 pr-12 font-bold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-600">FCFA</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-purple-800 mb-0.5 block">Versement en caisse effectué</label>
                    <div className="relative">
                      <input type="number" placeholder="0" value={formData.arrears.paid} onChange={e => updateArrears('paid', e.target.value)} className="w-full p-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl focus:border-emerald-500 outline-none text-sm text-emerald-900 pr-12 font-bold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">FCFA</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-purple-800 mb-0.5 block">Reçu en caisse par (Nom)</label>
                    <input type="text" placeholder="Ex: Alice / M. Bamba" value={formData.arrears.cashierName || ''} onChange={e => updateArrears('cashierName', e.target.value)} className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl focus:border-purple-500 outline-none text-sm text-purple-900 font-medium" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-purple-800 mb-0.5 block">Note sur le versement (Optionnel)</label>
                    <input type="text" placeholder="Ex: Wave, Mobile Money..." value={formData.arrears.reason} onChange={e => updateArrears('reason', e.target.value)} className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl focus:border-purple-500 outline-none text-sm text-purple-900" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-[10px] uppercase font-bold text-purple-800 mb-1.5 block">Preuve du versement (Photo)</label>
                  
                  {!formData.arrears.proofImage ? (
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                      <button 
                        onClick={() => fileInputRef.current.click()} 
                        className="w-full py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-xl border-2 border-dashed border-purple-300 text-sm flex justify-center items-center gap-2 transition-all"
                      >
                        <Camera size={18}/> Prendre une photo ou choisir
                      </button>
                    </div>
                  ) : (
                    <div className="relative inline-block border-4 border-white shadow-md rounded-xl overflow-hidden bg-slate-100">
                      <img src={formData.arrears.proofImage} alt="Preuve" className="h-32 object-cover" />
                      <button 
                        onClick={removeImage} 
                        className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full shadow hover:bg-red-700"
                        title="Supprimer l'image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#ffedd5] p-6 rounded-3xl border-2 border-orange-200 relative shadow-[5px_5px_0px_0px_rgba(253,186,116,1)] transform hover:rotate-1 transition-transform">
                <div className="absolute -top-4 right-1/3 w-20 h-6 bg-white/55 backdrop-blur-sm rotate-2 border-x border-dashed border-orange-300"></div>

                <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-orange-300 pb-3">
                  <h3 className="font-bold text-orange-950 flex items-center gap-2"><ShieldAlert size={18}/> 4. Alertes & Remarques</h3>
                </div>

                <div className="space-y-4">
                  {formData.alerts.map((a) => (
                    <div key={a.id} className="p-4 bg-white/75 rounded-2xl border border-orange-200 shadow-sm relative">
                      <button onClick={() => removeAlert(a.id)} className="absolute top-2 right-2 p-1.5 bg-white hover:bg-red-50 text-red-500 rounded-full border border-red-100 transition-colors">
                        <Trash2 size={13} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-orange-800 mb-0.5 block">Catégorie</label>
                          <select value={a.category} onChange={(e) => updateAlert(a.id, 'category', e.target.value)} className="w-full p-2 bg-orange-50/50 border border-orange-200 rounded-xl outline-none text-xs text-orange-950">
                            {LISTE_CATEGORIES_ALERTES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-orange-800 mb-0.5 block">Véhicule concerné</label>
                          <select value={a.vehicleName} onChange={(e) => updateAlert(a.id, 'vehicleName', e.target.value)} className="w-full p-2 bg-orange-50/50 border border-orange-200 rounded-xl outline-none text-xs text-orange-950">
                            {availableVehicles.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-orange-800 mb-0.5 block">Détails (Dates, etc.)</label>
                          <input type="text" placeholder="Ex: Expire le 12 Mars..." value={a.description} onChange={(e) => updateAlert(a.id, 'description', e.target.value)} className="w-full p-2 bg-white border-2 border-orange-200 rounded-xl outline-none text-xs text-orange-900" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={addAlert} className="w-full py-2.5 rounded-2xl border-2 border-dashed border-orange-400 text-orange-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-100 transition-all">
                    <Plus size={16}/> Ajouter une Alerte Administrative
                  </button>

                  <div className="pt-3 border-t border-dashed border-orange-300">
                    <label className="text-[10px] uppercase font-bold text-orange-800 mb-1 block">Remarque libre / Autre problème</label>
                    <textarea placeholder="Une info importante à signaler au propriétaire ?" value={formData.customProblem} onChange={(e) => updateForm('customProblem', e.target.value)} className="w-full p-3 bg-white border-2 border-orange-200 rounded-xl focus:border-orange-500 outline-none text-sm text-orange-900 min-h-[80px] resize-none"></textarea>
                  </div>
                </div>
              </div>

              {/* BARRE D'ACTIONS DU FORMULAIRE */}
              <div className="flex gap-3 pt-4 sticky bottom-4 z-10 lg:static lg:bg-transparent bg-[#faf8f5]/90 backdrop-blur-sm p-4 lg:p-0 rounded-2xl shadow-[0_-10px_15px_-3px_rgba(250,248,245,0.9)] lg:shadow-none">
                <button onClick={resetForm} className="px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                  <RotateCcw size={18} />
                  <span className="hidden sm:inline">Nouveau</span>
                </button>
                <button onClick={saveToHistory} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> {editingId ? 'Mettre à jour' : 'Sauvegarder'}
                </button>
              </div>

            </div>
          )}

          {/* --- COLONNE GAUCHE (HISTORIQUE) --- */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-300 pb-32 lg:pb-0">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <History className="text-amber-600" /> Archives de vos rapports
                </h2>
                <div className="relative w-full sm:w-64">
                  <input type="text" placeholder="Rechercher..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 ring-amber-500/50" />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
                    <History size={40} className="mx-auto mb-3 opacity-50"/>
                    <p>Aucun rapport trouvé dans l'historique.</p>
                  </div>
                ) : (
                  filteredHistory.map((item) => {
                    const owner = owners.find(o => o.id === item.ownerId);
                    return (
                      <div key={item.id} className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-0"></div>
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-md uppercase tracking-wider">{item.reportType}</span>
                              <h4 className="font-bold text-slate-800 mt-2 text-lg">{new Date(item.reportDate).toLocaleDateString('fr-FR')}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-500">{owner?.company || owner?.name || 'Inconnu'}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-4 text-sm text-slate-600 mb-4 border-y border-slate-100 py-3">
                            <div>
                              <span className="block text-[10px] uppercase text-slate-400 font-bold">Véhicules</span>
                              <span className="font-bold text-slate-700">{item.vehicles?.length || 0}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase text-slate-400 font-bold">Dépenses</span>
                              <span className="font-bold text-red-500">{item.expenses?.length || 0}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => loadReport(item)} className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors">
                              <Edit size={14}/> Éditer
                            </button>
                            <button onClick={() => duplicateReport(item)} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors">
                              <Copy size={14}/> Dupliquer
                            </button>
                            <button onClick={() => setItemToDelete(item.id)} className="w-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* --- COLONNE DROITE : APERÇU --- */}
        <div className={`w-full lg:w-[45%] xl:w-[40%] flex-col gap-4 ${activeTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full lg:h-[calc(100vh-120px)] lg:sticky lg:top-24">
            
            <div className="bg-slate-100 p-2 flex border-b border-slate-200 gap-1 shrink-0">
              <button 
                onClick={() => setPreviewMode('fiche')} 
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${previewMode === 'fiche' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Layout size={15}/> 📋 Fiche Document Pro
              </button>
              <button 
                onClick={() => setPreviewMode('whatsapp')} 
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${previewMode === 'whatsapp' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText size={15}/> 💬 Mode Texte
              </button>
            </div>

            <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Aperçu en Temps Réel</h3>
              </div>
              <div className="flex gap-1.5">
                 <button onClick={copyToClipboard} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 transition-colors tooltip relative" title="Copier le texte brut">
                   {copied ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
                 </button>
                 <button onClick={shareOnWhatsApp} className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-xl transition-colors tooltip" title="Partager">
                   <Share2 size={16} />
                 </button>
                 <button onClick={handleDownloadImage} disabled={isGeneratingImg} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all tooltip flex items-center gap-1.5 text-xs font-bold" title="Télécharger l'image">
                   {isGeneratingImg ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                   <span className="hidden sm:inline">Enregistrer</span>
                 </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-slate-50 flex flex-col items-center pb-32 lg:pb-6">
              
              {previewMode === 'whatsapp' && (
                <div 
                  id="report-whatsapp-container" 
                  className="w-full max-w-lg rounded-3xl shadow-sm border border-emerald-200 bg-[#e1fcdc] p-6 sm:p-8 flex flex-col transform transition-transform"
                >
                  <div className="font-mono text-[14px] sm:text-[15px] leading-relaxed text-slate-800 tracking-tight space-y-1">
                    {renderFormattedBubbleText(generateWhatsAppText())}
                  </div>
                </div>
              )}

              {previewMode === 'fiche' && (
                <div 
                  id="report-fiche-container" 
                  className="w-full max-w-md lg:max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 flex flex-col p-6 sm:p-8 text-slate-800"
                >
                  <div className="h-2 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6 sm:mb-8 rounded-t-3xl"></div>

                  <div className="flex justify-between items-start mb-6 border-b border-dashed border-slate-200 pb-5">
                    <div className="flex-1 pr-2">
                      <span className="text-[10px] sm:text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Rapport {formData.reportType}
                      </span>
                      <h4 className="text-xl font-bold text-slate-900 mt-2.5 flex items-center gap-1.5">
                        <Car size={22} className="text-indigo-600"/> Fiche d'Activité
                      </h4>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {new Date(formData.reportDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right flex-1 pl-2 break-words">
                      <span className="text-sm font-bold text-slate-700 block">{activeOwnerObj?.company || 'Indépendant'}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{activeOwnerObj?.name}</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Wallet size={14} className="text-amber-500"/> 1. Recettes véhicules
                    </h5>
                    <div className="space-y-2.5">
                      {formData.vehicles.map((v) => {
                        const vName = v.name === 'Autre...' ? v.customReason : v.name;
                        const hasIncident = v.reason && v.reason !== 'RAS (Journée normale)';
                        return (
                          <div key={v.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="font-bold text-slate-700 block whitespace-normal break-words">{vName}</span>
                              {hasIncident && (
                                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-medium mt-1 inline-block whitespace-normal break-words">
                                  ⚠️ {v.reason === 'Autre...' ? v.customReason : v.reason}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg shrink-0 text-sm">
                              {v.amount ? `${formatAmount(v.amount)} F` : '0 F'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex justify-between items-center text-sm font-bold text-amber-900 mt-3 shadow-sm">
                      <span>Recette Totale :</span>
                      <span className="text-lg text-amber-700">{formatAmount(totalRecette)} FCFA</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-500"/> 2. Dépenses & Solde
                    </h5>
                    {formData.expenses.length > 0 ? (
                      <div className="space-y-2.5">
                        {formData.expenses.map((e) => {
                          const desc = e.description === 'Autre...' ? e.customDescription : e.description;
                          return (
                            <div key={e.id} className="bg-red-50/40 p-3 rounded-xl border border-red-100/50 flex justify-between items-center text-sm">
                              <span className="text-slate-600 font-medium whitespace-normal break-words pr-2">{e.vehicleName} - {desc}</span>
                              <span className="font-bold text-red-600 shrink-0">- {formatAmount(e.amount)} F</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic pl-1">Aucune dépense signalée.</p>
                    )}

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center text-sm font-bold mt-3 shadow-sm">
                      <span className="text-slate-700">Solde généré ce jour :</span>
                      <span className="text-lg text-slate-900">{formatAmount(arrearsCalculated.soldeDuJour)} FCFA</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl shadow-sm">
                    <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Clipboard size={14} className="text-indigo-600"/> 3. Bilan & Versement
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                        <span className="block text-xs text-slate-400 font-medium mb-1">Ancienne Dette</span>
                        <span className="font-bold text-slate-700">{formatAmount(formData.arrears.previous)} F</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                        <span className="block text-xs text-slate-400 font-medium mb-1">Attendu total</span>
                        <span className="font-bold text-slate-700">{formatAmount(arrearsCalculated.totalDetteDûe)} F</span>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 col-span-2 flex flex-col justify-center shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="block text-xs text-emerald-800 font-bold uppercase tracking-wider">Versement Caisse</span>
                          <span className="font-bold text-emerald-700 text-lg">{formatAmount(formData.arrears.paid)} FCFA</span>
                        </div>
                        {(formData.arrears.cashierName || formData.arrears.reason) && (
                           <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-700 font-medium whitespace-normal break-words">
                             {formData.arrears.cashierName && <span className="block">Reçu par: {formData.arrears.cashierName}</span>}
                             {formData.arrears.reason && <span className="block italic mt-1 text-emerald-600">"{formData.arrears.reason}"</span>}
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-indigo-200 pt-4 flex justify-between items-center text-sm mt-3">
                      <span className="font-bold text-indigo-950">Reste dû au propriétaire :</span>
                      <span className="font-black text-indigo-700 text-xl">{formatAmount(arrearsCalculated.resteDette)} FCFA</span>
                    </div>

                    {formData.arrears.proofImage && (
                      <div className="mt-5 pt-5 border-t border-indigo-200 text-center">
                         <span className="text-xs text-indigo-500 font-bold uppercase tracking-widest block mb-3">Preuve de versement</span>
                         <img src={formData.arrears.proofImage} alt="Preuve" className="rounded-2xl border-4 border-white shadow-md max-h-[250px] mx-auto object-contain bg-slate-100" />
                      </div>
                    )}
                  </div>

                  {(formData.alerts.length > 0 || formData.customProblem.trim()) && (
                    <div className="space-y-3 mb-6">
                      <h5 className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                        ⚠️ Alertes & Remarques
                      </h5>
                      <div className="space-y-2.5">
                        {formData.alerts.map((a) => (
                          <div key={a.id} className="text-sm bg-orange-50 text-orange-900 p-3.5 rounded-xl border border-orange-200 whitespace-normal break-words shadow-sm">
                            <strong className="block mb-1">{a.vehicleName}</strong> 
                            <span className="text-orange-800">{a.category} - {a.description || 'Problème signalé'}</span>
                          </div>
                        ))}
                        {formData.customProblem.trim() && (
                          <div className="text-sm bg-slate-50 text-slate-700 p-4 rounded-xl border border-slate-200 italic whitespace-normal break-words shadow-sm">
                            "{formData.customProblem}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-200 pt-5 text-center mt-auto">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Car size={14} className="text-indigo-400"/> Rapport Véhicule Pro • Édition Spéciale
                    </p>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

      </main>

      {/* --- MENU NAVIGATION MOBILE --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'form' ? 'text-amber-600' : 'text-slate-400'}`}>
          <Edit size={20} /> <span className="text-[10px] font-bold">Édition</span>
        </button>
        <button onClick={() => setActiveTab('preview')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'preview' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <Smartphone size={20} /> <span className="text-[10px] font-bold">Aperçu</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'} relative`}>
          <History size={20} /> <span className="text-[10px] font-bold">Historique</span>
          {history.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>
      </nav>

    </div>
  );
}
