/**
 * ============================================================================
 * READING STATS MANAGER - SEGUIMIENTO PRIVADO Y LOCAL DE HÁBITOS DE LECTURA
 * ============================================================================
 * Registra minutos leídos, rachas de días consecutivos y estadísticas de libros
 * completados por mes y año. 100% privado y almacenado en localStorage.
 */

export class ReadingStatsManager {
  static STORAGE_KEY = 'arcadia_reading_stats';

  /**
   * Carga las estadísticas actuales desde localStorage.
   */
  static getRawData() {
    try {
      const raw = localStorage.getItem(ReadingStatsManager.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}

    return {
      totalMinutesRead: 0,
      dailyLog: {},         // { "YYYY-MM-DD": minutes }
      completedLog: []      // [ { bookId, timestamp, monthKey: "YYYY-MM" } ]
    };
  }

  /**
   * Guarda los datos actualizados.
   */
  static saveData(data) {
    try {
      localStorage.setItem(ReadingStatsManager.STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  /**
   * Formatea la fecha de hoy en formato ISO local "YYYY-MM-DD".
   */
  static getTodayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea la clave del mes actual "YYYY-MM".
   */
  static getMonthKey(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Registra minutos leídos en la sesión actual.
   * @param {number} minutes 
   */
  static recordMinutes(minutes = 1) {
    if (minutes <= 0) return;
    const data = ReadingStatsManager.getRawData();
    data.totalMinutesRead = (data.totalMinutesRead || 0) + minutes;

    const todayKey = ReadingStatsManager.getTodayKey();
    data.dailyLog[todayKey] = (data.dailyLog[todayKey] || 0) + minutes;

    ReadingStatsManager.saveData(data);
  }

  /**
   * Registra la finalización de un libro.
   * @param {string} bookId 
   */
  static recordBookCompleted(bookId) {
    if (!bookId) return;
    const data = ReadingStatsManager.getRawData();
    data.completedLog = data.completedLog || [];

    // Evitar duplicados recientes
    const alreadyLogged = data.completedLog.some(item => item.bookId === bookId);
    if (!alreadyLogged) {
      data.completedLog.push({
        bookId,
        timestamp: Date.now(),
        monthKey: ReadingStatsManager.getMonthKey()
      });
      ReadingStatsManager.saveData(data);
    }
  }

  /**
   * Calcula la racha actual de días consecutivos leyendo.
   */
  static calculateStreak(dailyLog = {}) {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    // Verificar si hoy hubo lectura
    const todayKey = ReadingStatsManager.getTodayKey();
    let hasReadToday = (dailyLog[todayKey] || 0) > 0;

    if (hasReadToday) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Si hoy aún no ha leído, verificar desde ayer
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Recorrer días hacia atrás consecutivamente
    while (true) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if ((dailyLog[dateKey] || 0) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Genera el resumen consolidado de estadísticas para el Dashboard.
   * @param {Array} allBooksList 
   */
  static getStats(allBooksList = []) {
    const data = ReadingStatsManager.getRawData();
    const streak = ReadingStatsManager.calculateStreak(data.dailyLog);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthKey = ReadingStatsManager.getMonthKey(now);

    // Libros marcados como completados en IndexedDB o en el log
    const completedBooksInDb = allBooksList.filter(b => b.status === 'completed' || b.progress >= 99);
    const completedLog = data.completedLog || [];

    const totalCompleted = Math.max(completedBooksInDb.length, completedLog.length);

    const completedThisMonth = completedLog.filter(item => item.monthKey === currentMonthKey).length ||
      completedBooksInDb.filter(b => {
        if (!b.lastReadAt) return false;
        const d = new Date(b.lastReadAt);
        return d.getFullYear() === currentYear && (d.getMonth() + 1) === (now.getMonth() + 1);
      }).length;

    const completedThisYear = completedLog.filter(item => {
      const yr = parseInt((item.monthKey || '').split('-')[0], 10);
      return yr === currentYear;
    }).length || completedBooksInDb.filter(b => {
      if (!b.lastReadAt) return false;
      return new Date(b.lastReadAt).getFullYear() === currentYear;
    }).length;

    // Formatear horas y minutos totales
    const totalMins = data.totalMinutesRead || 0;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

    // Generar datos para el gráfico de los últimos 6 meses
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyChartData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = ReadingStatsManager.getMonthKey(d);
      const label = monthNames[d.getMonth()];

      const count = completedLog.filter(item => item.monthKey === mKey).length +
        completedBooksInDb.filter(b => {
          if (!b.lastReadAt) return false;
          const bd = new Date(b.lastReadAt);
          return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
        }).length;

      monthlyChartData.push({
        monthLabel: label,
        count: count
      });
    }

    return {
      totalMinutesRead: totalMins,
      timeFormatted,
      streakDays: streak,
      totalCompleted,
      completedThisMonth,
      completedThisYear,
      monthlyChartData
    };
  }
}
