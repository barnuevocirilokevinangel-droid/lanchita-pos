import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Package,
  Flame,
  BarChart3,
  Calendar,
  Settings,
  Fish,
  UtensilsCrossed,
  Wine,
  Coffee,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Users,
  Printer,
  RotateCcw,
  AlertTriangle,
  Receipt,
  X,
  PlusCircle,
  Layers,
  TrendingUp,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Sparkles,
  Database,
  PackageOpen,
  ArrowDownToLine,
  Edit3
} from 'lucide-react';

// Firebase Firestore Imports
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

// =========================================================================
// 1. SEMILLA INICIAL EXACTA DE INSUMOS (CON IDS FIJOS Y STOCK BASE)
// =========================================================================
const INITIAL_SUPPLIES = [
  // 🐟 Cocina Marina (Insumos Críticos)
  {
    id: 'insumo_pescado',
    nombre: 'Pescado Fresco del Día',
    categoria: 'Cocina Marina',
    stock: 15000, // 15 kg
    unidad: 'g',
    alertaMinima: 2000,
  },
  {
    id: 'insumo_mariscos',
    nombre: 'Mariscos Surtidos',
    categoria: 'Cocina Marina',
    stock: 10000, // 10 kg
    unidad: 'g',
    alertaMinima: 1500,
  },
  {
    id: 'insumo_limon',
    nombre: 'Limón Sutil',
    categoria: 'Cocina Marina',
    stock: 250, // unidades
    unidad: 'unid',
    alertaMinima: 40,
  },
  {
    id: 'insumo_cebolla',
    nombre: 'Cebolla Roja',
    categoria: 'Cocina Marina',
    stock: 10000, // 10 kg
    unidad: 'g',
    alertaMinima: 1000,
  },
  {
    id: 'insumo_camote',
    nombre: 'Camote Glaseado',
    categoria: 'Cocina Marina',
    stock: 60, // unidades
    unidad: 'unid',
    alertaMinima: 10,
  },
  {
    id: 'insumo_canchita',
    nombre: 'Maíz Chulpe / Canchita',
    categoria: 'Cocina Marina',
    stock: 5000, // 5 kg
    unidad: 'g',
    alertaMinima: 500,
  },
  {
    id: 'insumo_yuca',
    nombre: 'Yuca Amarilla Frita',
    categoria: 'Cocina Marina',
    stock: 6000, // 6 kg
    unidad: 'g',
    alertaMinima: 1000,
  },

  // 🍹 Barra & Tragos
  {
    id: 'insumo_cerveza_pilsen',
    nombre: 'Cerveza Pilsen 620ml',
    categoria: 'Barra & Tragos',
    stock: 48, // botellas
    unidad: 'botellas',
    alertaMinima: 12,
  },
  {
    id: 'insumo_cerveza_cusquena',
    nombre: 'Cerveza Cusqueña Trigo',
    categoria: 'Barra & Tragos',
    stock: 36, // botellas
    unidad: 'botellas',
    alertaMinima: 12,
  },
  {
    id: 'insumo_corona',
    nombre: 'Cerveza Corona Extra 355ml',
    categoria: 'Barra & Tragos',
    stock: 30, // botellas
    unidad: 'botellas',
    alertaMinima: 8,
  },
  {
    id: 'insumo_pisco',
    nombre: 'Pisco Quebranta',
    categoria: 'Barra & Tragos',
    stock: 5000, // ml (5 Litros)
    unidad: 'ml',
    alertaMinima: 750,
  },
  {
    id: 'insumo_ginger_ale',
    nombre: 'Ginger Ale en Lata',
    categoria: 'Barra & Tragos',
    stock: 40,
    unidad: 'latas',
    alertaMinima: 10,
  },
  {
    id: 'insumo_jarabe_goma',
    nombre: 'Jarabe de Goma Artesanal',
    categoria: 'Barra & Tragos',
    stock: 4000, // ml
    unidad: 'ml',
    alertaMinima: 500,
  },

  // 🥤 Bebidas & Refrescos
  {
    id: 'insumo_gaseosa_inka',
    nombre: 'Inca Kola 500ml',
    categoria: 'Bebidas & Refrescos',
    stock: 30, // botellas
    unidad: 'botellas',
    alertaMinima: 6,
  },
  {
    id: 'insumo_gaseosa_coca',
    nombre: 'Coca Cola 500ml',
    categoria: 'Bebidas & Refrescos',
    stock: 30,
    unidad: 'botellas',
    alertaMinima: 6,
  },
  {
    id: 'insumo_agua',
    nombre: 'Agua Mineral San Luis 625ml',
    categoria: 'Bebidas & Refrescos',
    stock: 30,
    unidad: 'botellas',
    alertaMinima: 6,
  },
  {
    id: 'insumo_maiz_morado',
    nombre: 'Maíz Morado Canteño',
    categoria: 'Bebidas & Refrescos',
    stock: 8000, // g
    unidad: 'g',
    alertaMinima: 1000,
  },
  {
    id: 'insumo_azucar',
    nombre: 'Azúcar Blanca Refinada',
    categoria: 'Bebidas & Refrescos',
    stock: 10000, // g
    unidad: 'g',
    alertaMinima: 1500,
  },
];

