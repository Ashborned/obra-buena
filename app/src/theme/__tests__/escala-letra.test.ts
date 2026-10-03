import { escalarSp, interlineadoCompensado, spParaDp } from '../escala-letra';
import { tipografia } from '../tipografia';

describe('escalarSp', () => {
  it('es lineal bajo 1.03', () => {
    expect(escalarSp(21, 1)).toBe(21);
  });
  it('sigue la tabla de Android 14 en sus puntos', () => {
    expect(escalarSp(14, 2)).toBeCloseTo(26);
    expect(escalarSp(30, 1.3)).toBeCloseTo(30);
  });
});

describe('interlineadoCompensado', () => {
  it('no cambia nada sin letra grande', () => {
    expect(interlineadoCompensado(21, 28, 1)).toBe(28);
  });

  it.each([1.15, 1.3, 1.5, 1.8, 2])(
    'conserva la proporción de cada rol con escala %s',
    (escala) => {
      for (const estilo of Object.values(tipografia)) {
        const lh = interlineadoCompensado(estilo.fontSize, estilo.lineHeight, escala);
        expect(lh).toBeGreaterThanOrEqual(estilo.lineHeight);
        const proporcion = estilo.lineHeight / estilo.fontSize;
        expect(escalarSp(lh, escala)).toBeGreaterThanOrEqual(
          proporcion * escalarSp(estilo.fontSize, escala) - 1e-6,
        );
      }
    },
  );

  it('respeta maxFontSizeMultiplier', () => {
    const { fontSize, lineHeight } = tipografia.pestana;
    const lh = interlineadoCompensado(fontSize, lineHeight, 2, 1.4);
    expect(Math.min(escalarSp(lh, 2), lh * 1.4)).toBeGreaterThanOrEqual(lineHeight * 1.4 - 1e-6);
  });
});

describe('spParaDp', () => {
  it('es la inversa de la escala del sistema', () => {
    for (const escala of [1.15, 1.3, 2]) {
      expect(escalarSp(spParaDp(23, escala, true), escala)).toBeCloseTo(23, 3);
    }
    expect(spParaDp(21, 2, false)).toBeCloseTo(10.5);
    expect(spParaDp(21, 1, true)).toBe(21);
  });
});
