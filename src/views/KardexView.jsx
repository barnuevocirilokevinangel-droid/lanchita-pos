import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Building,
  User,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const ZONAS_FISICAS = [
  {
    key: 'zona_cocina_salon',
    label: '🐟 Cocina & Salón General',
    short: 'Cocina & Salón',
    desc: 'Pescados, mariscos, abarrotes, verduras y descartables'
  },
  {
    key: 'zona_bar_terraza',
    label: '🎤 Bar Karaoke & Terraza',
    short: 'Bar & Terraza',
    desc: 'Exclusivo bebidas: cervezas, gaseosas, aguas, licores y hielo'
  }
];

export const formatZona = (z) => {
  if (!z) return '-';
  if (
    z === 'zona_cocina_salon' ||
    z === 'stock_cocina' ||
    z === 'stock_almacen' ||
    z === 'stock_piso1' ||
    z.includes('Cocina') ||
    z.includes('Salón')
  ) {
    return '🐟 Cocina & Salón';
  }
  if (
    z === 'zona_bar_terraza' ||
    z === 'stock_piso2' ||
    z.includes('Terraza') ||
    z.includes('Bar')
  ) {
    return '🎤 Bar & Terraza';
  }
  return z;
};

const normalizeText = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function KardexView({
  kardexMovimientos = [],
  supplies = [],
  onRegistrarMovimiento,
  activeUser = 'Administrador',
  isFirestoreOnline = false,
  showToast = () => {}
}) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterZona, setFilterZona] = useState('TODAS');
  const [filterProducto, setFilterProducto] = useState('TODOS');

  // Modales
  const [activeModal, setActiveModal] = useState(null); // 'ENTRADA' | 'MERMA' | 'TRASLADO' | 'CONSUMO' | null
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario compartido
  const [selectedProductId, setSelectedProductId] = useState(supplies[0]?.id || '');
  const [formCantidad, setFormCantidad] = useState('');
  const [formOrigen, setFormOrigen] = useState('zona_cocina_salon');
  const [formDestino, setFormDestino] = useState('zona_cocina_salon');
  const [formMotivo, setFormMotivo] = useState('');
  const [formUsuario, setFormUsuario] = useState(activeUser);

  // Insumo seleccionado actualmente
  const selectedProduct = useMemo(() => {
    return supplies.find((s) => s.id === selectedProductId) || supplies[0] || null;
  }, [supplies, selectedProductId]);

  // Helpers de fecha
  const getMs = (m) => {
    if (m.timestamp) return typeof m.timestamp === 'number' ? m.timestamp : Date.parse(m.timestamp);
    if (m.tsMs) return m.tsMs;
    if (m.fecha && typeof m.fecha.toDate === 'function') return m.fecha.toDate().getTime();
    return Date.now();
  };

  // Filtrado
  const filteredMovimientos = useMemo(() => {
    return kardexMovimientos.filter((m) => {
      // Tipo
      if (filterTipo !== 'TODOS' && m.tipo !== filterTipo) return false;

      // Zona (con soporte para 2 zonas reales y retrocompatibilidad)
      if (filterZona !== 'TODAS') {
        const matchesTargetZone = (val, targetZone) => {
          if (!val) return false;
          if (val === targetZone) return true;
          if (targetZone === 'zona_cocina_salon') {
            return (
              val === 'stock_cocina' ||
              val === 'stock_piso1' ||
              val === 'stock_almacen' ||
              val.includes('Cocina') ||
              val.includes('Salón')
            );
          }
          if (targetZone === 'zona_bar_terraza') {
            return val === 'stock_piso2' || val.includes('Terraza') || val.includes('Bar');
          }
          return false;
        };

        if (!matchesTargetZone(m.origen, filterZona) && !matchesTargetZone(m.destino, filterZona)) {
          return false;
        }
      }

      // Producto
      if (filterProducto !== 'TODOS') {
        if (m.productoId !== filterProducto && m.insumoId !== filterProducto) return false;
      }

      // Texto con búsqueda insensible a mayúsculas y acentos
      if (searchTerm.trim()) {
        const q = normalizeText(searchTerm);
        const prod = normalizeText(m.nombreProducto || m.nombreInsumo || '');
        const usr = normalizeText(m.usuario || m.responsable || '');
        const mot = normalizeText(m.motivo || '');
        const id = normalizeText(m.id || '');
        const insumoId = normalizeText(m.insumoId || '');
        const prodId = normalizeText(m.productoId || '');
        const unidad = normalizeText(m.unidad || '');
        const cat = normalizeText(m.categoria || '');
        if (
          !prod.includes(q) &&
          !usr.includes(q) &&
          !mot.includes(q) &&
          !id.includes(q) &&
          !insumoId.includes(q) &&
          !prodId.includes(q) &&
          !unidad.includes(q) &&
          !cat.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [kardexMovimientos, filterTipo, filterZona, filterProducto, searchTerm]);

  // Manejo de Envíos de Formularios
  const handleSubmitMovimiento = async (e) => {
    e.preventDefault();
    const cant = parseFloat(formCantidad);

    if (isNaN(cant) || cant <= 0) {
      showToast('error', 'Ingresa una cantidad válida mayor a 0.');
      return;
    }
    if (!selectedProduct) {
      showToast('error', 'Selecciona un producto o insumo.');
      return;
    }
    if (!formMotivo.trim()) {
      showToast('error', 'Ingresa el motivo o justificación del movimiento.');
      return;
    }

    if (activeModal === 'TRASLADO' && formOrigen === formDestino) {
      showToast('error', 'La zona de origen y destino deben ser distintas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tipo =
        activeModal === 'ENTRADA'
          ? 'ENTRADA_COMPRA'
          : activeModal === 'MERMA'
          ? 'MERMA'
          : activeModal === 'TRASLADO'
          ? 'TRASLADO'
          : 'CONSUMO_PERSONAL';

      const origen =
        tipo === 'ENTRADA_COMPRA'
          ? 'Proveedor / Compra Directa'
          : tipo === 'MERMA'
          ? formOrigen
          : tipo === 'TRASLADO'
          ? formOrigen
          : formOrigen;

      const destino =
        tipo === 'ENTRADA_COMPRA'
          ? formDestino
          : tipo === 'MERMA'
          ? 'Baja / Merma'
          : tipo === 'TRASLADO'
          ? formDestino
          : 'Consumo Personal';

      const stockActual = Number(selectedProduct.stock) || 0;
      let stockNuevo = stockActual;
      if (tipo === 'ENTRADA_COMPRA') stockNuevo = stockActual + cant;
      else if (tipo === 'MERMA' || tipo === 'CONSUMO_PERSONAL') stockNuevo = Math.max(0, stockActual - cant);

      const nuevoKardex = {
        productoId: selectedProduct.id,
        nombreProducto: selectedProduct.nombre,
        tipo,
        origen,
        destino,
        cantidadMovida: Math.round(cant * 100) / 100,
        unidad: selectedProduct.unidad || 'unid',
        stockAnterior: stockActual,
        stockNuevo: Math.round(stockNuevo * 100) / 100,
        usuario: formUsuario.trim() || activeUser,
        motivo: formMotivo.trim(),
        timestamp: Date.now()
      };

      if (onRegistrarMovimiento) {
        await onRegistrarMovimiento(nuevoKardex, selectedProduct);
      }

      showToast('success', `Movimiento "${tipo}" registrado exitosamente en el Kardex.`);
      setActiveModal(null);
      setFormCantidad('');
      setFormMotivo('');
    } catch (err) {
      console.error('Error registrando kardex:', err);
      showToast('error', `Error al registrar movimiento: ${err.message || 'Error de red'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Badge de color según requerimiento exacto:
  // Verde: Entrada, Rojo: Venta / Merma, Azul: Traslado, Morado: Consumo Personal
  const renderTipoBadge = (tipo) => {
    switch (tipo) {
      case 'ENTRADA_COMPRA':
      case 'INGRESO':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-700" />
            Entrada Compra
          </span>
        );
      case 'VENTA_POS':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 inline-flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-red-700" />
            Venta POS
          </span>
        );
      case 'MERMA':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3 text-red-700" />
            Merma / Baja
          </span>
        );
      case 'TRASLADO':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 inline-flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3 text-sky-700" />
            Traslado Zona
          </span>
        );
      case 'CONSUMO_PERSONAL':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1">
            <Utensils className="w-3 h-3 text-purple-700" />
            Consumo Personal
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            {tipo}
          </span>
        );
    }
  };

  // Exportar Kardex a CSV
  const exportarCSV = () => {
    if (filteredMovimientos.length === 0) {
      showToast('info', 'No hay movimientos en el Kardex para exportar.');
      return;
    }

    const headers = ['Timestamp', 'Fecha', 'Hora', 'Insumo / Producto', 'Tipo', 'Zona Origen', 'Zona Destino', 'Cantidad Movida', 'Stock Anterior', 'Stock Nuevo', 'Responsable', 'Motivo'];
    const rows = filteredMovimientos.map((m) => {
      const ms = getMs(m);
      const d = new Date(ms);
      const fecha = d.toLocaleDateString('es-PE');
      const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const prod = (m.nombreProducto || m.nombreInsumo || '').replace(/"/g, '""');
      const tipo = m.tipo || '';
      const orig = (m.origen || '').replace(/"/g, '""');
      const dest = (m.destino || '').replace(/"/g, '""');
      const cant = Number(m.cantidadMovida || m.cantidad || 0).toFixed(2);
      const ant = Number(m.stockAnterior || 0).toFixed(2);
      const nuev = Number(m.stockNuevo || 0).toFixed(2);
      const usr = (m.usuario || m.responsable || '').replace(/"/g, '""');
      const mot = (m.motivo || '').replace(/"/g, '""');

      return `"${ms}","${fecha}","${hora}","${prod}","${tipo}","${orig}","${dest}","${cant}","${ant}","${nuev}","${usr}","${mot}"`;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kardex_inventario_lanchita_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Kardex exportado exitosamente a CSV/Excel.');
  };

  return (
    <div className="space-y-4 pb-12 pt-2">
      {/* Cabecera del Módulo Kardex */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400 flex items-center justify-center text-amber-700">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Kardex Multi-Zona &amp; Historial Inmutable de Inventario
            </h2>
            {isFirestoreOnline ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                En vivo
              </span>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
                Modo Local
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logística &gt; Kardex de Movimientos • Trazabilidad física en 2 zonas: Cocina &amp; Salón General y Bar Karaoke &amp; Terraza
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Exportar todo el Kardex a Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar Kardex</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormOrigen('zona_cocina_salon');
              setFormDestino('zona_bar_terraza');
              setFormMotivo('Traslado operativo entre Cocina/Salón y Bar/Terraza');
              setActiveModal('TRASLADO');
            }}
            className="px-3 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-700" />
            <span>Traslado</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormOrigen('zona_cocina_salon');
              setFormMotivo('Merma justificada por fecha o deterioro');
              setActiveModal('MERMA');
            }}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-red-700" />
            <span>+ Merma</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormDestino('zona_cocina_salon');
              setFormMotivo('Ingreso directo por compra / reposición de mercadería');
              setActiveModal('ENTRADA');
            }}
            className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>📥 Ingreso Directo</span>
          </button>
        </div>
      </div>

      {/* Zonas Físicas Reales de Inventario (2 Zonas Integradas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ZONAS_FISICAS.map((z) => {
          const isActive = filterZona === z.key;
          return (
            <div
              key={z.key}
              onClick={() => setFilterZona(isActive ? 'TODAS' : z.key)}
              className={`p-3.5 rounded-2xl border-2 transition cursor-pointer select-none ${
                isActive
                  ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-900">{z.label}</div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isActive ? '● Filtro Activo' : 'Ver movimientos'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{z.desc}</div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500">Ubicación física</span>
                <span className="font-mono text-amber-700 font-bold">
                  {isActive ? 'Mostrando solo esta zona' : 'Toca para aislar'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Filtro Tipo */}
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="ENTRADA_COMPRA">📥 Entradas / Compras</option>
            <option value="VENTA_POS">🛒 Ventas POS</option>
            <option value="TRASLADO">🔄 Traslados</option>
            <option value="MERMA">🗑️ Mermas / Bajas</option>
            <option value="CONSUMO_PERSONAL">🍽️ Consumo Personal</option>
          </select>

          {/* Filtro Producto */}
          <select
            value={filterProducto}
            onChange={(e) => setFilterProducto(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer max-w-[180px] truncate"
          >
            <option value="TODOS">Todos los Insumos</option>
            {supplies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>

          {/* Filtro Zona */}
          <select
            value={filterZona}
            onChange={(e) => setFilterZona(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
          >
            <option value="TODAS">Todas las Zonas</option>
            {ZONAS_FISICAS.map((z) => (
              <option key={z.key} value={z.key}>
                {z.short}
              </option>
            ))}
          </select>
        </div>

        {/* Buscador de Texto */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="🔍 Buscar insumo o producto por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla Kardex Inmutable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>{filteredMovimientos.length} movimientos de inventario auditables</span>
          <span className="text-[11px] text-slate-400">Colección: kardex_inventario</span>
        </div>

        {filteredMovimientos.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              {searchTerm.trim()
                ? `No se encontraron movimientos coincidentes con "${searchTerm}"`
                : 'No hay movimientos registrados en el Kardex'}
            </p>
            <p className="text-xs">
              {searchTerm.trim()
                ? 'Intenta con otro término o limpia el buscador.'
                : 'Usa los botones superiores para registrar entradas, traslados o mermas.'}
            </p>
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha &amp; Hora</th>
                  <th className="py-2.5 px-3">Insumo / Producto</th>
                  <th className="py-2.5 px-3">Tipo Movimiento</th>
                  <th className="py-2.5 px-3">Origen</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3 text-right">Cantidad</th>
                  <th className="py-2.5 px-3 text-right">Stock (Ant → Nuev)</th>
                  <th className="py-2.5 px-3">Motivo / Justificación</th>
                  <th className="py-2.5 px-3">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovimientos.map((m) => {
                  const ms = getMs(m);
                  const d = new Date(ms);
                  const fechaStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                  const horaStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                  const cant = Number(m.cantidadMovida || m.cantidad || 0);
                  const unidad = m.unidad || '';

                  return (
                    <tr key={m.id || ms + Math.random()} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        <span className="font-bold">{fechaStr}</span>
                        <span className="text-slate-400 font-mono text-[11px] block">{horaStr}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{m.nombreProducto || m.nombreInsumo}</div>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {m.productoId || m.insumoId}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderTipoBadge(m.tipo)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {formatZona(m.origen)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {formatZona(m.destino)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-black text-sm">
                        <span className={m.tipo === 'ENTRADA_COMPRA' || m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-red-600'}>
                          {m.tipo === 'ENTRADA_COMPRA' || m.tipo === 'INGRESO' ? '+' : '-'} {cant.toFixed(2)} {unidad}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-[11px] text-slate-500">
                        {Number(m.stockAnterior || 0).toFixed(1)} → <b className="text-slate-900">{Number(m.stockNuevo || 0).toFixed(1)}</b>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={m.motivo}>
                        {m.motivo || 'Operación estándar'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-semibold">
                        {m.usuario || 'Almacenero'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Genérico para Movimientos de Kardex */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                {activeModal === 'ENTRADA' && <Plus className="w-5 h-5 text-emerald-400" />}
                {activeModal === 'MERMA' && <Trash2 className="w-5 h-5 text-red-400" />}
                {activeModal === 'TRASLADO' && <ArrowRightLeft className="w-5 h-5 text-sky-400" />}
                {activeModal === 'CONSUMO' && <Utensils className="w-5 h-5 text-purple-400" />}
                <div>
                  <h3 className="font-extrabold text-sm">
                    {activeModal === 'ENTRADA' && '+ Entrada / Ajuste de Stock'}
                    {activeModal === 'MERMA' && '+ Registrar Merma / Pérdida'}
                    {activeModal === 'TRASLADO' && '+ Traslado Físico entre Zonas'}
                    {activeModal === 'CONSUMO' && '+ Registrar Consumo Personal'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Impacta directamente en el Kardex y Almacén</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovimiento} className="p-5 space-y-3.5 bg-slate-50">
              {/* Selección de Producto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Insumo / Producto *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
                >
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} (Stock actual: {s.stock} {s.unidad})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cantidad a Mover ({selectedProduct?.unidad || 'unid'}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formCantidad}
                  onChange={(e) => setFormCantidad(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                />
              </div>

              {/* Zonas de Origen / Destino */}
              {activeModal === 'TRASLADO' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Zona Origen
                    </label>
                    <select
                      value={formOrigen}
                      onChange={(e) => setFormOrigen(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {ZONAS_FISICAS.map((z) => (
                        <option key={z.key} value={z.key}>
                          {z.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Zona Destino
                    </label>
                    <select
                      value={formDestino}
                      onChange={(e) => setFormDestino(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {ZONAS_FISICAS.map((z) => (
                        <option key={z.key} value={z.key}>
                          {z.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeModal === 'ENTRADA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Zona de Ingreso Directo *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Entrada directa a la ubicación física del local (sin almacén intermediario):
                  </p>
                  <select
                    value={formDestino}
                    onChange={(e) => setFormDestino(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  >
                    {ZONAS_FISICAS.map((z) => (
                      <option key={z.key} value={z.key}>
                        {z.label} — {z.desc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeModal === 'MERMA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Zona Afectada por la Merma
                  </label>
                  <select
                    value={formOrigen}
                    onChange={(e) => setFormOrigen(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    {ZONAS_FISICAS.map((z) => (
                      <option key={z.key} value={z.key}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Motivo Obligatorio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo / Justificación *
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Explica el motivo (ej. Vencimiento, merma de descongelación, compra proveedor...)"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                />
              </div>

              {/* Usuario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registrado Por
                </label>
                <input
                  type="text"
                  value={formUsuario}
                  onChange={(e) => setFormUsuario(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                    activeModal === 'MERMA'
                      ? 'bg-red-600 hover:bg-red-700'
                      : activeModal === 'TRASLADO'
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : activeModal === 'CONSUMO'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Guardando...' : 'Confirmar en Kardex'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
