/**
 * Amedeo — Form Handler (Google Apps Script) — v2 cu logging detaliat
 *
 * Routing:
 *   - form-name = "alatura" → amedeo.oficial@gmail.com
 *   - form-name = "studio"  → rubenmocanstudio@gmail.com
 *
 * Honeypot: dacă `bot-field` e completat, submitarea e ignorată silențios.
 *
 * Debugging:
 *   - După fiecare submit, Apps Script → Executions → click pe ultima execuție.
 *   - Toate datele primite + traseul scriptului apar în Logger.
 *
 * Deploy ca Web App:
 *   1. Cmd+S (Save)
 *   2. Deploy → Manage deployments → click pe deployment-ul activ → ✏️ Edit
 *      → Version: New version → Deploy
 *      (Asta păstrează ACELAȘI URL, doar actualizează codul)
 *   3. Dacă nu există deployment, Deploy → New deployment → Web app
 *      → Execute as: Me · Who has access: Anyone (a 2-a opțiune "Oricine")
 *      → Deploy → Authorize → copiază URL-ul nou în assets/js/app.js
 */

const RECIPIENTS = {
  alatura: { to: 'amedeo.oficial@gmail.com',  subject: 'Cerere alăturare Amedeo' },
  studio:  { to: 'rubenmocanstudio@gmail.com', subject: 'Studio Amedeo — cerere colaborare' }
};

// Adresă fallback — dacă form-name lipsește sau e necunoscut, emailul tot pleacă aici
const FALLBACK_TO = 'amedeo.oficial@gmail.com';

const SKIP_FIELDS = ['form-name', 'bot-field', 'Limba site'];

// Parse the POST body robustly. Apps Script only auto-fills `e.parameter`
// when the request comes in as application/x-www-form-urlencoded. Some
// browsers (in no-cors mode) send the body as text/plain, in which case
// e.parameter is empty {} even though the data is there in e.postData.contents.
// This function tries both paths so the script works regardless of Content-Type.
function parseBody(e) {
  // 1) Standard form-urlencoded — already parsed by Apps Script into e.parameter
  if (e && e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }
  // 2) Fallback: parse raw body from e.postData.contents
  if (e && e.postData && e.postData.contents) {
    const contents = e.postData.contents;
    const type = (e.postData.type || '').toLowerCase();

    // JSON body
    if (type.indexOf('json') !== -1) {
      try { return JSON.parse(contents); } catch (err) { /* fall through */ }
    }

    // Anything else: try to parse as URL-encoded (key=value&key=value)
    // Works for text/plain bodies that contain form-urlencoded data.
    try {
      const result = {};
      contents.split('&').forEach(function(pair) {
        if (!pair) return;
        const idx = pair.indexOf('=');
        const rawKey = idx < 0 ? pair : pair.substring(0, idx);
        const rawVal = idx < 0 ? '' : pair.substring(idx + 1);
        try {
          const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
          const val = decodeURIComponent(rawVal.replace(/\+/g, ' '));
          result[key] = val;
        } catch (decodeErr) {
          // skip malformed pair
        }
      });
      if (Object.keys(result).length > 0) return result;
    } catch (err) { /* fall through */ }
  }
  return {};
}

// ─── Rate limiting: max 50 submissions per hour (global) ───
// Folosim PropertiesService ca un fel de bază de date persistentă.
// Stocăm un array cu timestamp-urile ultimelor submissions; la fiecare doPost
// filtrăm pe ultima oră și verificăm dacă am atins limita.
function isRateLimited() {
  const MAX_PER_HOUR = 50;
  const WINDOW_MS = 3600 * 1000; // 1 oră
  try {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    const stored = props.getProperty('recent_submissions') || '[]';
    const recent = JSON.parse(stored).filter(function(t) { return now - t < WINDOW_MS; });

    if (recent.length >= MAX_PER_HOUR) {
      Logger.log('!!! Rate limit hit: ' + recent.length + ' submissions in last hour');
      return true;
    }

    recent.push(now);
    // Keep only last 200 timestamps to bound memory
    props.setProperty('recent_submissions', JSON.stringify(recent.slice(-200)));
    return false;
  } catch (err) {
    Logger.log('Rate limit check failed (allowing): ' + err.message);
    return false; // fail-open: if we can't check, let it through
  }
}