// =========================================================================
// 2. RECETARIO & MENÚ CON VINCULACIÓN ESTRICTA DE INSUMOS
// =========================================================================
const INITIAL_PRODUCTS = [
  // 🍋 CEVICHES & TIRADITOS
  {
    id: 'cev-1',
    category: 'ceviches',
    name: 'Ceviche Tradicional La Lanchita',
    price: 35.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 200, label: '200g Pescado fresco' },
      { supplyId: 'insumo_limon', qty: 5, label: '5u Limón' },
      { supplyId: 'insumo_cebolla', qty: 50, label: '50g Cebolla' },
      { supplyId: 'insumo_camote', qty: 1, label: '1u Camote' },
      { supplyId: 'insumo_canchita', qty: 30, label: '30g Canchita' },
    ],
  },
  {
    id: 'cev-2',
    category: 'ceviches',
    name: 'Ceviche Mixto Rompeolas',
    price: 40.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 150, label: '150g Pescado fresco' },
      { supplyId: 'insumo_mariscos', qty: 120, label: '120g Mariscos' },
      { supplyId: 'insumo_limon', qty: 5, label: '5u Limón' },
      { supplyId: 'insumo_cebolla', qty: 50, label: '50g Cebolla' },
      { supplyId: 'insumo_camote', qty: 1, label: '1u Camote' },
    ],
  },
  {
    id: 'cev-3',
    category: 'ceviches',
    name: 'Tiradito Bicolor en Ají Amarillo',
    price: 38.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 180, label: '180g Pescado fino' },
      { supplyId: 'insumo_limon', qty: 4, label: '4u Limón' },
      { supplyId: 'insumo_camote', qty: 1, label: '1u Camote' },
    ],
  },
  {
    id: 'cev-4',
    category: 'ceviches',
    name: 'Leche de Tigre Poderosa',
    price: 18.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 80, label: '80g Pescado' },
      { supplyId: 'insumo_mariscos', qty: 50, label: '50g Chicharrón pota' },
      { supplyId: 'insumo_limon', qty: 3, label: '3u Limón' },
      { supplyId: 'insumo_canchita', qty: 25, label: '25g Canchita' },
    ],
  },

  // 🍤 CHICHARRONES & FRITURAS
  {
    id: 'chi-1',
    category: 'chicharrones',
    name: 'Chicharrón de Pescado Crocante',
    price: 34.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 220, label: '220g Pescado' },
      { supplyId: 'insumo_yuca', qty: 150, label: '150g Yuca frita' },
      { supplyId: 'insumo_cebolla', qty: 40, label: '40g Sarza criolla' },
    ],
  },
  {
    id: 'chi-2',
    category: 'chicharrones',
    name: 'Chicharrón Mixto Marino',
    price: 42.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 120, label: '120g Pescado' },
      { supplyId: 'insumo_mariscos', qty: 180, label: '180g Calamar/Langostino' },
      { supplyId: 'insumo_yuca', qty: 150, label: '150g Yuca dorada' },
      { supplyId: 'insumo_cebolla', qty: 40, label: '40g Sarza' },
    ],
  },
  {
    id: 'chi-3',
    category: 'chicharrones',
    name: 'Jalea Real Familiar Lanchita',
    price: 65.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 300, label: '300g Pescado' },
      { supplyId: 'insumo_mariscos', qty: 300, label: '300g Mixtura marina' },
      { supplyId: 'insumo_yuca', qty: 300, label: '300g Yuca frita' },
      { supplyId: 'insumo_cebolla', qty: 100, label: '100g Sarza criolla' },
      { supplyId: 'insumo_limon', qty: 4, label: '4u Limón' },
    ],
  },

  // 🍲 PLATOS CRIOLLOS & CALIENTES
  {
    id: 'cal-1',
    category: 'calientes',
    name: 'Arroz con Mariscos a la Chalaca',
    price: 36.00,
    ingredients: [
      { supplyId: 'insumo_mariscos', qty: 200, label: '200g Mixtura mariscos' },
      { supplyId: 'insumo_cebolla', qty: 40, label: '40g Cebolla' },
    ],
  },
  {
    id: 'cal-2',
    category: 'calientes',
    name: 'Parihuela Especial Concentrada',
    price: 45.00,
    ingredients: [
      { supplyId: 'insumo_pescado', qty: 250, label: '250g Pescado trozo' },
      { supplyId: 'insumo_mariscos', qty: 150, label: '150g Mariscos' },
      { supplyId: 'insumo_limon', qty: 2, label: '2u Limón' },
      { supplyId: 'insumo_cebolla', qty: 50, label: '50g Aderezo' },
    ],
  },

  // 🍻 CERVEZAS & TRAGOS (TERRAZA KARAOKE)
  {
    id: 'lic-1',
    category: 'tragos',
    name: 'Cerveza Pilsen 620ml',
    price: 12.00,
    ingredients: [
      { supplyId: 'insumo_cerveza_pilsen', qty: 1, label: '1 Botella Pilsen 620ml' },
    ],
  },
  {
    id: 'lic-2',
    category: 'tragos',
    name: 'Cerveza Cusqueña Trigo',
    price: 14.00,
    ingredients: [
      { supplyId: 'insumo_cerveza_cusquena', qty: 1, label: '1 Botella Cusqueña Trigo' },
    ],
  },
  {
    id: 'lic-3',
    category: 'tragos',
    name: 'Chilcano Clásico',
    price: 18.00,
    ingredients: [
      { supplyId: 'insumo_pisco', qty: 60, label: '60ml Pisco Quebranta' },
      { supplyId: 'insumo_limon', qty: 1, label: '1u Limón sutil' },
      { supplyId: 'insumo_ginger_ale', qty: 1, label: '1 Lata Ginger Ale' },
    ],
  },
  {
    id: 'lic-4',
    category: 'tragos',
    name: 'Cerveza Corona Extra 355ml',
    price: 13.00,
    ingredients: [
      { supplyId: 'insumo_corona', qty: 1, label: '1 Botella Corona 355ml' },
      { supplyId: 'insumo_limon', qty: 1, label: '1 Rodaja Limón' },
    ],
  },
  {
    id: 'lic-5',
    category: 'tragos',
    name: 'Pisco Sour Copa Catedral',
    price: 22.00,
    ingredients: [
      { supplyId: 'insumo_pisco', qty: 120, label: '120ml Pisco Quebranta' },
      { supplyId: 'insumo_limon', qty: 3, label: '3u Limón sutil' },
      { supplyId: 'insumo_jarabe_goma', qty: 45, label: '45ml Jarabe de Goma' },
    ],
  },

  // 🥤 BEBIDAS & REFRESCOS
  {
    id: 'beb-1',
    category: 'bebidas',
    name: 'Inca Kola 500ml',
    price: 5.00,
    ingredients: [
      { supplyId: 'insumo_gaseosa_inka', qty: 1, label: '1 Botella 500ml' },
    ],
  },
  {
    id: 'beb-2',
    category: 'bebidas',
    name: 'Coca Cola 500ml',
    price: 5.00,
    ingredients: [
      { supplyId: 'insumo_gaseosa_coca', qty: 1, label: '1 Botella 500ml' },
    ],
  },
  {
    id: 'beb-3',
    category: 'bebidas',
    name: 'Jarra Chicha Morada Casera (1L)',
    price: 14.00,
    ingredients: [
      { supplyId: 'insumo_maiz_morado', qty: 150, label: '150g Maíz morado' },
      { supplyId: 'insumo_azucar', qty: 60, label: '60g Azúcar' },
      { supplyId: 'insumo_limon', qty: 2, label: '2u Limón' },
    ],
  },
  {
    id: 'beb-4',
    category: 'bebidas',
    name: 'Agua San Luis 625ml',
    price: 4.00,
    ingredients: [
      { supplyId: 'insumo_agua', qty: 1, label: '1 Botella 625ml' },
    ],
  },
];

// =========================================================================
// 3. RECETAS DE PRODUCCIÓN DE LOTES
// =========================================================================
const INITIAL_BATCHES = [
  {
    id: 'batch_leche_tigre',
    name: 'Base de Leche de Tigre (Jarra de 2 Litros)',
    category: 'Cocina Fría',
    yieldAmount: '2 Litros',
    currentStock: 3,
    unit: 'jarras',
    requirements: [
      { supplyId: 'insumo_pescado', qty: 400, label: '400g Recortes de pescado' },
      { supplyId: 'insumo_limon', qty: 25, label: '25u Limón sutil (aprox. 300g)' },
      { supplyId: 'insumo_cebolla', qty: 150, label: '150g Cebolla roja' },
    ],
  },
  {
    id: 'batch_chicha',
    name: 'Chicha Morada de la Casa (Olla de 10 Litros)',
    category: 'Bebidas & Salón',
    yieldAmount: '10 Litros',
    currentStock: 4,
    unit: 'ollas',
    requirements: [
      { supplyId: 'insumo_maiz_morado', qty: 1000, label: '1 kg Maíz Morado Canteño' },
      { supplyId: 'insumo_azucar', qty: 200, label: '200g Azúcar blanca' },
    ],
  },
  {
    id: 'batch_jarabe',
    name: 'Jarabe Simple para Barra (1 Litro)',
    category: 'Barra Karaoke',
    yieldAmount: '1 Litro (1000ml)',
    outputSupplyId: 'insumo_jarabe_goma',
    outputUnits: 1000,
    currentStock: 2,
    unit: 'litros',
    requirements: [
      { supplyId: 'insumo_azucar', qty: 1000, label: '1 kg Azúcar blanca' },
    ],
  },
];

const CATEGORIES = [
  {
    key: 'ceviches',
    title: 'Ceviches & Tiraditos',
    emoji: '🍋',
    icon: Fish,
    headerBg: 'bg-amber-500/15 border-amber-300 text-amber-950',
  },
  {
    key: 'chicharrones',
    title: 'Chicharrones & Frituras',
    emoji: '🍤',
    icon: Flame,
    headerBg: 'bg-orange-500/15 border-orange-300 text-orange-950',
  },
  {
    key: 'calientes',
    title: 'Platos Criollos & Calientes',
    emoji: '🍲',
    icon: UtensilsCrossed,
    headerBg: 'bg-red-500/15 border-red-300 text-red-950',
  },
  {
    key: 'tragos',
    title: 'Cervezas & Tragos (Terraza Karaoke)',
    emoji: '🍻',
    icon: Wine,
    headerBg: 'bg-indigo-500/15 border-indigo-300 text-indigo-950',
  },
  {
    key: 'bebidas',
    title: 'Bebidas & Refrescos',
    emoji: '🥤',
    icon: Coffee,
    headerBg: 'bg-teal-500/15 border-teal-300 text-teal-950',
  },
];

// Mapeo amigable de categorías de inventario
const INVENTORY_CATEGORIES = [
  { key: 'cocina', title: '🐟 Cocina Marina', icon: Fish, match: ['cocina', 'cocina marina', 'marina'] },
  { key: 'barra', title: '🍹 Barra & Tragos', icon: Wine, match: ['barra', 'barra & tragos', 'tragos', 'licores'] },
  { key: 'directo', title: '🥤 Bebidas & Refrescos', icon: Coffee, match: ['bebidas', 'bebidas & refrescos', 'directo', 'refrescos'] },
  { key: 'abarrotes', title: '🌾 Abarrotes & Especias', icon: Package, match: ['abarrotes', 'abarrotes & especias', 'especias'] },
  { key: 'elaborado', title: '🍲 Bases & Lotes Elaborados', icon: Layers, match: ['elaborado', 'bases', 'lotes'] },
];

