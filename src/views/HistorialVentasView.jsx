import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Receipt,
  Printer,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  Lock,
  ShieldAlert,
  FileSpreadsheet,
  Clock,
  User,
  Utensils
} from 'lucide-react';

export default function HistorialVentasView({
  sales = [],
  onAnularVenta,
  onVerTicket,
  authSession = null,
  isFirestoreOnline = false,
  showToast = () => {}
}) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS'); // 'TODAS', 'Cobrada', 'Anulada', 'Consumo Personal'
  const [dateFilter, setDateFilter] = useState('HOY'); // 'HOY', 'SEMANA', 'MES', 'TODAS'

  // Modal de anulación (Exclusivo ADMIN)
  const [showAnularModal, setShowAnularModal] = useState(null); // venta a anular
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);

  // Verificación de rol admin (Cynthia o Don Marco)
  const isAdmin = authSession?.role === 'admin';

  // Helpers de fecha
  const getMs = (s) => {
    if (s.tsMs) return s.tsMs;
    if (s.timestamp) return typeof s.timestamp === 'number' ? s.timestamp : Date.parse(s.timestamp);
    if (s.fecha && typeof s.fecha.toDate === 'function') return s.fecha.toDate().getTime();
    return Date.now();
  };

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Filtrado de ventas
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter((s) => {
      const ms = getMs(s);
      const sDate = new Date(ms);

      // Filtro fecha
      if (dateFilter === 'HOY' && !isSameDay(sDate, now)) return false;
      if (dateFilter === 'SEMANA' && sDate < startOfWeek) return false;
      if (dateFilter === 'MES' && sDate < startOfMonth) return false;

      // Filtro estado
      const estado = s.estado || 'Cobrada';
      if (statusFilter !== 'TODAS' && estado !== statusFilter) return false;

      // Buscador
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const id = (s.id || '').toLowerCase();
        const mesa = (s.mesa || '').toLowerCase();
        const resp = (s.responsable || '').toLowerCase();
        const cajero = (s.cajero || '').toLowerCase();
        const cliente = (s.cliente || '').toLowerCase();
        const comprobante = (s.nroComprobante || s.id || '').toLowerCase();
        if (
          !id.includes(q) &&
          !mesa.includes(q) &&
          !resp.includes(q) &&
          !cajero.includes(q) &&
          !cliente.includes(q) &&
          !comprobante.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sales, dateFilter, statusFilter, searchTerm]);

  // Resumen
  const resumen = useMemo(() => {
    let cobradasTotal = 0;
    let cobradasCount = 0;
    let anuladasTotal = 0;
    let anuladasCount = 0;

    filteredSales.forEach((s) => {
      const tot = Number(s.total) || 0;
      const estado = s.estado || 'Cobrada';
      if (estado === 'Cobrada') {
        cobradasTotal += tot;
        cobradasCount++;
      } else if (estado === 'Anulada') {
        anuladasTotal += tot;
        anuladasCount++;
      }
    });

    return {
      cobradasTotal,
      cobradasCount,
      anuladasTotal,
      anuladasCount
    };
  }, [filteredSales]);

  // Manejo de anulación
  const handleConfirmAnulacion = async (e) => {
    e.preventDefault();
    if (!showAnularModal) return;

    if (!motivoAnulacion.trim()) {
      setPinError('Debes ingresar un motivo de anulación obligatorio.');
      return;
    }

    // Si el usuario logueado no es admin directo, pide PIN de admin (1234)
    if (!isAdmin && adminPin !== '1234') {
      setPinError('PIN de Administrador incorrecto (Autorizado solo para Cynthia / Don Marco).');
      return;
    }

    setIsAnulando(true);
    setPinError('');

    try {
      if (onAnularVenta) {
        await onAnularVenta(showAnularModal, motivoAnulacion.trim(), authSession?.userName || 'Cynthia (Admin)');
      }
      showToast('success', `Venta #${showAnularModal.id} anulada con éxito y stock devuelto a cocina.`);
      setShowAnularModal(null);
      setMotivoAnulacion('');
      setAdminPin('');
    } catch (err) {
      console.error('Error anulando venta:', err);
      showToast('error', `Error al anular venta: ${err.message || 'Error de permisos'}`);
    } finally {
      setIsAnulando(false);
    }
  };

  // Exportar reporte
  const exportarCSV = () => {
    if (filteredSales.length === 0) {
      showToast('info', 'No hay ventas para exportar con los filtros actuales.');
      return;
    }

    const headers = ['Comprobante / Ticket', 'Fecha', 'Hora', 'Mesa / Zona', 'Mozo', 'Cajero', 'Total (S/)', 'Método Pago', 'Estado', 'Motivo Anulación'];
    const rows = filteredSales.map((s) => {
      const ms = getMs(s);
      const d = new Date(ms);
      const fecha = d.toLocaleDateString('es-PE');
      const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const comp = s.nroComprobante || s.id;
      const mesa = s.mesa || 'Mesa';
      const mozo = s.responsable || 'Mozo';
      const cajero = s.cajero || s.responsable || 'Caja';
      const total = (Number(s.total) || 0).toFixed(2);
      const met = s.pagos && s.pagos.length > 1 ? 'MIXTO' : s.metodoPago || 'efectivo';
      const est = s.estado || 'Cobrada';
      const mot = (s.motivoAnulacion || '').replace(/"/g, '""');

      return `"${comp}","${fecha}","${hora}","${mesa}","${mozo}","${cajero}","${total}","${met}","${est}","${mot}"`;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `registro_ventas_lanchita_${dateFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Registro de ventas exportado exitosamente a CSV/Excel.');
  };

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Cabecera del Registro de Ventas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-400 flex items-center justify-center text-sky-700">
              <Receipt className="w-4 h-4 text-sky-600" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Registro de Ventas, Auditoría &amp; Reimpresión
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
            Ventas &gt; Registro de Ventas • Comandas cobradas, anuladas y consumo de personal con trazabilidad
          </p>
        </div>

        <button
          type="button"
          onClick={exportarCSV}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Exportar Ventas CSV</span>
        </button>
      </div>

      {/* Mini Resumen de Ventas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Ventas Cobradas</span>
          <div className="text-lg font-black font-mono text-emerald-800 mt-0.5">
            S/ {resumen.cobradasTotal.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">{resumen.cobradasCount} tickets activos</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-red-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider">Ventas Anuladas</span>
          <div className="text-lg font-black font-mono text-red-700 mt-0.5">
            S/ {resumen.anuladasTotal.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">{resumen.anuladasCount} tickets revertidos</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ticket Promedio</span>
          <div className="text-lg font-black font-mono text-slate-800 mt-0.5">
            S/ {resumen.cobradasCount > 0 ? (resumen.cobradasTotal / resumen.cobradasCount).toFixed(2) : '0.00'}
          </div>
          <span className="text-[10px] text-slate-500">Por comanda</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Rol Activo</span>
          <div className="text-sm font-black text-slate-800 mt-0.5 truncate">
            {authSession?.userName || 'Operador'}
          </div>
          <span className="text-[10px] text-amber-700 font-bold">
            {isAdmin ? '👑 ADMIN (Anulación Habilitada)' : '💼 Cajero / Mozo'}
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {['HOY', 'SEMANA', 'MES', 'TODAS'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === d ? 'bg-[#0F172A] text-amber-400 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d === 'HOY' ? 'Hoy' : d === 'SEMANA' ? 'Semana' : d === 'MES' ? 'Mes' : 'Histórico'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por comanda, mesa, mozo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
          >
            <option value="TODAS">Todos los Estados</option>
            <option value="Cobrada">✅ Cobradas</option>
            <option value="Anulada">❌ Anuladas</option>
            <option value="Consumo Personal">🍽️ Consumo Personal</option>
          </select>
        </div>
      </div>

      {/* Tabla del Registro de Ventas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>{filteredSales.length} ventas encontradas</span>
          <span className="text-[11px] text-slate-400">Colección: ventas</span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No se encontraron ventas con los filtros actuales</p>
            <p className="text-xs">Realiza cobros en la pestaña de Ventas o cambia el filtro de fecha.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">N° Comprobante</th>
                  <th className="py-2.5 px-3">Fecha &amp; Hora</th>
                  <th className="py-2.5 px-3">Mesa / Zona</th>
                  <th className="py-2.5 px-3">Mozo</th>
                  <th className="py-2.5 px-3">Cajero</th>
                  <th className="py-2.5 px-3">Método Pago</th>
                  <th className="py-2.5 px-3 text-right">Total (S/)</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const ms = getMs(sale);
                  const d = new Date(ms);
                  const fechaStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                  const horaStr = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                  const total = Number(sale.total) || 0;
                  const estado = sale.estado || 'Cobrada';
                  const isAnulada = estado === 'Anulada';
                  const isConsumo = estado === 'Consumo Personal';

                  return (
                    <tr
                      key={sale.id || ms + Math.random()}
                      className={`hover:bg-slate-50 transition ${isAnulada ? 'opacity-60 bg-red-50/20' : ''}`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {sale.nroComprobante || sale.id}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        <span>{fechaStr}</span>
                        <span className="text-slate-400 font-mono text-[11px] block">{horaStr}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900">{sale.mesa}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {sale.area === 'terraza' ? '🎤 Terraza' : '🐟 Salón'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        {sale.responsable || 'Mozo 1'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        {sale.cajero || sale.responsable || 'Caja'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="uppercase text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {sale.pagos && sale.pagos.length > 1 ? 'MIXTO' : sale.metodoPago || 'efectivo'}
                        </span>
                      </td>

                      <td className={`py-2.5 px-3 whitespace-nowrap text-right font-mono font-black text-sm ${isAnulada ? 'line-through text-red-500' : 'text-slate-900'}`}>
                        S/ {total.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        {isAnulada ? (
                          <span
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300"
                            title={`Anulado por: ${sale.anuladoPor || 'Admin'} - ${sale.motivoAnulacion || ''}`}
                          >
                            Anulada
                          </span>
                        ) : isConsumo ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                            Consumo Personal
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Cobrada
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón [🖨️ Ticket] */}
                          <button
                            type="button"
                            onClick={() => onVerTicket && onVerTicket(sale)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                            title="Reimprimir Comprobante Térmico"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" />
                            <span>Ticket</span>
                          </button>

                          {/* Botón [❌ Anular] - Exclusivo ADMIN */}
                          {!isAnulada && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAnularModal(sale);
                                setMotivoAnulacion('');
                                setAdminPin('');
                                setPinError('');
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                              title="Anular venta y devolver insumos al stock (Solo ADMIN)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span className="hidden sm:inline">Anular</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Confirmación de Anulación Obligatoria */}
      {showAnularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-red-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-sm">Anular Venta / Devolver Stock</h3>
                  <p className="text-[10px] text-red-100">Ticket #{showAnularModal.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnularModal(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAnulacion} className="p-5 space-y-3 bg-slate-50">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mesa:</span>
                  <span className="font-bold text-slate-800">{showAnularModal.mesa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto:</span>
                  <span className="font-mono font-black text-red-600 text-sm">
                    S/ {Number(showAnularModal.total || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Acción automática:</span>
                  <span className="font-bold text-emerald-700">Devuelve insumos al Kardex</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo de Anulación (Obligatorio) *
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Ej. Error en digitación de mesa, cliente canceló comanda antes de preparación..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {!isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PIN de Administrador (Cynthia / Don Marco) *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full text-center font-mono font-black text-lg bg-white border border-slate-300 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {pinError && (
                <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnularModal(null)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAnulando}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isAnulando ? 'Anulando...' : 'Confirmar Anulación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
