import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Receipt,
  User,
  Tag,
  Paperclip,
  ArrowDownRight,
  ArrowUpRight,
  Coins
} from 'lucide-react';

export default function HistorialCajaView({
  movimientos = [],
  onNuevoEgreso,
  activeUser = 'Administrador',
  activeArea = 'salon',
  isFirestoreOnline = false,
  showToast = () => {}
}) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('HOY'); // 'HOY', 'SEMANA', 'MES', 'TODOS'
  const [typeFilter, setTypeFilter] = useState('TODOS'); // 'TODOS', 'INGRESOS', 'EGRESOS', 'APERTURA', 'CIERRE'

  // Modal nuevo egreso
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMonto, setFormMonto] = useState('');
  const [formCategoria, setFormCategoria] = useState('Mercado');
  const [formDetalle, setFormDetalle] = useState('');
  const [formMetodo, setFormMetodo] = useState('efectivo');
  const [formAdjunto, setFormAdjunto] = useState('');
  const [formUsuario, setFormUsuario] = useState(activeUser);

  // Categorías estándar para restaurante marino
  const CATEGORIAS_EGRESO = [
    'Mercado & Pescados',
    'Verduras & Limones',
    'Hielo & Refrigeración',
    'Pasajes & Movilidad',
    'Limpieza & Desinfección',
    'Personal & Propinas',
    'Gas & Combustible',
    'Mantenimiento & Utensilios',
    'Abarrotes & Especias',
    'Otros Gastos Operativos'
  ];

  // Helpers de fecha
  const getMs = (m) => {
    if (m.timestamp) return typeof m.timestamp === 'number' ? m.timestamp : Date.parse(m.timestamp);
    if (m.tsMs) return m.tsMs;
    if (m.fecha && typeof m.fecha.toDate === 'function') return m.fecha.toDate().getTime();
    if (m.fecha) return Date.parse(m.fecha);
    return Date.now();
  };

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Filtrado de movimientos
  const filteredMovimientos = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return movimientos.filter((m) => {
      const ms = getMs(m);
      const mDate = new Date(ms);

      // Filtro de fecha
      if (dateFilter === 'HOY' && !isSameDay(mDate, now)) return false;
      if (dateFilter === 'SEMANA' && mDate < startOfWeek) return false;
      if (dateFilter === 'MES' && mDate < startOfMonth) return false;

      // Filtro de tipo
      const tipo = m.tipo || '';
      if (typeFilter === 'INGRESOS' && !tipo.includes('INGRESO') && tipo !== 'APERTURA') return false;
      if (typeFilter === 'EGRESOS' && !tipo.includes('EGRESO') && tipo !== 'COMPRA_ALMACEN') return false;
      if (typeFilter === 'APERTURA' && tipo !== 'APERTURA') return false;
      if (typeFilter === 'CIERRE' && tipo !== 'CIERRE') return false;

      // Buscador por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const detalle = (m.detalle || '').toLowerCase();
        const cat = (m.categoria || '').toLowerCase();
        const usr = (m.usuario || '').toLowerCase();
        const met = (m.metodoPago || '').toLowerCase();
        const id = (m.id || '').toLowerCase();
        if (!detalle.includes(q) && !cat.includes(q) && !usr.includes(q) && !met.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [movimientos, dateFilter, typeFilter, searchTerm]);

  // Totales para tarjetas resumen
  const resumen = useMemo(() => {
    let saldoInicial = 0;
    let totalIngresos = 0;
    let totalEgresos = 0;
    let efectivoIngresos = 0;
    let efectivoEgresos = 0;

    filteredMovimientos.forEach((m) => {
      const monto = Number(m.monto) || 0;
      const tipo = m.tipo || '';
      const metodo = (m.metodoPago || 'efectivo').toLowerCase();

      if (tipo === 'APERTURA') {
        saldoInicial += monto;
        if (metodo === 'efectivo') efectivoIngresos += monto;
      } else if (tipo === 'INGRESO_VENTA' || tipo.startsWith('INGRESO')) {
        totalIngresos += monto;
        if (metodo === 'efectivo') efectivoIngresos += monto;
      } else if (tipo === 'EGRESO_GASTO' || tipo === 'COMPRA_ALMACEN' || tipo.startsWith('EGRESO')) {
        totalEgresos += monto;
        if (metodo === 'efectivo') efectivoEgresos += monto;
      }
    });

    const saldoGaveta = saldoInicial + efectivoIngresos - efectivoEgresos;

    return {
      saldoInicial,
      totalIngresos,
      totalEgresos,
      saldoGaveta
    };
  }, [filteredMovimientos]);

  // Enviar nuevo egreso
  const handleSubmitEgreso = async (e) => {
    e.preventDefault();
    const parsedMonto = parseFloat(formMonto);

    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      showToast('error', 'Ingresa un monto válido mayor a 0 con hasta 2 decimales.');
      return;
    }
    if (!formDetalle.trim()) {
      showToast('error', 'Ingresa una justificación o detalle del gasto.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevoMovimiento = {
        tipo: 'EGRESO_GASTO',
        categoria: formCategoria,
        detalle: formDetalle.trim(),
        monto: Math.round(parsedMonto * 100) / 100,
        metodoPago: formMetodo,
        usuario: formUsuario.trim() || activeUser,
        estacionId: activeArea,
        adjunto: formAdjunto.trim() || null,
        timestamp: Date.now()
      };

      if (onNuevoEgreso) {
        await onNuevoEgreso(nuevoMovimiento);
      }

      showToast('success', `Egreso de S/ ${nuevoMovimiento.monto.toFixed(2)} registrado en Flujo de Caja.`);
      setShowEgresoModal(false);
      setFormMonto('');
      setFormDetalle('');
      setFormAdjunto('');
    } catch (err) {
      console.error('Error registrando egreso:', err);
      showToast('error', `Error al registrar egreso: ${err.message || 'Error de red'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar CSV
  const exportarCSV = () => {
    if (filteredMovimientos.length === 0) {
      showToast('info', 'No hay movimientos para exportar con los filtros seleccionados.');
      return;
    }

    const headers = ['ID', 'Fecha', 'Hora', 'Tipo', 'Categoría', 'Detalle', 'Método de Pago', 'Monto (S/)', 'Usuario', 'Estación'];
    const rows = filteredMovimientos.map((m) => {
      const ms = getMs(m);
      const d = new Date(ms);
      const fecha = d.toLocaleDateString('es-PE');
      const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const tipo = m.tipo || '';
      const cat = m.categoria || 'General';
      const det = (m.detalle || '').replace(/"/g, '""');
      const met = m.metodoPago || 'efectivo';
      const monto = (Number(m.monto) || 0).toFixed(2);
      const usr = m.usuario || 'Cajero';
      const est = m.estacionId || 'Salón';

      return `"${m.id || ''}","${fecha}","${hora}","${tipo}","${cat}","${det}","${met}","${monto}","${usr}","${est}"`;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flujo_caja_lanchita_${dateFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Archivo CSV exportado exitosamente para Excel.');
  };

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Cabecera del Módulo */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400 flex items-center justify-center text-emerald-700">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Flujo de Caja Chica & Movimientos Financieros
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
            Compras &gt; Gastos / Flujo de Caja • Registro inmutable de cada sol que entra y sale de caja
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Exportar movimientos a Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar a Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormUsuario(activeUser);
              setShowEgresoModal(true);
            }}
            className="px-3.5 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Egreso Rápido</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Saldo Inicial */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Saldo Inicial</span>
            <Coins className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-800 mt-1">
            S/ {resumen.saldoInicial.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fondo de apertura de caja</div>
        </div>

        {/* Card 2: Total Ingresos */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Ingresos</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1">
            + S/ {resumen.totalIngresos.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Ventas y entradas registradas</div>
        </div>

        {/* Card 3: Total Egresos */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-red-200 shadow-xs bg-gradient-to-br from-red-50/50 to-white">
          <div className="flex items-center justify-between text-red-800 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Egresos</span>
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-red-600 mt-1">
            - S/ {resumen.totalEgresos.toFixed(2)}
          </div>
          <div className="text-[10px] text-red-500 mt-0.5">Gastos operativos y compras</div>
        </div>

        {/* Card 4: Saldo Actual en Gaveta */}
        <div className="bg-[#0F172A] p-3.5 sm:p-4 rounded-2xl border border-slate-700 text-white shadow-md">
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-extrabold uppercase tracking-wider">
            <span>Saldo en Gaveta</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${resumen.saldoGaveta < 0 ? 'text-red-400' : 'text-amber-300'}`}>
            S/ {resumen.saldoGaveta.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">Efectivo físico disponible</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {['HOY', 'SEMANA', 'MES', 'TODOS'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === d ? 'bg-[#0F172A] text-amber-400 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d === 'HOY' ? 'Hoy' : d === 'SEMANA' ? 'Semana' : d === 'MES' ? 'Mes' : 'Todos'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar gasto, categoría, responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="INGRESOS">Solo Ingresos</option>
            <option value="EGRESOS">Solo Egresos</option>
            <option value="APERTURA">Aperturas</option>
            <option value="CIERRE">Cierres</option>
          </select>
        </div>
      </div>

      {/* Tabla de Movimientos Financieros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>{filteredMovimientos.length} transacciones registradas</span>
          <span className="text-[11px] text-slate-400">Colección: movimientos_caja</span>
        </div>

        {filteredMovimientos.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No se encontraron movimientos en este periodo</p>
            <p className="text-xs">Usa el botón "+ Nuevo Egreso Rápido" para registrar gastos o revisa tus filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha &amp; Hora</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Detalle / Justificación</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-center">Adjunto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovimientos.map((m) => {
                  const ms = getMs(m);
                  const d = new Date(ms);
                  const fechaStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                  const horaStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                  const monto = Number(m.monto) || 0;
                  const isIngreso = (m.tipo || '').includes('INGRESO') || m.tipo === 'APERTURA';

                  return (
                    <tr key={m.id || ms + Math.random()} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        <span className="font-bold">{fechaStr}</span>
                        <span className="text-slate-400 font-mono text-[11px] block">{horaStr}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            isIngreso
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {isIngreso ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                          {m.tipo === 'INGRESO_VENTA'
                            ? 'Venta'
                            : m.tipo === 'EGRESO_GASTO'
                            ? 'Gasto'
                            : m.tipo === 'APERTURA'
                            ? 'Apertura'
                            : m.tipo === 'CIERRE'
                            ? 'Cierre'
                            : m.tipo}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-800">
                        {m.categoria || 'Operativo'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                        <span className="font-medium truncate block">{m.detalle || 'Sin detalle'}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="uppercase text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {m.metodoPago || 'efectivo'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-black text-sm">
                        <span className={isIngreso ? 'text-emerald-700' : 'text-red-600'}>
                          {isIngreso ? '+' : '-'} S/ {monto.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {m.usuario || 'Cajero'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        {m.adjunto ? (
                          <span
                            className="inline-flex items-center justify-center p-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                            title={`Adjunto: ${m.adjunto}`}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Nuevo Egreso Rápido */}
      {showEgresoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm">Registrar Egreso Rápido de Caja</h3>
                  <p className="text-[10px] text-slate-400">Salida de dinero respaldada para auditoría</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEgresoModal(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEgreso} className="p-5 space-y-3.5 bg-slate-50">
              {/* Monto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Monto a Egresar (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-base font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría del Gasto *
                </label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
                >
                  {CATEGORIAS_EGRESO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detalle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Justificación / Detalle *
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Ej. Compra de 5 bolsas de hielo para la barra y limones sutiles de emergencia"
                  value={formDetalle}
                  onChange={(e) => setFormDetalle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Método de Pago */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Origen / Método
                  </label>
                  <select
                    value={formMetodo}
                    onChange={(e) => setFormMetodo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  >
                    <option value="efectivo">💵 Efectivo Gaveta</option>
                    <option value="yape">🟣 Yape / Plin</option>
                    <option value="tarjeta">💳 Tarjeta / Banco</option>
                  </select>
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Autorizado Por
                  </label>
                  <input
                    type="text"
                    value={formUsuario}
                    onChange={(e) => setFormUsuario(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
              </div>

              {/* Adjunto o N° Comprobante */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  N° Comprobante / Boleta / Foto URL (Opcional)
                </label>
                <div className="relative">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ej. Boleta B001-4921 o enlace a foto de boleta"
                    value={formAdjunto}
                    onChange={(e) => setFormAdjunto(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEgresoModal(false)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Guardando...' : 'Confirmar Egreso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
