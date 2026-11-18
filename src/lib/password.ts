// Medidor de seguridad de contraseñas para el registro. Es una guía para quien escribe, no una regla:
// el backend solo exige entre 8 y 72 caracteres. Se evalúa en el navegador y la contraseña no sale de él.

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;
export type StrengthTip = "short" | "common" | "repeated" | "personal" | "mix" | "longer" | "great";

export interface Strength {
  level: StrengthLevel; // 0 = vacía; 1 débil, 2 regular, 3 buena, 4 fuerte
  tip: StrengthTip;
}

// Contraseñas y patrones que cualquiera prueba primero (en minúsculas y sin acentos).
const COMMON = [
  "12345678", "123456789", "1234567890", "11111111", "00000000", "87654321", "password", "password1", "passw0rd",
  "contrasena", "contrasena1", "qwertyui", "qwerty123", "qwertyuiop", "abc12345", "iloveyou", "admin123", "letmein1",
  "colombia", "colombia1", "santamarta", "tamaka", "tamaka123", "tamaka2026", "bienvenido", "123qweasd",
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function isSequence(pw: string) {
  if (pw.length < 6) return false;
  const codes = [...pw].map((c) => c.charCodeAt(0));
  const step = codes[1] - codes[0];
  return (step === 1 || step === -1) && codes.every((c, i) => i === 0 || c - codes[i - 1] === step);
}

function includesPersonal(pw: string, parts: string[]) {
  const low = fold(pw);
  return parts.some((p) => p.length >= 3 && low.includes(p));
}

export function passwordStrength(pw: string, personal: { name?: string; email?: string } = {}): Strength {
  if (!pw) return { level: 0, tip: "short" };
  if (pw.length < 8) return { level: 1, tip: "short" };

  const low = fold(pw);
  if (COMMON.some((c) => low === c || (low.length <= c.length + 2 && low.includes(c)))) return { level: 1, tip: "common" };
  if (/^(.)\1+$/.test(pw) || isSequence(low)) return { level: 1, tip: "repeated" };

  const parts = [
    ...fold(personal.name ?? "").split(/[^a-z0-9]+/),
    fold(personal.email ?? "").split("@")[0],
  ].filter(Boolean);
  if (includesPersonal(pw, parts)) return { level: 1, tip: "personal" };

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  let score = 1 + (pw.length >= 12 ? 1 : 0) + (pw.length >= 16 ? 1 : 0) + (classes >= 3 ? 1 : 0);
  if (classes === 1) score = Math.min(score, 2); // solo letras o solo números: nunca pasa de regular

  const level = Math.min(score, 4) as StrengthLevel;
  if (level === 4) return { level, tip: "great" };
  if (classes < 3) return { level, tip: "mix" };
  return { level, tip: pw.length < 12 ? "longer" : "great" };
}