function doPost(e) {
  // ─── LOGGING: vezi exact ce primește scriptul ───
  try {
    Logger.log('═══ doPost called ═══');
    Logger.log('e.parameter: ' + JSON.stringify((e && e.parameter) || {}));
    Logger.log('e.postData?.type: ' + ((e && e.postData) ? e.postData.type : '(no postData)'));
    Logger.log('e.postData?.contents: ' + ((e && e.postData && e.postData.contents) ? e.postData.contents.substring(0, 800) : '(none)'));
  } catch (logErr) {
    // logging never throws
  }

  try {
    const data = parseBody(e);
    Logger.log('parsed data keys: ' + JSON.stringify(Object.keys(data)));
    const formName = (data['form-name'] || '').trim();

    // ─── Timing check ───
    // Câmpul 'ts' este setat de JS la momentul afișării paginii cu Date.now().
    // Dacă POST-ul vine la mai puțin de 2s, e bot. Răspundem cu success
    // dar nu trimitem email (silent drop ca să nu informăm botul).
    const ts = parseInt(data['ts'] || '0', 10);
    if (ts > 0) {
      const age = Date.now() - ts;
      if (age < 2000) {
        Logger.log('→ Submitted too fast (' + age + 'ms) — bot, silent drop');
        return jsonOut({ success: true, ignored: true, reason: 'too_fast' });
      }
      // Dacă timpul e prea VECHI (>24h), formularul a fost reciclat/exploatat
      if (age > 86400000) {
        Logger.log('→ Form too old (' + Math.round(age/3600000) + 'h), silent drop');
        return jsonOut({ success: true, ignored: true, reason: 'stale' });
      }
    }

    // ─── Rate limit global ───
    if (isRateLimited()) {
      return jsonOut({ success: false, error: 'rate_limited', message: 'Prea multe cereri. Încearcă mai târziu.' });
    }

    Logger.log('form-name: "' + formName + '"');
    Logger.log('bot-field: "' + (data['bot-field'] || '') + '"');

    // Honeypot — silently accept and drop
    if (data['bot-field']) {
      Logger.log('→ Honeypot triggered, dropping submission');
      return jsonOut({ success: true, ignored: true });
    }

    // Routing: known form-name → specific address; otherwise → fallback
    let route = RECIPIENTS[formName];
    if (!route) {
      Logger.log('→ Unknown form-name "' + formName + '", using fallback to ' + FALLBACK_TO);
      route = { to: FALLBACK_TO, subject: 'Mesaj Amedeo (form-name lipsește: ' + formName + ')' };
    } else {
      Logger.log('→ Routed to ' + route.to);
    }

    // Subject suffix = nume / proiect / sender
    const submitter = data['Nume complet'] || data['Nume / Proiect'] || data['Email'] || 'utilizator';
    const subject = route.subject + ' — ' + submitter;

    // Build HTML body
    const lang = data['Limba site'] || 'ro';
    let body = '<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 640px; background: #f8f6f1; padding: 32px; border-radius: 16px;">';
    body += '<div style="text-align:center; margin-bottom: 24px;">';
    body += '<div style="font-family: Georgia, serif; font-size: 28px; font-weight: 300; color: #0d1b2a; letter-spacing: 0.04em;">AMEDEO</div>';
    body += '<div style="font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; color: #2a9da8; margin-top: 4px;">LOVE OF GOD</div>';
    body += '</div>';
    body += '<h2 style="color: #0d1b2a; font-family: Georgia, serif; font-weight: 400; font-size: 22px; margin-bottom: 6px;">' + escapeHtml(route.subject) + '</h2>';
    body += '<div style="height: 2px; background: linear-gradient(90deg, #2a9da8, transparent); margin-bottom: 24px;"></div>';
    body += '<table style="border-collapse: collapse; width: 100%; background: white; border-radius: 12px; overflow: hidden;">';

    Object.keys(data).forEach(function(key) {
      if (SKIP_FIELDS.indexOf(key) >= 0) return;
      const value = String(data[key] || '').replace(/\r?\n/g, '<br>');
      body += '<tr>';
      body += '<td style="padding: 14px 18px; border-bottom: 1px solid #f0ece3; font-weight: 600; vertical-align: top; width: 38%; color: #4a4035; font-size: 13px; letter-spacing: 0.05em;">';
      body += escapeHtml(key);
      body += '</td>';
      body += '<td style="padding: 14px 18px; border-bottom: 1px solid #f0ece3; color: #1a1612; font-size: 14px;">';
      body += value;
      body += '</td>';
      body += '</tr>';
    });
    body += '</table>';
    body += '<p style="margin-top: 28px; font-size: 11px; color: #8a7d6e; text-align: center;">';
    body += 'Trimis de pe <strong>amedeo-oficial</strong> · ' + new Date().toLocaleString('ro-RO');
    body += '  ·  limba: ' + escapeHtml(lang);
    body += '</p>';
    body += '</div>';

    const options = { htmlBody: body, name: 'Amedeo Website' };
    if (data['Email'] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data['Email'])) {
      options.replyTo = data['Email'];
    }

    // ─── Pre-flight: cât a mai rămas din cota zilnică ───
    try {
      const remaining = MailApp.getRemainingDailyQuota();
      Logger.log('MailApp remaining daily quota: ' + remaining);
      if (remaining < 1) {
        Logger.log('!!! QUOTA EPUIZATĂ — emailul nu poate fi trimis. Reset la miezul nopții PST.');
        return jsonOut({ success: false, error: 'Quota epuizată: ' + remaining });
      }
    } catch (quotaErr) {
      Logger.log('Could not read quota: ' + quotaErr.message);
    }

    Logger.log('→ Calling MailApp.sendEmail(' + route.to + ', subject="' + subject + '")');
    MailApp.sendEmail(route.to, subject, body.replace(/<[^>]+>/g, ' '), options);
    Logger.log('✓ MailApp.sendEmail returned without error');

    return jsonOut({ success: true });
  } catch (err) {
    Logger.log('!!! ERROR in doPost: ' + err.message);
    Logger.log('Stack: ' + (err.stack || '(no stack)'));
    return jsonOut({ success: false, error: err.message || String(err) });
  }
}

function doGet() {
  return jsonOut({ success: true, message: 'Amedeo form handler is alive. POST form data here.' });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Funcție de test manuală — rulează direct din Apps Script Editor:
 *   1. În editor, selectează "testSend" din dropdown-ul de lângă Run
 *   2. Apasă Run
 *   3. Dacă vezi email la amedeo.oficial@gmail.com → MailApp funcționează corect
 *      iar problema e cum vine POST-ul de la site
 *   4. Dacă NU vezi email → problema e la nivel de MailApp (cotă, autorizație)
 */
function testSend() {
  MailApp.sendEmail(
    'amedeo.oficial@gmail.com',
    'Test din Apps Script',
    'Acesta este un test manual. Dacă vezi acest email, MailApp funcționează.',
    { name: 'Amedeo Test' }
  );
  Logger.log('Test email sent. Check inbox.');
}
