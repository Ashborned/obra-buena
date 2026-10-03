"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.horaSegunReloj = horaSegunReloj;
exports.horaEfectiva = horaEfectiva;
/** Hora de oración para una fecha, usando la hora local del teléfono. */
function horaSegunReloj(fecha = new Date()) {
    const h = fecha.getHours();
    if (h >= 5 && h < 12)
        return 'day';
    if (h >= 12 && h < 20)
        return 'dusk';
    return 'night';
}
/** Hora efectiva: la fijada en Configuración, o la del reloj si es `auto`. */
function horaEfectiva(preferencia, fecha = new Date()) {
    return preferencia === 'auto' ? horaSegunReloj(fecha) : preferencia;
}
