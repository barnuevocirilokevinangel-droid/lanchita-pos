import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Coins,
  Receipt,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  X,
  FileSpreadsheet,
  Download,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  QrCode,
  CreditCard,
  Banknote,
  RotateCcw
} from 'lucide-react';

export default function CierreCajaView({
  cierres = [],
  dailySummary = {},
  cajaSummary = {},
  onGuardarCierre,
  activeUser = 'Administrador',
  activeArea = 'salon',
  isFirestoreOnline = false,
  showToast = () => {}
}) {
  // Pestaña superior: [Arqueo / Cierre Actual] vs [Historial de Cierres]
  const [activeSubTab, setActiveSubTab] = useState('cierre_actual'); // 'cierre_actual' | 'historial_cierres'

  // Estados del Formulario de Cierre Actual
  const [turno, setTurno] = useState('Turno Completo');
  const [responsable, setResponsable] = useState(activeUser);
  const [saldoInicialInput, setSaldoInicialInput] = useState('100.00'); // S/ 100 de fondo base
  const [efectivoRealInput, setEfectivoRealInput] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Reporte / Cuaderno Contable para Re-descargar o Imprimir
  const [cierreSeleccionado, setCierreSeleccionado] = useState(null);

  // Cifras en vivo calculadas del día actual
  const efectivoVentas = Number(cajaSummary.efectivoVentas || 0);
  const totalSalidas = Number(cajaSummary.totalSalidas || 0);
  const totalDigital = Number(cajaSummary.digital || 0);
  const totalFacturado = Number(cajaSummary.total || 0);
  const ticketsCount = Number(cajaSummary.tickets || 0);

  const saldoInicial = parseFloat(saldoInicialInput) || 0;
  const efectivoTeoricoGaveta = saldoInicial + efectivoVentas - totalSalidas;
  const efectivoReal = parseFloat(efectivoRealInput) || 0;
  const descuadre = efectivoRealInput !== '' ? Math.round((efectivoReal - efectivoTeoricoGaveta) * 100) / 100 : 0;

  // Confirmar Cierre Diario
  const handleConfirmarCierre = async (e) => {
    e.preventDefault();

    if (efectivoRealInput === '') {
      showToast('error', 'Ingresa el monto de efectivo real contado físicamente en la gaveta.');
      return;
    }

    if (!window.confirm(`¿Confirmas el Cierre de Caja del ${turno}?\nEfectivo Real Contado: S/ ${efectivoReal.toFixed(2)}\nDescuadre: S/ ${descuadre.toFixed(2)}`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevoCierre = {
        fecha: new Date().toISOString(),
        fechaStr: new Date().toLocaleDateString('es-PE'),
        horaStr: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        turno,
        responsable: responsable.trim() || activeUser,
        saldoInicial: Math.round(saldoInicial * 100) / 100,
        efectivoVentas: Math.round(efectivoVentas * 100) / 100,
        totalEfectivo: Math.round(efectivoReal * 100) / 100,
        efectivoTeorico: Math.round(efectivoTeoricoGaveta * 100) / 100,
        totalDigital: Math.round(totalDigital * 100) / 100,
        gastosTotales: Math.round(totalSalidas * 100) / 100,
        totalFacturado: Math.round(totalFacturado * 100) / 100,
        descuadre,
        ticketsCount,
        observaciones: observaciones.trim() || 'Sin observaciones',
        estacionId: activeArea,
        timestamp: Date.now()
      };

      if (onGuardarCierre) {
        await onGuardarCierre(nuevoCierre);
      }

      showToast('success', `¡Cierre de Caja registrado con éxito! Descuadre: S/ ${descuadre.toFixed(2)}`);
      setCierreSeleccionado(nuevoCierre);
      setEfectivoRealInput('');
      setObservaciones('');
      setActiveSubTab('historial_cierres');
    } catch (err) {
      console.error('Error al guardar cierre de caja:', err);
      showToast('error', `Error al registrar cierre: ${err.message || 'Error de red'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar histórico a CSV
  const exportarHistorialCSV = () => {
    if (cierres.length === 0) {
      showToast('info', 'No hay registros de cierres de caja para exportar.');
      return;
    }

    const headers = [
      'Fecha Cierre',
      'Hora',
      'Turno',
      'Responsable',
      'Saldo Inicial (S/)',
      'Ventas Efectivo (S/)',
      'Gastos Totales (S/)',
      'Efectivo Real (S/)',
      'Total Digital (S/)',
      'Total Facturado (S/)',
      'Descuadre / Diferencia (S/)',
      'Comandas Cobradas',
      'Observaciones'
    ];

    const rows = cierres.map((c) => {
      const d = c.fecha ? new Date(c.fecha) : new Date(c.timestamp || Date.now());
      const fecha = d.toLocaleDateString('es-PE');
      const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const tur = c.turno || 'Completo';
      const resp = (c.responsable || 'Admin').replace(/"/g, '""');
      const sIni = (Number(c.saldoInicial) || 0).toFixed(2);
      const vEfe = (Number(c.efectivoVentas) || 0).toFixed(2);
      const gas = (Number(c.gastosTotales) || 0).toFixed(2);
      const efeReal = (Number(c.totalEfectivo) || 0).toFixed(2);
      const dig = (Number(c.totalDigital) || 0).toFixed(2);
      const fac = (Number(c.totalFacturado) || 0).toFixed(2);
      const desc = (Number(c.descuadre) || 0).toFixed(2);
      const tix = c.ticketsCount || 0;
      const obs = (c.observaciones || '').replace(/"/g, '""');

      return `"${fecha}","${hora}","${tur}","${resp}","${sIni}","${vEfe}","${gas}","${efeReal}","${dig}","${fac}","${desc}","${tix}","${obs}"`;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_cierres_lanchita_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Historial de cierres exportado exitosamente a CSV/Excel.');
  };

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Cabecera y Pestañas Superiores */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400 flex items-center justify-center text-purple-700">
              <Coins className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Arqueo de Caja &amp; Historial de Cierres Diarios
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
            Consola Caja &gt; Arqueo y Cierre Diario • Cuaderno contable oficial y auditoría de descuadres
          </p>
        </div>

        {/* Switch Superior: [Arqueo / Cierre Actual] vs [Historial de Cierres] */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('cierre_actual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'cierre_actual'
                ? 'bg-[#0F172A] text-amber-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Arqueo Actual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('historial_cierres')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'historial_cierres'
                ? 'bg-[#0F172A] text-amber-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Historial de Cierres</span>
            {cierres.length > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
                {cierres.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: ARQUEO / CIERRE ACTUAL */}
      {activeSubTab === 'cierre_actual' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Tarjetas de Cifras del Día */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Saldo Inicial Base</span>
              <div className="text-xl font-black font-mono text-slate-800 mt-0.5">
                S/ {saldoInicial.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Fondo de apertura</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/30">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Ventas en Efectivo</span>
              <div className="text-xl font-black font-mono text-emerald-700 mt-0.5">
                + S/ {efectivoVentas.toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-600">Entró a gaveta hoy</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-red-200 shadow-xs bg-red-50/30">
              <span className="text-[10px] uppercase font-bold text-red-800 tracking-wider">Gastos de Caja Chica</span>
              <div className="text-xl font-black font-mono text-red-600 mt-0.5">
                - S/ {totalSalidas.toFixed(2)}
              </div>
              <span className="text-[10px] text-red-500">Salidas justificadas</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-xs bg-purple-50/30">
              <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider">Cobros Digitales</span>
              <div className="text-xl font-black font-mono text-purple-700 mt-0.5">
                S/ {totalDigital.toFixed(2)}
              </div>
              <span className="text-[10px] text-purple-600">Yape, Plin y Tarjetas</span>
            </div>
          </div>

          {/* Formulario de Arqueo y Cuadre */}
          <form onSubmit={handleConfirmarCierre} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Formulario Oficial de Arqueo de Caja</h3>
                <p className="text-xs text-slate-500">Cuenta el dinero físico presente en la gaveta y valida la diferencia</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Efectivo Teórico Esperado:</span>
                <div className="font-mono font-black text-slate-800 text-base">
                  S/ {efectivoTeoricoGaveta.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Turno */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Turno a Cerrar
                </label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  <option value="Turno Mañana (11:00am - 4:00pm)">Turno Mañana (11:00am - 4:00pm)</option>
                  <option value="Turno Noche / Terraza (4:00pm - Cierre)">Turno Noche / Terraza (4:00pm - Cierre)</option>
                  <option value="Jornada Completa">Jornada Completa (Día Completo)</option>
                </select>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Responsable del Cierre
                </label>
                <input
                  type="text"
                  required
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                />
              </div>

              {/* Saldo Inicial Base */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fondo Inicial Base (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={saldoInicialInput}
                  onChange={(e) => setSaldoInicialInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                />
              </div>
            </div>

            {/* Cuadro de Conteo Real y Cálculo de Descuadre */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
                  💵 Efectivo Real Contado en Gaveta (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    value={efectivoRealInput}
                    onChange={(e) => setEfectivoRealInput(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xl font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Suma física de billetes y monedas presentes en la gaveta
                </span>
              </div>

              {/* Indicador Visual de Descuadre */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Diferencia / Descuadre
                </span>
                <div
                  className={`text-2xl font-black font-mono ${
                    efectivoRealInput === ''
                      ? 'text-slate-400'
                      : descuadre === 0
                      ? 'text-emerald-700'
                      : descuadre < 0
                      ? 'text-red-600'
                      : 'text-sky-700'
                  }`}
                >
                  {efectivoRealInput === ''
                    ? '—'
                    : descuadre === 0
                    ? 'S/ 0.00 (Cuadrada Exacta)'
                    : descuadre < 0
                    ? `- S/ ${Math.abs(descuadre).toFixed(2)} (Faltante)`
                    : `+ S/ ${descuadre.toFixed(2)} (Sobrante)`}
                </div>
                <div className="text-[10px] text-slate-500">
                  {efectivoRealInput === ''
                    ? 'Ingresa el conteo para calcular'
                    : descuadre === 0
                    ? '✅ El arqueo coincide exactamente con los registros del sistema'
                    : descuadre < 0
                    ? '⚠️ Hay menos efectivo en gaveta que el teórico calculado'
                    : 'ℹ️ Hay un excedente sobre el efectivo teórico calculado'}
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observaciones del Arqueo
              </label>
              <textarea
                rows="2"
                placeholder="Anota cualquier incidencia relevante del turno, propinas retiradas o justificación de descuadre..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>

            {/* Botón de Confirmación */}
            <button
              type="submit"
              disabled={isSubmitting || efectivoRealInput === ''}
              className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-black text-sm shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Registrando Cierre...' : 'Guardar Cierre de Caja & Generar Cuaderno Contable'}</span>
            </button>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE CIERRES DIARIOS (ARQUEOS GUARDADOS) */}
      {activeSubTab === 'historial_cierres' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Historial de Cierres de Caja Guardados</h3>
              <p className="text-xs text-slate-500">Auditoría contable completa de turnos pasados</p>
            </div>
            <button
              type="button"
              onClick={exportarHistorialCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Todo CSV</span>
            </button>
          </div>

          {cierres.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Coins className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Aún no hay cierres de caja registrados</p>
              <p className="text-xs">Ve a la pestaña [Arqueo Actual] para realizar el primer cierre de turno.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Fecha de Cierre</th>
                      <th className="py-2.5 px-3">Turno</th>
                      <th className="py-2.5 px-3">Responsable</th>
                      <th className="py-2.5 px-3 text-right">Efectivo Real</th>
                      <th className="py-2.5 px-3 text-right">Total Digital</th>
                      <th className="py-2.5 px-3 text-right">Gastos Totales</th>
                      <th className="py-2.5 px-3 text-right">Descuadre</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cierres.map((c, idx) => {
                      const d = c.fecha ? new Date(c.fecha) : new Date(c.timestamp || Date.now());
                      const fechaStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                      const horaStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                      const desc = Number(c.descuadre) || 0;

                      return (
                        <tr key={c.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                            <span className="font-bold">{fechaStr}</span>
                            <span className="text-slate-400 font-mono text-[11px] block">{horaStr}</span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">
                            {c.turno || 'Jornada Completa'}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                            {c.responsable || 'Admin'}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-black text-slate-900">
                            S/ {(Number(c.totalEfectivo) || 0).toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-purple-700">
                            S/ {(Number(c.totalDigital) || 0).toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-red-600">
                            - S/ {(Number(c.gastosTotales) || 0).toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-black">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                desc === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : desc < 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {desc === 0 ? 'S/ 0.00' : desc < 0 ? `- S/ ${Math.abs(desc).toFixed(2)}` : `+ S/ ${desc.toFixed(2)}`}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-center">
                            {/* Botón Re-descargar PDF Cuaderno */}
                            <button
                              type="button"
                              onClick={() => setCierreSeleccionado(c)}
                              className="px-2.5 py-1 bg-[#0F172A] hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto active:scale-95 cursor-pointer shadow-xs"
                              title="Re-descargar PDF / Imprimir Cuaderno Contable"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cuaderno</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Vista del Cuaderno Contable Diario para Imprimir / Re-descargar */}
      {cierreSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm">Cuaderno Contable Diario</h3>
                  <p className="text-[10px] text-slate-400">Reporte oficial de Arqueo y Cierre</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCierreSeleccionado(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-white font-mono text-xs space-y-3 select-text border-b border-dashed border-slate-300 max-h-[70vh] overflow-y-auto">
              <div className="text-center space-y-1">
                <div className="font-black text-sm tracking-widest uppercase">*** LA LANCHITA ***</div>
                <div className="text-[11px] text-slate-500">CEVICHERÍA &amp; BARRA MARINA</div>
                <div className="text-[10px] text-slate-400">RUC: 20608945123</div>
                <div className="font-bold text-[11px] text-slate-800 pt-1">REPORTE DE CIERRE DE CAJA DIARIO</div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-0.5 text-[11px]">
                <div>Fecha: <b>{cierreSeleccionado.fechaStr || new Date(cierreSeleccionado.fecha || cierreSeleccionado.timestamp).toLocaleDateString('es-PE')}</b></div>
                <div>Hora: <b>{cierreSeleccionado.horaStr || new Date(cierreSeleccionado.fecha || cierreSeleccionado.timestamp).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</b></div>
                <div>Turno: <b>{cierreSeleccionado.turno}</b></div>
                <div>Responsable: <b>{cierreSeleccionado.responsable}</b></div>
                <div>Estación: <b>{cierreSeleccionado.estacionId || 'Salón Principal'}</b></div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>(+) Fondo Inicial:</span>
                  <span className="font-bold">S/ {(Number(cierreSeleccionado.saldoInicial) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>(+) Ventas Efectivo:</span>
                  <span className="font-bold">+ S/ {(Number(cierreSeleccionado.efectivoVentas) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>(-) Gastos Caja Chica:</span>
                  <span className="font-bold">- S/ {(Number(cierreSeleccionado.gastosTotales) || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-1 flex justify-between font-bold">
                  <span>(=) Efectivo Teórico Esperado:</span>
                  <span>S/ {(Number(cierreSeleccionado.efectivoTeorico) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between text-base font-black">
                  <span>EFECTIVO CONTADO REAL:</span>
                  <span>S/ {(Number(cierreSeleccionado.totalEfectivo) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>DIFERENCIA / DESCUADRE:</span>
                  <span className={(Number(cierreSeleccionado.descuadre) || 0) < 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {(Number(cierreSeleccionado.descuadre) || 0) === 0
                      ? 'S/ 0.00 (EXACTA)'
                      : (Number(cierreSeleccionado.descuadre) || 0) < 0
                      ? `- S/ ${Math.abs(Number(cierreSeleccionado.descuadre)).toFixed(2)} (FALTA)`
                      : `+ S/ ${Number(cierreSeleccionado.descuadre).toFixed(2)} (SOBRA)`}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px] text-purple-900">
                <div className="flex justify-between">
                  <span>Cobros Digitales (Yape/Plin/Tarj):</span>
                  <span className="font-bold">S/ {(Number(cierreSeleccionado.totalDigital) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>TOTAL FACTURADO DEL DÍA:</span>
                  <span>S/ {(Number(cierreSeleccionado.totalFacturado) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500">
                <div>Observaciones: {cierreSeleccionado.observaciones || 'Sin observaciones'}</div>
                <div className="text-center pt-2 text-slate-400">--- CUADERNO CONTABLE CONFORME ---</div>
              </div>
            </div>

            <div className="p-3 bg-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Cuaderno</span>
              </button>
              <button
                type="button"
                onClick={() => setCierreSeleccionado(null)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
