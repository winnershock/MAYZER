const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

if (!process.env.ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[crypto] ENCRYPTION_KEY no definida. Configura la variable de entorno antes de iniciar en producción.');
  } else {
    console.warn('[crypto] ADVERTENCIA: ENCRYPTION_KEY no definida. Usando clave de desarrollo. NO usar en producción.');
  }
}
const rawKey = process.env.ENCRYPTION_KEY || 'mayzer_dev_key_no_usar_produccion';
const KEY = Buffer.alloc(32);
Buffer.from(rawKey, 'utf8').copy(KEY);

function cifrar(texto) {
  if (texto === null || texto === undefined) return null;
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function descifrar(valor) {
  if (valor === null || valor === undefined) return null;

  try {
    const texto = Buffer.isBuffer(valor) ? valor.toString('binary') : String(valor);
    if (!texto) return null;

    const colonIdx = texto.indexOf(':');
    if (colonIdx < 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[crypto] descifrar: formato inválido (sin separador ":")', texto.slice(0, 20));
      }
      return null;
    }

    const ivHex        = texto.slice(0, colonIdx);
    const encryptedHex = texto.slice(colonIdx + 1);

    const iv        = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== 16) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[crypto] descifrar: IV de longitud incorrecta:', iv.length);
      }
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[crypto] descifrar: error al descifrar:', err.message);
    }
    return null;
  }
}

function hashBusqueda(texto) {
  if (texto === null || texto === undefined) return null;
  const normalizado = String(texto).trim().toUpperCase();
  if (!normalizado) return null;
  return crypto.createHmac('sha256', KEY).update(normalizado).digest('hex');
}

module.exports = { cifrar, descifrar, hashBusqueda };