export default function LanchitaPOS() {
  // =========================================================================
  // ESTADOS PRINCIPALES
  // =========================================================================
  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas', 'inventario', 'produccion', 'resumen', 'historial', 'admin'
  const [activeArea, setActiveArea] = useState(() => localStorage.getItem('lanchita_area') || 'salon');
  const [activeUser, setActiveUser] = useState(() => localStorage.getItem('lanchita_user') || 'Don Marco (Dueño)');

  // Insumos sincronizados
  const [supplies, setSupplies] = useState(() => {
    try {
      const saved = localStorage.getItem('lanchita_supplies');
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIES;
    } catch {
      return INITIAL_SUPPLIES;
    }
  });

  // Ventas sincronizadas
  const [salesHistory, setSalesHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('lanchita_sales_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Lotes de producción
  const [batches, setBatches] = useState(() => {
    try {
      const saved = localStorage.getItem('lanchita_batches');
      return saved ? JSON.parse(saved) : INITIAL_BATCHES;
    } catch {
      return INITIAL_BATCHES;
    }
  });

  // Conexión y Carga
  const [isFirestoreOnline, setIsFirestoreOnline] = useState(false);
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modales Inventario
  const [showNewSupplyModal, setShowNewSupplyModal] = useState(false);
  const [isCreatingSupply, setIsCreatingSupply] = useState(false);
  const [newSupplyForm, setNewSupplyForm] = useState({
    nombre: '',
    categoria: 'Cocina Marina',
    unidad: 'kg',
    stock: '',
    alertaMinima: '',
  });

  const [editSupplyModal, setEditSupplyModal] = useState(null);
  const [isEditingSupply, setIsEditingSupply] = useState(false);

  const [showRestockModal, setShowRestockModal] = useState(null);
  const [selectedRestockId, setSelectedRestockId] = useState('');
  const [restockAmount, setRestockAmount] = useState('');

  // Comanda actual
  const [orderCart, setOrderCart] = useState({});
  const [selectedTable, setSelectedTable] = useState('Mesa 01');

  // Modales POS
  const [showPayModal, setShowPayModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);

  // Pago
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [cashGiven, setCashGiven] = useState('');

  // Acordeones abiertos
  const [openAccordions, setOpenAccordions] = useState({
    ceviches: true,
    chicharrones: true,
    calientes: true,
    tragos: true,
    bebidas: true,
  });

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  useEffect(() => {
    localStorage.setItem('lanchita_area', activeArea);
  }, [activeArea]);

  useEffect(() => {
    localStorage.setItem('lanchita_user', activeUser);
  }, [activeUser]);

  // =========================================================================
  // 4. ACTUALIZACIÓN EN VIVO (onSnapshot)
  // =========================================================================

  // Listener para la colección 'insumos' en tiempo real
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    setIsLoadingSupplies(true);
    const insumosCol = collection(db, 'insumos');

    const unsubscribe = onSnapshot(
      insumosCol,
      (snapshot) => {
        setIsLoadingSupplies(false);
        setIsFirestoreOnline(true);

        const remoteList = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nombre: data.nombre || data.name || docSnap.id,
            stock: Number(data.stock) || 0,
            unidad: data.unidad || data.unit || 'unid',
            categoria: data.categoria || data.category || 'Cocina Marina',
            alertaMinima: Number(data.alertaMinima || data.minAlert) || 10,
          };
        });

        // Solo sobreescribir si la colección tiene datos o fue actualizada
        if (remoteList.length > 0) {
          setSupplies(remoteList);
          localStorage.setItem('lanchita_supplies', JSON.stringify(remoteList));
        }
      },
      (error) => {
        console.warn('Error en listener de insumos:', error);
        setIsFirestoreOnline(false);
        setIsLoadingSupplies(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listener para la colección 'ventas'
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      const ventasQuery = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));

      const unsubscribe = onSnapshot(
        ventasQuery,
        (snapshot) => {
          const remoteSales = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let formattedTime = 'Reciente';
            let formattedDate = 'Hoy';

            if (data.fecha && typeof data.fecha.toDate === 'function') {
              const dateObj = data.fecha.toDate();
              formattedTime = dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
              formattedDate = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            } else if (data.timestamp) {
              const dateObj = new Date(data.timestamp);
              formattedTime = dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
              formattedDate = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            }

            return {
              id: docSnap.id,
              ...data,
              dateStr: formattedTime,
              fullDateStr: formattedDate,
            };
          });

          setSalesHistory(remoteSales);
          localStorage.setItem('lanchita_sales_history', JSON.stringify(remoteSales));
        },
        (error) => {
          console.warn('Error en listener de ventas:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('No se pudo inicializar listener de ventas:', err);
    }
  }, []);

  // =========================================================================
  // BLOQUEO INTELIGENTE DE INSUMOS
  // =========================================================================
  const checkProductAvailability = (product) => {
    const committedSupplies = {};
    Object.entries(orderCart).forEach(([prodId, qty]) => {
      if (qty > 0) {
        const prod = INITIAL_PRODUCTS.find((p) => p.id === prodId);
        if (prod && prod.ingredients) {
          prod.ingredients.forEach((ing) => {
            committedSupplies[ing.supplyId] = (committedSupplies[ing.supplyId] || 0) + ing.qty * qty;
          });
        }
      }
    });

    if (product.ingredients) {
      for (const ing of product.ingredients) {
        const supply = supplies.find((s) => s.id === ing.supplyId);
        if (!supply) continue;
        const alreadyUsed = committedSupplies[ing.supplyId] || 0;
        const available = supply.stock - alreadyUsed;
        if (available < ing.qty) {
          return {
            canAdd: false,
            missingSupplyName: supply.nombre,
            unit: supply.unidad,
            availableStock: Math.max(0, available),
          };
        }
      }
    }

    return { canAdd: true };
  };

  const handleAddProduct = (product) => {
    const availability = checkProductAvailability(product);
    if (!availability.canAdd) {
      showToast(
        'error',
        `Agotado: Falta "${availability.missingSupplyName}" (Quedan: ${availability.availableStock} ${availability.unit})`
      );
      return;
    }
    setOrderCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
  };

  const handleRemoveProduct = (productId) => {
    setOrderCart((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const orderItems = useMemo(() => {
    return Object.entries(orderCart)
      .map(([id, qty]) => {
        const prod = INITIAL_PRODUCTS.find((p) => p.id === id);
        if (!prod || qty <= 0) return null;
        return {
          ...prod,
          qty,
          subtotal: prod.price * qty,
        };
      })
      .filter(Boolean);
  }, [orderCart]);

  const totalOrderAmount = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [orderItems]);

  const totalOrderCount = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + it.qty, 0);
  }, [orderItems]);

  // =========================================================================
  // 3. DESCUENTO ATÓMICO EN FIRESTORE AL COBRAR (writeBatch)
  // =========================================================================
  const handleConfirmSale = async () => {
    if (orderItems.length === 0) return;
    setIsProcessingSale(true);

    const numCash = Number(cashGiven) || totalOrderAmount;
    const change = paymentMethod === 'efectivo' && numCash >= totalOrderAmount ? numCash - totalOrderAmount : 0;

    const newSaleData = {
      fecha: serverTimestamp(),
      timestamp: new Date().toISOString(),
      area: activeArea,
      responsable: activeUser,
      mesa: selectedTable,
      items: orderItems.map((it) => ({
        id: it.id,
        nombre: it.name,
        precio: it.price,
        qty: it.qty,
        subtotal: it.subtotal,
        categoria: it.category,
        ingredientes: it.ingredients || [],
      })),
      total: totalOrderAmount,
      metodoPago: paymentMethod === 'yape' ? 'yape_plin' : paymentMethod,
      montoRecibido: paymentMethod === 'efectivo' ? numCash : null,
      vuelto: paymentMethod === 'efectivo' ? change : 0,
    };

    try {
      if (isFirebaseConfigured) {
        // Transacción en lote atómica writeBatch
        const batch = writeBatch(db);

        // 1. Crear documento de comanda en colección 'ventas'
        const newVentaRef = doc(collection(db, 'ventas'));
        batch.set(newVentaRef, newSaleData);

        // 2. Calcular merma según ingredientes configurados o venta directa
        const supplyDeductions = {};
        orderItems.forEach((item) => {
          if (item.ingredients && item.ingredients.length > 0) {
            item.ingredients.forEach((ing) => {
              supplyDeductions[ing.supplyId] =
                (supplyDeductions[ing.supplyId] || 0) + (item.qty * ing.qty);
            });
          }
        });

        // 3. Descontar en 'insumos' con increment(-cantidad)
        Object.entries(supplyDeductions).forEach(([supplyId, deduction]) => {
          const supplyRef = doc(db, 'insumos', supplyId);
          batch.update(supplyRef, {
            stock: increment(-deduction),
          });
        });

        // 4. Ejecutar el commit del lote
        await batch.commit();

        setReceiptModal({
          id: newVentaRef.id,
          ...newSaleData,
          dateStr: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          fullDateStr: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        });

        showToast('success', '¡Venta registrada y stock de insumos actualizado!');
      } else {
        // Modo local fallback
        const localId = `TICK-${Date.now().toString().slice(-6)}`;
        const localSale = {
          id: localId,
          ...newSaleData,
          dateStr: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          fullDateStr: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        };

        setSupplies((prev) =>
          prev.map((sup) => {
            let deduction = 0;
            orderItems.forEach((it) => {
              (it.ingredients || []).forEach((ing) => {
                if (ing.supplyId === sup.id) deduction += ing.qty * it.qty;
              });
            });
            return { ...sup, stock: Math.max(0, sup.stock - deduction) };
          })
        );

        setSalesHistory((prev) => [localSale, ...prev]);
        setReceiptModal(localSale);
        showToast('success', 'Venta registrada y stock de insumos actualizado (Modo Local).');
      }

      // 5. Limpiar comanda de la mesa seleccionada
      setOrderCart({});
      setShowPayModal(false);
      setCashGiven('');
    } catch (error) {
      console.error('Error al registrar venta:', error);
      showToast('error', `Error al registrar en Firestore: ${error.message || 'Error de red'}`);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // =========================================================================
  // 1. SEMILLA INICIAL COMPLETA (Pre-cargar Inventario y Carta Marina)
  // =========================================================================
  const handleSeedInitialData = async () => {
    if (!isFirebaseConfigured) {
      alert('⚠️ Configura tus credenciales de Firebase en "src/firebase.js" para cargar en la nube.');
      return;
    }

    if (
      !window.confirm(
        '¿Deseas inyectar el Inventario Inicial de La Lanchita en Cloud Firestore?\nSe poblará la colección "insumos" con los 18 insumos reales y sus recetas vinculadas.'
      )
    ) {
      return;
    }

    setIsSeeding(true);

    try {
      const batch = writeBatch(db);

      INITIAL_SUPPLIES.forEach((item) => {
        const itemRef = doc(db, 'insumos', item.id);
        batch.set(
          itemRef,
          {
            id: item.id,
            nombre: item.nombre,
            stock: item.stock,
            unidad: item.unidad,
            categoria: item.categoria,
            alertaMinima: item.alertaMinima,
          },
          { merge: true }
        );
      });

      await batch.commit();
      showToast('success', '¡Inventario Inicial de La Lanchita cargado con éxito en Cloud Firestore!');
    } catch (error) {
      console.error('Error cargando semilla en Firestore:', error);
      showToast('error', `Error al poblar Firestore: ${error.message || 'Error de permisos'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // =========================================================================
  // GESTIÓN MANUAL DE INSUMOS (CREAR, EDITAR, ELIMINAR, RESTOCK)
  // =========================================================================
  const handleCreateNewSupply = async (e) => {
    e.preventDefault();
    if (!newSupplyForm.nombre.trim()) return;

    setIsCreatingSupply(true);

    try {
      const newSupplyData = {
        nombre: newSupplyForm.nombre.trim(),
        categoria: newSupplyForm.categoria,
        unidad: newSupplyForm.unidad,
        stock: Number(newSupplyForm.stock) || 0,
        alertaMinima: Number(newSupplyForm.alertaMinima) || 0,
      };

      if (isFirebaseConfigured) {
        const docRef = await addDoc(collection(db, 'insumos'), newSupplyData);
        showToast('success', `¡Insumo "${newSupplyData.nombre}" creado en Firestore!`);
      } else {
        const localSupply = {
          id: `insumo_custom_${Date.now()}`,
          ...newSupplyData,
        };
        setSupplies((prev) => [localSupply, ...prev]);
        showToast('info', `Insumo "${newSupplyData.nombre}" guardado localmente.`);
      }

      setNewSupplyForm({
        nombre: '',
        categoria: 'Cocina Marina',
        unidad: 'kg',
        stock: '',
        alertaMinima: '',
      });
      setShowNewSupplyModal(false);
    } catch (err) {
      console.error('Error creando insumo:', err);
      showToast('error', `Error al crear insumo: ${err.message}`);
    } finally {
      setIsCreatingSupply(false);
    }
  };

  const handleEditSupplySubmit = async (e) => {
    e.preventDefault();
    if (!editSupplyModal) return;

    setIsEditingSupply(true);

    try {
      const updatedData = {
        nombre: editSupplyModal.nombre.trim(),
        categoria: editSupplyModal.categoria,
        unidad: editSupplyModal.unidad,
        stock: Number(editSupplyModal.stock) || 0,
        alertaMinima: Number(editSupplyModal.alertaMinima) || 0,
      };

      if (isFirebaseConfigured) {
        const supRef = doc(db, 'insumos', editSupplyModal.id);
        await updateDoc(supRef, updatedData);
        showToast('success', `Insumo "${updatedData.nombre}" actualizado en Firestore.`);
      } else {
        setSupplies((prev) =>
          prev.map((s) => (s.id === editSupplyModal.id ? { ...s, ...updatedData } : s))
        );
        showToast('info', 'Insumo actualizado localmente.');
      }

      setEditSupplyModal(null);
    } catch (err) {
      console.error('Error editando insumo:', err);
      showToast('error', `Error al editar: ${err.message}`);
    } finally {
      setIsEditingSupply(false);
    }
  };

  const handleDeleteSupply = async (supplyId, supplyName) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar "${supplyName}" del inventario?\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      if (isFirebaseConfigured) {
        await deleteDoc(doc(db, 'insumos', supplyId));
        showToast('success', `Insumo "${supplyName}" eliminado de Firestore.`);
      } else {
        setSupplies((prev) => prev.filter((s) => s.id !== supplyId));
        showToast('info', `Insumo eliminado localmente.`);
      }
    } catch (err) {
      console.error('Error eliminando insumo:', err);
      showToast('error', `Error al eliminar: ${err.message}`);
    }
  };

  const handleQuickAdjustStock = async (supplyId, delta) => {
    try {
      if (isFirebaseConfigured) {
        const supRef = doc(db, 'insumos', supplyId);
        await updateDoc(supRef, {
          stock: increment(delta),
        });
        showToast('success', `Stock actualizado (${delta > 0 ? `+${delta}` : delta}).`);
      } else {
        setSupplies((prev) =>
          prev.map((s) => (s.id === supplyId ? { ...s, stock: Math.max(0, s.stock + delta) } : s))
        );
      }
    } catch (err) {
      console.error('Error ajustando stock:', err);
      showToast('error', `Error al ajustar stock: ${err.message}`);
    }
  };

  const activeRestockSupply = useMemo(() => {
    if (!showRestockModal) return null;
    if (showRestockModal.isGeneral) {
      return supplies.find((s) => s.id === selectedRestockId) || supplies[0] || null;
    }
    return showRestockModal;
  }, [showRestockModal, selectedRestockId, supplies]);

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!activeRestockSupply || !restockAmount || Number(restockAmount) <= 0) return;

    const toAdd = Number(restockAmount);

    try {
      if (isFirebaseConfigured) {
        const supRef = doc(db, 'insumos', activeRestockSupply.id);
        const batch = writeBatch(db);
        batch.update(supRef, {
          stock: increment(toAdd),
        });
        await batch.commit();
        showToast('success', `+${toAdd} ${activeRestockSupply.unidad} ingresados a Firestore.`);
      } else {
        setSupplies((prev) =>
          prev.map((s) => (s.id === activeRestockSupply.id ? { ...s, stock: s.stock + toAdd } : s))
        );
        showToast('info', `Ingreso local registrado (+${toAdd}).`);
      }

      setShowRestockModal(null);
      setRestockAmount('');
    } catch (error) {
      console.error('Error en restock:', error);
      showToast('error', `Error: ${error.message}`);
    }
  };

  // Preparación de lotes
  const handlePrepareBatch = async (batch) => {
    for (const req of batch.requirements) {
      const sup = supplies.find((s) => s.id === req.supplyId);
      if (!sup || sup.stock < req.qty) {
        showToast(
          'error',
          `Falta insumo: "${sup ? sup.nombre : req.supplyId}". Requiere ${req.qty} ${sup?.unidad || ''}`
        );
        return;
      }
    }

    if (
      !window.confirm(
        `¿Confirmas preparar "${batch.name}"?\nSe descontará del almacén y sumará al stock de bases de cocina/barra.`
      )
    ) {
      return;
    }

    setIsProcessingBatch(true);

    try {
      if (isFirebaseConfigured) {
        const firestoreBatch = writeBatch(db);

        batch.requirements.forEach((req) => {
          const supRef = doc(db, 'insumos', req.supplyId);
          firestoreBatch.update(supRef, {
            stock: increment(-req.qty),
          });
        });

        if (batch.outputSupplyId) {
          const outputRef = doc(db, 'insumos', batch.outputSupplyId);
          firestoreBatch.update(outputRef, {
            stock: increment(batch.outputUnits || 1),
          });
        }

        const prodRef = doc(collection(db, 'producciones'));
        firestoreBatch.set(prodRef, {
          fecha: serverTimestamp(),
          recetaNombre: batch.name,
          cantidadProducida: batch.yieldAmount,
          responsable: activeUser,
          area: activeArea,
        });

        await firestoreBatch.commit();
        showToast('success', `¡Lote "${batch.name}" producido y registrado en Firestore!`);
      } else {
        setSupplies((prev) =>
          prev.map((sup) => {
            const req = batch.requirements.find((r) => r.supplyId === sup.id);
            if (req) {
              return { ...sup, stock: Math.max(0, sup.stock - req.qty) };
            }
            if (batch.outputSupplyId && sup.id === batch.outputSupplyId) {
              return { ...sup, stock: sup.stock + (batch.outputUnits || 1) };
            }
            return sup;
          })
        );
        showToast('info', `Lote producido en modo local (${batch.yieldAmount}).`);
      }

      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, currentStock: b.currentStock + 1 } : b))
      );
    } catch (error) {
      console.error('Error al preparar lote:', error);
      showToast('error', `Error en Firestore: ${error.message || 'Error al procesar lote'}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Resumen del día
  const dailySummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = salesHistory.filter((s) => {
      if (!s.timestamp) return true;
      return s.timestamp.startsWith(today);
    });

    const total = todaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    const byMethod = {
      efectivo: todaySales
        .filter((s) => s.metodoPago === 'efectivo')
        .reduce((acc, s) => acc + (Number(s.total) || 0), 0),
      yape: todaySales
        .filter((s) => s.metodoPago === 'yape_plin' || s.metodoPago === 'yape')
        .reduce((acc, s) => acc + (Number(s.total) || 0), 0),
      tarjeta: todaySales
        .filter((s) => s.metodoPago === 'tarjeta')
        .reduce((acc, s) => acc + (Number(s.total) || 0), 0),
    };

    const byArea = {
      salon: todaySales
        .filter((s) => s.area === 'salon')
        .reduce((acc, s) => acc + (Number(s.total) || 0), 0),
      terraza: todaySales
        .filter((s) => s.area === 'terraza')
        .reduce((acc, s) => acc + (Number(s.total) || 0), 0),
    };

    let totalUnits = 0;
    const prodCounts = {};
    todaySales.forEach((s) => {
      (s.items || []).forEach((it) => {
        totalUnits += it.qty || 1;
        prodCounts[it.nombre || it.name] = (prodCounts[it.nombre || it.name] || 0) + (it.qty || 1);
      });
    });

    return {
      todaySales,
      total,
      byMethod,
      byArea,
      ticketsCount: todaySales.length,
      totalUnits,
      prodCounts,
    };
  }, [salesHistory]);

  // =========================================================================
  // SUB-COMPONENTES DE RENDER
  // =========================================================================

  // HEADER SUPERIOR
  const renderHeader = () => {
    return (
      <header className="sticky top-0 z-40 bg-[#0F172A] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shadow-inner">
              <Fish className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base leading-none text-slate-100 flex items-center gap-1.5">
                La Lanchita
                {isFirestoreOnline ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    En vivo
                  </span>
                ) : (
                  <span
                    className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                    title="Configura src/firebase.js para sincronizar en tiempo real"
                  >
                    <Cloud className="w-2.5 h-2.5 text-amber-400" />
                    {isFirebaseConfigured ? 'Conectando...' : 'Local'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">Punto de Venta & Producción</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 p-1 rounded-full border border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveArea('salon')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeArea === 'salon'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🐟</span>
                <span className="hidden sm:inline">Salón Comedor</span>
                <span className="sm:hidden">Salón</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveArea('terraza')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeArea === 'terraza'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🎤</span>
                <span className="hidden sm:inline">Terraza Karaoke</span>
                <span className="sm:hidden">Terraza</span>
              </button>
            </div>

            <select
              value={activeUser}
              onChange={(e) => setActiveUser(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-full px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Don Marco (Dueño)">👤 Don Marco (Dueño)</option>
              <option value="Caja Salón">💵 Caja Salón</option>
              <option value="Barra Principal">🍻 Barra Principal</option>
              <option value="Mozo 1">🏃 Mozo 1</option>
            </select>
          </div>
        </div>
      </header>
    );
  };

  // BANNER DE TOAST FEEDBACK
  const renderToast = () => {
    if (!toastMessage) return null;

    const bgMap = {
      success: 'bg-emerald-600 text-white border-emerald-500',
      error: 'bg-red-600 text-white border-red-500',
      info: 'bg-[#0F172A] text-amber-300 border-slate-700',
    };

    return (
      <div className="fixed top-14 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
        <div
          className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 pointer-events-auto ${
            bgMap[toastMessage.type] || bgMap.info
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 flex-shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      </div>
    );
  };

  // 1. PESTAÑA: VENTAS (VINCULACIÓN ESTRICTA DE INSUMOS)
  const renderVentasTab = () => {
    return (
      <div className="space-y-4 pb-32 pt-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mesa:</span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            >
              <option value="Mesa 01">🐟 Mesa 01</option>
              <option value="Mesa 02">🐟 Mesa 02</option>
              <option value="Mesa 03">🐟 Mesa 03</option>
              <option value="Mesa 04">🐟 Mesa 04</option>
              <option value="Barra 01">🍻 Barra Banqueta 1</option>
              <option value="Barra 02">🍻 Barra Banqueta 2</option>
              <option value="Terraza VIP 1">🎤 Terraza VIP 1</option>
              <option value="Terraza VIP 2">🎤 Terraza VIP 2</option>
              <option value="Para Llevar">🥡 Para Llevar / Delivery</option>
            </select>
          </div>

          {orderItems.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('¿Vaciar la comanda actual?')) setOrderCart({});
              }}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const isOpen = openAccordions[cat.key];
            const catProducts = INITIAL_PRODUCTS.filter((p) => p.category === cat.key);
            const categoryOrderCount = catProducts.reduce(
              (acc, p) => acc + (orderCart[p.id] || 0),
              0
            );

            return (
              <div
                key={cat.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenAccordions((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))
                  }
                  className={`w-full px-4 py-3 flex items-center justify-between text-left transition select-none cursor-pointer border-b ${
                    cat.headerBg
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl drop-shadow-xs">{cat.emoji}</span>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                        {cat.title}
                      </h3>
                      <span className="text-[11px] opacity-80 font-medium">
                        {catProducts.length} opciones en carta
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {categoryOrderCount > 0 && (
                      <span className="bg-[#0F172A] text-amber-400 font-black text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                        {categoryOrderCount} en pedido
                      </span>
                    )}
                    <div className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center text-slate-700 shadow-xs">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/50">
                    {catProducts.map((prod) => {
                      const qty = orderCart[prod.id] || 0;
                      const availability = checkProductAvailability(prod);
                      const isBlocked = !availability.canAdd;

                      return (
                        <div
                          key={prod.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                            qty > 0
                              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                              : 'bg-white border-slate-200'
                          } ${isBlocked && qty === 0 ? 'opacity-70 bg-slate-100' : ''}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                {prod.name}
                              </h4>
                              <span className="text-base font-black text-[#0F172A] whitespace-nowrap font-mono">
                                S/ {prod.price.toFixed(2)}
                              </span>
                            </div>

                            {/* Desglose: INGREDIENTES POR UNIDAD */}
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">
                                Insumos por plato:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(prod.ingredients || []).map((ing, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                                  >
                                    {ing.label}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Alerta de bloqueo inteligente */}
                            {isBlocked && (
                              <div className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                <span>Agotado por falta de insumos ({availability.missingSupplyName})</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {qty > 0 ? `Subtotal: S/ ${(prod.price * qty).toFixed(2)}` : 'Añadir'}
                            </span>

                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                disabled={qty === 0}
                                onClick={() => handleRemoveProduct(prod.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition active:scale-90 ${
                                  qty > 0
                                    ? 'bg-white text-slate-800 shadow-xs hover:bg-slate-200 cursor-pointer'
                                    : 'text-slate-300 cursor-not-allowed'
                                }`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <span className="w-6 text-center text-sm font-black text-slate-900 font-mono">
                                {qty}
                              </span>

                              <button
                                type="button"
                                disabled={isBlocked}
                                onClick={() => handleAddProduct(prod)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition active:scale-90 ${
                                  isBlocked
                                    ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500'
                                    : 'bg-[#0F172A] text-white shadow-xs hover:bg-slate-800 cursor-pointer'
                                }`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalOrderAmount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 z-30 px-4 max-w-md mx-auto pointer-events-auto">
            <div className="bg-[#0F172A] text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow">
                  {totalOrderCount}
                </div>
                <div>
                  <div className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
                    {selectedTable} • {activeArea === 'salon' ? 'Salón' : 'Terraza'}
                  </div>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    S/ {totalOrderAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                disabled={isProcessingSale}
                onClick={() => setShowPayModal(true)}
                className="bg-[#059669] hover:bg-[#047857] text-white px-5 py-3 rounded-xl font-black text-sm tracking-wide shadow-lg flex items-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>{isProcessingSale ? 'Guardando...' : `Cobrar S/ ${totalOrderAmount.toFixed(2)}`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. PESTAÑA: INVENTARIO (CON BOTÓN DE SEMILLA INICIAL Y ACTUALIZACIÓN EN VIVO)
  const renderInventarioTab = () => {
    // Normalizador de categoría para agrupar insumos flexiblemente
    const matchesCategory = (supCat, catConfig) => {
      if (!supCat) return catConfig.key === 'cocina';
      const c = supCat.toLowerCase().trim();
      return catConfig.match.some((m) => c.includes(m) || c === m);
    };

    return (
      <div className="space-y-4 pb-28 pt-2">
        {/* CABECERA DE INVENTARIO */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Inventario & Almacén de Insumos
              </h2>
              {isLoadingSupplies && (
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de stock en tiempo real: los insumos se descuentan al confirmar cada venta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* BOTÓN: CARGAR INVENTARIO INICIAL DE LA LANCHITA */}
            <button
              type="button"
              disabled={isSeeding}
              onClick={handleSeedInitialData}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
              title="Inyecta los insumos oficiales en Firestore"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isSeeding ? 'Cargando...' : '🌱 Cargar Inventario Inicial'}</span>
            </button>

            {/* BOTÓN: INGRESO DE MERCADERÍA */}
            <button
              type="button"
              disabled={supplies.length === 0}
              onClick={() => {
                setShowRestockModal({ isGeneral: true });
                setSelectedRestockId(supplies[0]?.id || '');
                setRestockAmount('10');
              }}
              className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                supplies.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4 text-amber-600" />
              <span>📥 Ingreso</span>
            </button>

            {/* BOTÓN: + NUEVO INSUMO */}
            <button
              type="button"
              onClick={() => setShowNewSupplyModal(true)}
              className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Insumo</span>
            </button>
          </div>
        </div>

        {/* EMPTY STATE SI EL ALMACÉN ESTÁ VACÍO */}
        {supplies.length === 0 && (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-300 text-center shadow-xs max-w-lg mx-auto my-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
              <PackageOpen className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Aún no hay insumos registrados en el almacén
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              El inventario de Cloud Firestore está vacío. Pulsa el botón a continuación para inyectar la semilla con los pescados, mariscos, limones y licores reales de La Lanchita.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                disabled={isSeeding}
                onClick={handleSeedInitialData}
                className="py-3 px-4 bg-[#0F172A] hover:bg-slate-800 text-amber-400 border border-amber-400/40 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{isSeeding ? 'Inyectando en Firestore...' : '🌱 Cargar Inventario Inicial de La Lanchita'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewSupplyModal(true)}
                className="py-3 px-4 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Crear Insumo Manual</span>
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE INSUMOS CATEGORIZADA EN TIEMPO REAL */}
        {supplies.length > 0 &&
          INVENTORY_CATEGORIES.map((catConfig) => {
            const catSupplies = supplies.filter((s) => matchesCategory(s.categoria, catConfig));
            if (catSupplies.length === 0) return null;
            const IconComponent = catConfig.icon;

            return (
              <div
                key={catConfig.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-slate-700" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                      {catConfig.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {catSupplies.length} {catSupplies.length === 1 ? 'insumo' : 'insumos'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {catSupplies.map((sup) => {
                    const isDepleted = sup.stock <= 0;
                    const isLow = sup.stock <= sup.alertaMinima && !isDepleted;

                    return (
                      <div
                        key={sup.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {sup.nombre}
                            </span>

                            {isDepleted ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse shadow-xs">
                                ¡Agotado!
                              </span>
                            ) : isLow ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                ⚠️ Stock Crítico
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Óptimo
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-slate-500 text-xs">
                            <span className="font-mono text-[11px] text-slate-400">
                              ID: {sup.id}
                            </span>
                            <span>•</span>
                            <span>
                              Mínimo: <b className="font-mono text-slate-700">{sup.alertaMinima} {sup.unidad}</b>
                            </span>
                          </div>
                        </div>

                        {/* Stock & Controles Ergonómicos */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <div className="text-base font-black text-slate-900 font-mono leading-tight">
                              {sup.unidad === 'g' && sup.stock >= 1000
                                ? `${(sup.stock / 1000).toFixed(2)} kg`
                                : sup.unidad === 'ml' && sup.stock >= 1000
                                ? `${(sup.stock / 1000).toFixed(2)} L`
                                : `${sup.stock} ${sup.unidad}`}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Stock en Vivo</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Restar rápido */}
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(sup.id, sup.unidad === 'g' ? -100 : -1)}
                              disabled={sup.stock <= 0}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black transition active:scale-95 ${
                                sup.stock <= 0
                                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer'
                              }`}
                              title={sup.unidad === 'g' ? 'Restar 100g' : 'Restar 1'}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            {/* Sumar rápido */}
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(sup.id, sup.unidad === 'g' ? 100 : 1)}
                              className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 flex items-center justify-center font-black transition active:scale-95 cursor-pointer"
                              title={sup.unidad === 'g' ? 'Sumar 100g' : 'Sumar 1'}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            {/* Ingreso modal detallado */}
                            <button
                              type="button"
                              onClick={() => {
                                setShowRestockModal(sup);
                                setRestockAmount(sup.unidad === 'g' ? '1000' : '10');
                              }}
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition cursor-pointer"
                              title="Ingreso de mercadería detallado"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">+ Ingreso</span>
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => setEditSupplyModal(sup)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition active:scale-95 cursor-pointer"
                              title="Editar insumo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSupply(sup.id, sup.nombre)}
                              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
                              title="Eliminar insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  // 3. PESTAÑA: PRODUCCIÓN
  const renderProduccionTab = () => {
    return (
      <div className="space-y-4 pb-28 pt-2">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-600" />
            Producción de Bases & Lotes Previos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Descuenta automáticamente la materia prima y suma el lote terminado en Cloud Firestore
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase">
                      {batch.category}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-1">
                      {batch.name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Rendimiento: <span className="font-bold text-slate-700">{batch.yieldAmount}</span>
                    </div>
                  </div>

                  <div className="text-right bg-slate-50 border border-slate-200 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Stock Listo</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {batch.currentStock} {batch.unit}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Materia prima requerida del almacén:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {batch.requirements.map((req, idx) => {
                      const sup = supplies.find((s) => s.id === req.supplyId);
                      const hasEnough = sup && sup.stock >= req.qty;

                      return (
                        <div
                          key={idx}
                          className={`text-xs p-2 rounded-lg border flex items-center justify-between ${
                            hasEnough
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          <span>{req.label}</span>
                          <span className="text-[10px] font-bold">
                            {hasEnough ? '✅ Disponible' : '❌ Insuficiente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  disabled={isProcessingBatch}
                  onClick={() => handlePrepareBatch(batch)}
                  className="bg-[#059669] hover:bg-[#047857] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isProcessingBatch ? 'Procesando en nube...' : '+ Preparar Lote'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 4. PESTAÑA: RESUMEN (CIERRE DE CAJA DEL DÍA)
  const renderResumenTab = () => {
    return (
      <div className="space-y-4 pb-28 pt-2">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Cierre de Caja del Día
            </span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-slate-200 border border-white/10">
              {dailySummary.ticketsCount} Comandas
            </span>
          </div>

          <div className="mt-4">
            <span className="text-xs text-slate-400 font-semibold uppercase">TOTAL DEL DÍA</span>
            <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight mt-1">
              S/ {dailySummary.total.toFixed(2)}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Platos y bebidas despachados hoy: <b className="text-amber-400">{dailySummary.totalUnits} unid.</b>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Desglose por Método de Pago
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
              <Banknote className="w-4 h-4 mx-auto mb-1 text-emerald-700" />
              <div className="text-[11px] font-bold text-emerald-800">Efectivo</div>
              <div className="text-base font-black text-emerald-950 font-mono mt-0.5">
                S/ {dailySummary.byMethod.efectivo.toFixed(2)}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-center">
              <QrCode className="w-4 h-4 mx-auto mb-1 text-purple-700" />
              <div className="text-[11px] font-bold text-purple-800">Yape / Plin</div>
              <div className="text-base font-black text-purple-950 font-mono mt-0.5">
                S/ {dailySummary.byMethod.yape.toFixed(2)}
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl text-center">
              <CreditCard className="w-4 h-4 mx-auto mb-1 text-sky-700" />
              <div className="text-[11px] font-bold text-sky-800">Tarjeta</div>
              <div className="text-base font-black text-sky-950 font-mono mt-0.5">
                S/ {dailySummary.byMethod.tarjeta.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Comparativa por Ambiente
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/70 flex items-center gap-3">
              <div className="text-3xl">🐟</div>
              <div>
                <div className="text-xs font-bold text-sky-900">Salón Comedor</div>
                <div className="text-lg font-black text-sky-950 font-mono">
                  S/ {dailySummary.byArea.salon.toFixed(2)}
                </div>
                <div className="text-[10px] text-sky-700">Piso 1 y 2</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center gap-3">
              <div className="text-3xl">🎤</div>
              <div>
                <div className="text-xs font-bold text-amber-900">Terraza Karaoke</div>
                <div className="text-lg font-black text-amber-950 font-mono">
                  S/ {dailySummary.byArea.terraza.toFixed(2)}
                </div>
                <div className="text-[10px] text-amber-700">Piso 3 / Noche</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Detalle de Platos Despachados
          </h3>
          {Object.keys(dailySummary.prodCounts).length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No hay comandas registradas en la jornada de hoy.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {Object.entries(dailySummary.prodCounts).map(([name, qty]) => (
                <div key={name} className="py-2 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">{name}</span>
                  <span className="font-black text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    {qty} unid.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 5. PESTAÑA: HISTORIAL
  const renderHistorialTab = () => {
    return (
      <div className="space-y-4 pb-28 pt-2">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-700" />
              Historial de Comandas en Tiempo Real
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría sincronizada al instante entre dispositivos
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
            {salesHistory.length} total
          </span>
        </div>

        {salesHistory.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No hay comandas registradas todavía. Realiza un cobro en la pestaña [Ventas].
          </div>
        ) : (
          <div className="space-y-2">
            {salesHistory.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setReceiptModal(sale)}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-[#0F172A]">{sale.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        sale.area === 'terraza'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      {sale.area === 'terraza' ? '🎤 Terraza' : '🐟 Salón'}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">{sale.mesa}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {sale.fullDateStr} {sale.dateStr} • {sale.responsable} •{' '}
                    {(sale.metodoPago || '').toUpperCase()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-emerald-700 font-mono">
                    S/ {(Number(sale.total) || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400 underline">Ver Comanda</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 6. PESTAÑA: ADMIN
  const renderAdminTab = () => {
    return (
      <div className="space-y-4 pb-28 pt-2">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            Panel de Administración & Cloud Firestore
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configuración del local, inicialización de datos y sincronización en la nube
          </p>
        </div>

        {/* SEMILLA DE DATOS INICIALES */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-300 shadow-xs space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Database className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Semilla de Datos Iniciales (Cloud Firestore)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Puebla automáticamente la colección <code className="bg-white px-1 rounded border">insumos</code> con
                el catálogo de Pescado fresco, limón sutil, cebollas, camotes, cervezas Pilsen, pisco y mixers.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSeeding}
            onClick={handleSeedInitialData}
            className="w-full py-3 px-4 bg-[#0F172A] hover:bg-slate-800 text-amber-400 border border-amber-400/50 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              {isSeeding
                ? 'Poblando Cloud Firestore...'
                : '🌱 Cargar Inventario Inicial de La Lanchita'}
            </span>
          </button>
        </div>

        {/* Datos Comerciales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
          <h3 className="font-bold text-slate-600 uppercase tracking-wider mb-2">Datos del Restaurante</h3>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Razón Social:</span>
            <span className="font-bold text-slate-800">Restaurant Cevichería "La Lanchita"</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">RUC:</span>
            <span className="font-mono font-bold text-slate-800">20608945123</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Ubicación:</span>
            <span className="font-medium text-slate-800">Av. Costanera 450, Muelle Artesanal</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Estado Firestore:</span>
            <span className="font-bold flex items-center gap-1">
              {isFirestoreOnline ? (
                <span className="text-emerald-700">🟢 Conectado & Sincronizado</span>
              ) : (
                <span className="text-amber-700">🟡 Modo Local Activo</span>
              )}
            </span>
          </div>
        </div>

        {/* Mantenimiento */}
        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Mantenimiento Local
          </h3>

          <button
            onClick={() => {
              if (window.confirm('¿Restablecer insumos locales a valores iniciales?')) {
                setSupplies(INITIAL_SUPPLIES);
                showToast('info', 'Insumos locales restablecidos.');
              }
            }}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition text-left flex items-center justify-between cursor-pointer"
          >
            <span>Restablecer Insumos en Almacén Local</span>
            <RotateCcw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    );
  };

  // MODAL DE COBRO
  const renderPayModal = () => {
    if (!showPayModal) return null;

    const numCash = Number(cashGiven) || 0;
    const change = numCash >= totalOrderAmount ? numCash - totalOrderAmount : 0;
    const isCashValid = paymentMethod !== 'efectivo' || numCash >= totalOrderAmount;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-[#0F172A] text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">
                Cobro Comanda • {selectedTable}
              </span>
              <h3 className="text-base font-black">Confirmar y Emitir Comanda</h3>
            </div>
            <button
              onClick={() => setShowPayModal(false)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 bg-slate-50">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total a Cobrar
              </span>
              <div className="text-4xl font-black text-[#0F172A] font-mono mt-0.5">
                S/ {totalOrderAmount.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {totalOrderCount} platos/bebidas • {activeArea === 'salon' ? 'Salón Comedor' : 'Terraza Karaoke'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                    paymentMethod === 'efectivo'
                      ? 'border-[#059669] bg-emerald-50 text-emerald-950 font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 font-semibold'
                  }`}
                >
                  <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  <span className="text-xs">Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('yape')}
                  className={`p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                    paymentMethod === 'yape'
                      ? 'border-purple-600 bg-purple-50 text-purple-950 font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 font-semibold'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <span className="text-xs">Yape/Plin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('tarjeta')}
                  className={`p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                    paymentMethod === 'tarjeta'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 font-semibold'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-sky-600" />
                  <span className="text-xs">Tarjeta</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'efectivo' && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Monto Recibido (S/):</span>
                  <input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder={totalOrderAmount.toFixed(2)}
                    className="w-32 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-right font-mono font-black text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-1 justify-between">
                  {[totalOrderAmount, 20, 50, 100, 200].map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashGiven(val.toString())}
                      className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold font-mono border border-slate-200 transition cursor-pointer"
                    >
                      {idx === 0 ? 'Exacto' : `S/${val}`}
                    </button>
                  ))}
                </div>

                {numCash > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600">Vuelto a entregar:</span>
                    <span
                      className={`text-base font-mono font-black ${
                        change >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {change >= 0 ? `S/ ${change.toFixed(2)}` : 'Monto insuficiente'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!isCashValid || isProcessingSale}
              onClick={handleConfirmSale}
              className={`w-full py-3.5 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-98 ${
                isCashValid && !isProcessingSale
                  ? 'bg-[#059669] hover:bg-[#047857] text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isProcessingSale
                  ? 'Registrando Transacción Atómica...'
                  : 'Confirmar Pedido & Descontar Insumos'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODAL 1: REGISTRAR NUEVO INSUMO
  const renderNewSupplyModal = () => {
    if (!showNewSupplyModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-base">Registrar Nuevo Insumo</h3>
            </div>
            <button
              onClick={() => setShowNewSupplyModal(false)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateNewSupply} className="p-5 space-y-4 bg-slate-50">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre del Insumo *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Pescado Perico, Limón Sutil, Cerveza Pilsen..."
                value={newSupplyForm.nombre}
                onChange={(e) => setNewSupplyForm({ ...newSupplyForm, nombre: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría
                </label>
                <select
                  value={newSupplyForm.categoria}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, categoria: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  <option value="Cocina Marina">🐟 Cocina Marina</option>
                  <option value="Barra & Tragos">🍹 Barra & Tragos</option>
                  <option value="Bebidas & Refrescos">🥤 Bebidas & Refrescos</option>
                  <option value="Abarrotes & Especias">🌾 Abarrotes & Especias</option>
                  <option value="Bases & Lotes Elaborados">🍲 Bases & Lotes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={newSupplyForm.unidad}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, unidad: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  <option value="kg">kg (Kilogramos)</option>
                  <option value="g">g (Gramos)</option>
                  <option value="unid">unidades</option>
                  <option value="botellas">botellas</option>
                  <option value="litros">litros (L)</option>
                  <option value="ml">ml (Mililitros)</option>
                  <option value="latas">latas</option>
                  <option value="bolsas">bolsas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Stock Inicial
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0"
                  value={newSupplyForm.stock}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, stock: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alerta Mínima
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="10"
                  value={newSupplyForm.alertaMinima}
                  onChange={(e) => setNewSupplyForm({ ...newSupplyForm, alertaMinima: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingSupply}
              className="w-full mt-2 py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-black text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCreatingSupply ? 'Guardando en Firestore...' : 'Guardar Insumo en Almacén'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  // MODAL 2: EDITAR INSUMO
  const renderEditSupplyModal = () => {
    if (!editSupplyModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-base">Editar Insumo</h3>
            </div>
            <button
              onClick={() => setEditSupplyModal(null)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleEditSupplySubmit} className="p-5 space-y-4 bg-slate-50">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre del Insumo *
              </label>
              <input
                type="text"
                required
                value={editSupplyModal.nombre}
                onChange={(e) => setEditSupplyModal({ ...editSupplyModal, nombre: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría
                </label>
                <select
                  value={editSupplyModal.categoria}
                  onChange={(e) => setEditSupplyModal({ ...editSupplyModal, categoria: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  <option value="Cocina Marina">🐟 Cocina Marina</option>
                  <option value="Barra & Tragos">🍹 Barra & Tragos</option>
                  <option value="Bebidas & Refrescos">🥤 Bebidas & Refrescos</option>
                  <option value="Abarrotes & Especias">🌾 Abarrotes & Especias</option>
                  <option value="Bases & Lotes Elaborados">🍲 Bases & Lotes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={editSupplyModal.unidad}
                  onChange={(e) => setEditSupplyModal({ ...editSupplyModal, unidad: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  <option value="kg">kg (Kilogramos)</option>
                  <option value="g">g (Gramos)</option>
                  <option value="unid">unidades</option>
                  <option value="botellas">botellas</option>
                  <option value="litros">litros (L)</option>
                  <option value="ml">ml (Mililitros)</option>
                  <option value="latas">latas</option>
                  <option value="bolsas">bolsas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Stock Actual
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editSupplyModal.stock}
                  onChange={(e) => setEditSupplyModal({ ...editSupplyModal, stock: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alerta Mínima
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editSupplyModal.alertaMinima}
                  onChange={(e) => setEditSupplyModal({ ...editSupplyModal, alertaMinima: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isEditingSupply}
              className="w-full mt-2 py-3.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl font-black text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isEditingSupply ? 'Actualizando en Firestore...' : 'Guardar Cambios'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  // MODAL 3: INGRESO DE MERCADERÍA / RESTOCK
  const renderRestockModal = () => {
    if (!showRestockModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-sm">Ingreso de Mercadería</h3>
            </div>
            <button
              onClick={() => {
                setShowRestockModal(null);
                setRestockAmount('');
              }}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleRestockSubmit} className="p-5 space-y-4 bg-slate-50">
            {showRestockModal.isGeneral ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seleccionar Insumo
                </label>
                <select
                  value={selectedRestockId}
                  onChange={(e) => setSelectedRestockId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.stock} {s.unidad})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Insumo a Reponer</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{showRestockModal.nombre}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Stock actual: <b className="font-mono text-slate-800">{showRestockModal.stock} {showRestockModal.unidad}</b>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cantidad a Sumar {activeRestockSupply ? `(${activeRestockSupply.unidad})` : ''}:
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex gap-1.5 mt-2">
                {[1, 5, 10, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRestockAmount(val.toString())}
                    className="flex-1 py-1 bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold font-mono transition"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!activeRestockSupply}
              className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-black text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Ingreso al Almacén</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  // MODAL DE COMPROBANTE / TICKET
  const renderReceiptModal = () => {
    if (!receiptModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 bg-white font-mono text-xs space-y-3 select-text border-b border-dashed border-slate-300">
            <div className="text-center space-y-1">
              <div className="font-black text-sm tracking-widest uppercase">
                *** LA LANCHITA ***
              </div>
              <div className="text-[11px] text-slate-500">CEVICHERÍA & BARRA MARINA</div>
              <div className="text-[10px] text-slate-400">RUC: 20608945123</div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 space-y-0.5 text-[11px]">
              <div>Comanda: <span className="font-bold">{receiptModal.id}</span></div>
              <div>Hora: {receiptModal.dateStr} ({receiptModal.fullDateStr})</div>
              <div>Área: {receiptModal.area === 'terraza' ? 'Terraza Karaoke (P3)' : 'Salón Comedor'}</div>
              <div>Mesa: {receiptModal.mesa}</div>
              <div>Atendido por: {receiptModal.responsable}</div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2">
              <div className="grid grid-cols-12 font-bold mb-1 pb-1 border-b border-slate-200">
                <span className="col-span-2">CANT</span>
                <span className="col-span-7">PRODUCTO</span>
                <span className="col-span-3 text-right">TOTAL</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(receiptModal.items || []).map((it) => (
                  <div key={it.id} className="grid grid-cols-12 text-[11px]">
                    <span className="col-span-2 font-bold">{it.qty}x</span>
                    <span className="col-span-7 truncate">{it.nombre || it.name}</span>
                    <span className="col-span-3 text-right font-bold">
                      {(it.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-right text-xs">
              <div className="text-base font-black flex justify-between">
                <span>TOTAL PAGADO:</span>
                <span>S/ {(receiptModal.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Método:</span>
                <span className="uppercase font-bold">
                  {receiptModal.metodoPago || receiptModal.paymentMethod}
                </span>
              </div>
              {receiptModal.montoRecibido && (
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Vuelto:</span>
                  <span className="font-bold">S/ {(receiptModal.vuelto || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 text-[10px] text-slate-400">
              ¡Insumos descontados de cocina y barra!
            </div>
          </div>

          <div className="p-3 bg-slate-100 flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2 bg-[#0F172A] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              onClick={() => setReceiptModal(null)}
              className="flex-1 py-2 bg-slate-200 text-slate-800 rounded-xl font-bold text-xs hover:bg-slate-300 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // NAVEGACIÓN INFERIOR FIJA
  const renderBottomNav = () => {
    const tabs = [
      { id: 'ventas', label: 'Ventas', icon: ShoppingBag },
      { id: 'inventario', label: 'Inventario', icon: Package },
      { id: 'produccion', label: 'Producción', icon: Flame },
      { id: 'resumen', label: 'Resumen', icon: BarChart3 },
      { id: 'historial', label: 'Historial', icon: Calendar },
      { id: 'admin', label: 'Admin', icon: Settings },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A] text-slate-400 border-t border-slate-800 px-1 py-1 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative cursor-pointer ${
                  isActive
                    ? 'text-amber-400 font-black'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-5 h-0.5 bg-amber-400 rounded-full" />
                )}
                <IconComponent className={`w-4 h-4 mb-0.5 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[9px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none antialiased">
      {renderToast()}
      {renderHeader()}

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4">
        {activeTab === 'ventas' && renderVentasTab()}
        {activeTab === 'inventario' && renderInventarioTab()}
        {activeTab === 'produccion' && renderProduccionTab()}
        {activeTab === 'resumen' && renderResumenTab()}
        {activeTab === 'historial' && renderHistorialTab()}
        {activeTab === 'admin' && renderAdminTab()}
      </main>

      {/* Modales */}
      {renderPayModal()}
      {renderNewSupplyModal()}
      {renderEditSupplyModal()}
      {renderRestockModal()}
      {renderReceiptModal()}
      {renderBottomNav()}
    </div>
  );
}
