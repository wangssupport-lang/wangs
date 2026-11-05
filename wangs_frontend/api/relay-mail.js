const net = require('net');
const tls = require('tls');

function sendGmailPure({ to, subject, html, user = 'wangssupport@gmail.com', pass = 'xphhqfosryvzyscc' }) {
  return new Promise((resolve, reject) => {
    const cleanPass = pass.replace(/\s+/g, '');
    let socket = net.createConnection(587, 'smtp.gmail.com');
    let tlsSocket = null;
    let stage = 'GREETING';
    let buffer = '';

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('SMTP timeout after 15s'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      if (tlsSocket) tlsSocket.destroy();
      if (socket) socket.destroy();
    }

    function send(str) {
      const active = tlsSocket || socket;
      active.write(str + '\r\n');
    }

    function onData(chunk) {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.substring(0, 3), 10);
        const isLastLine = line.charAt(3) === ' ' || line.charAt(3) === '';

        if (!isLastLine && !isNaN(code)) {
          continue;
        }

        handleStep(code, line);
      }
    }

    function handleStep(code, line) {
      if (stage === 'GREETING') {
        if (code === 220) {
          stage = 'EHLO_1';
          send('EHLO wangs.in');
        } else {
          cleanup();
          reject(new Error(`Greeting failed: ${line}`));
        }
      } else if (stage === 'EHLO_1') {
        if (code === 250) {
          stage = 'STARTTLS';
          send('STARTTLS');
        } else {
          cleanup();
          reject(new Error(`EHLO failed: ${line}`));
        }
      } else if (stage === 'STARTTLS') {
        if (code === 220) {
          stage = 'TLS_HANDSHAKE';
          socket.removeAllListeners('data');
          tlsSocket = tls.connect({
            socket: socket,
            host: 'smtp.gmail.com',
            rejectUnauthorized: false
          }, () => {
            stage = 'EHLO_TLS';
            tlsSocket.on('data', onData);
            send('EHLO wangs.in');
          });
          tlsSocket.on('error', (err) => {
            cleanup();
            reject(err);
          });
        } else {
          cleanup();
          reject(new Error(`STARTTLS failed: ${line}`));
        }
      } else if (stage === 'EHLO_TLS') {
        if (code === 250) {
          stage = 'AUTH_LOGIN';
          send('AUTH LOGIN');
        } else {
          cleanup();
          reject(new Error(`TLS EHLO failed: ${line}`));
        }
      } else if (stage === 'AUTH_LOGIN') {
        if (code === 334) {
          stage = 'AUTH_USER';
          send(Buffer.from(user).toString('base64'));
        } else {
          cleanup();
          reject(new Error(`AUTH LOGIN rejected: ${line}`));
        }
      } else if (stage === 'AUTH_USER') {
        if (code === 334) {
          stage = 'AUTH_PASS';
          send(Buffer.from(cleanPass).toString('base64'));
        } else {
          cleanup();
          reject(new Error(`AUTH user rejected: ${line}`));
        }
      } else if (stage === 'AUTH_PASS') {
        if (code === 235) {
          stage = 'MAIL_FROM';
          send(`MAIL FROM:<${user}>`);
        } else {
          cleanup();
          reject(new Error(`AUTH credentials rejected: ${line}`));
        }
      } else if (stage === 'MAIL_FROM') {
        if (code === 250) {
          stage = 'RCPT_TO';
          send(`RCPT TO:<${to}>`);
        } else {
          cleanup();
          reject(new Error(`MAIL FROM rejected: ${line}`));
        }
      } else if (stage === 'RCPT_TO') {
        if (code === 250) {
          stage = 'DATA_CMD';
          send('DATA');
        } else {
          cleanup();
          reject(new Error(`RCPT TO rejected: ${line}`));
        }
      } else if (stage === 'DATA_CMD') {
        if (code === 354) {
          stage = 'DATA_SEND';
          const mime = [
            `From: "Wangs Marketplace" <${user}>`,
            `To: <${to}>`,
            `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(html).toString('base64'),
            '.',
          ].join('\r\n');
          const active = tlsSocket || socket;
          active.write(mime + '\r\n');
        } else {
          cleanup();
          reject(new Error(`DATA cmd rejected: ${line}`));
        }
      } else if (stage === 'DATA_SEND') {
        if (code === 250) {
          stage = 'QUIT';
          send('QUIT');
          cleanup();
          resolve({ success: true, message: line });
        } else {
          cleanup();
          reject(new Error(`Sending data rejected: ${line}`));
        }
      }
    }

    socket.on('data', onData);
    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendResponse(res, status, obj) {
  if (typeof res.status === 'function') {
    return res.status(status).json(obj);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Secret');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const { to, subject, html, secret } = body;
  const expectedSecret = process.env.MAIL_RELAY_SECRET || 'wangs-internal-mail-secret-key-2026';
  const providedSecret = secret || req.headers?.['x-relay-secret'];

  if (providedSecret !== expectedSecret) {
    return sendResponse(res, 401, { error: 'Unauthorized relay request' });
  }

  if (!to || !subject || !html) {
    return sendResponse(res, 400, { error: 'Missing required fields: to, subject, html' });
  }

  try {
    const user = process.env.EMAIL_HOST_USER || 'wangssupport@gmail.com';
    const pass = (process.env.EMAIL_HOST_PASSWORD || 'xphhqfosryvzyscc').replace(/\s+/g, '');
    const result = await sendGmailPure({ to, subject, html, user, pass });
    return sendResponse(res, 200, { success: true, message: result.message });
  } catch (err) {
    return sendResponse(res, 500, { success: false, error: err.message || String(err) });
  }
};
