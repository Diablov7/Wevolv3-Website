const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  console.log('[sendTelegram] Function called', {
    method: event.httpMethod,
    hasBody: !!event.body,
    path: event.path
  });

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const { name, email, telegram, message, text, chat_id, phone, projectType, additionalMessage, firstTouch } = payload;

    console.log('[sendTelegram] Payload received', {
      hasName: !!name,
      hasEmail: !!email,
      hasProjectType: !!projectType
    });

    // Credenciais vêm SÓ das env vars. Não existe fallback hardcoded, de propósito:
    // até 23/08/2026 havia um, e ele custou 52 dias de leads perdidos em silêncio. Com o
    // fallback, a função sempre "tinha" credencial, passava por toda a lógica e só falhava
    // na chamada ao Telegram, com um 401 que ninguém via. Sem ele, credencial faltando é
    // erro de configuração explícito (ver o guard logo abaixo) e aparece no primeiro envio.
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // Suporta múltiplos chat_ids separados por vírgula, ponto e vírgula, ou quebra de linha
    // Também suporta variável alternativa TELEGRAM_CHAT_ID_GROUP para grupos
    // Exemplo: "426197451,-1001234567890" ou "426197451;-1001234567890" ou "426197451\n-1001234567890"
    const chatIdsRaw = process.env.TELEGRAM_CHAT_ID || '';
    const groupChatIdRaw = process.env.TELEGRAM_CHAT_ID_GROUP || '';
    
    // Log do valor bruto (sem expor completamente por segurança)
    console.log('[sendTelegram] Raw TELEGRAM_CHAT_ID', { 
      length: chatIdsRaw.length, 
      firstChars: chatIdsRaw.substring(0, 20),
      containsComma: chatIdsRaw.includes(','),
      containsSemicolon: chatIdsRaw.includes(';'),
      containsNewline: chatIdsRaw.includes('\n')
    });
    
    if (groupChatIdRaw) {
      console.log('[sendTelegram] TELEGRAM_CHAT_ID_GROUP found', { 
        length: groupChatIdRaw.length,
        firstChars: groupChatIdRaw.substring(0, 20)
      });
    }
    
    // Suporta vírgula, ponto e vírgula, ou quebra de linha como separador
    let chatIds = chatIdsRaw
      .split(/[,;\n]/) // Split por vírgula, ponto e vírgula, ou quebra de linha
      .map(id => id.trim()) // Remove espaços
      .filter(id => id.length > 0); // Remove vazios
    
    // Se TELEGRAM_CHAT_ID_GROUP estiver definido, adicionar ao array
    if (groupChatIdRaw) {
      const groupIds = groupChatIdRaw
        .split(/[,;\n]/)
        .map(id => id.trim())
        .filter(id => id.length > 0);
      chatIds = [...chatIds, ...groupIds];
    }

    console.log('[sendTelegram] Using credentials', {
      hasToken: !!token,
      chatIdsCount: chatIds.length,
      chatIds: chatIds // Log dos IDs parseados para debug
    });

    // Guard de configuração: falha alto e com mensagem legível em vez de tentar enviar com
    // credencial que não existe. Sem isso, a ausência de env var vira um 401 genérico do
    // Telegram, indistinguível de um token revogado.
    const missing = [];
    if (!token) missing.push('TELEGRAM_BOT_TOKEN');
    if (chatIds.length === 0 && !chat_id) missing.push('TELEGRAM_CHAT_ID');
    if (missing.length > 0) {
      console.error('[sendTelegram] MISCONFIGURED: missing env vars', missing);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Server misconfigured: missing Telegram credentials',
          missing,
          hint: 'Set these environment variables in the Netlify project settings and redeploy.',
        }),
      };
    }

    // Telegram HTML parse_mode only requires escaping &, < and > in user-supplied
    // text. This is far more robust than legacy Markdown, which breaks the whole
    // message if a user types an unescaped _, *, [, ], `, etc. (this was the root
    // cause of contact form submissions silently failing).
    const escapeHtml = (str) =>
      String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Suporta três formatos:
    // 1) { text, chat_id? } (proxy direto do front/bundle)
    // 2) { name, email, telegram, message } (formulário antigo)
    // 3) { name, email, telegram, projectType, additionalMessage } (formulário novo)
    const finalText = typeof text === "string" && text.trim().length > 0
      ? escapeHtml(text)
      : (() => {
          // Novo formato com campos de auditoria
          if (projectType) {
            const lines = [
              "🚀 <b>NEW CONTACT FORM SUBMISSION</b>",
              "",
              "👤 <b>CONTACT INFO</b>",
              `<b>Name:</b> ${escapeHtml(name) || "N/A"}`,
              `<b>Email:</b> ${escapeHtml(email) || "N/A"}`,
              ...(phone ? [`<b>Phone:</b> ${escapeHtml(phone)}`] : []),
              ...(telegram ? [`<b>Telegram:</b> ${escapeHtml(telegram)}`] : []),
              "",
              "📊 <b>PROJECT DETAILS</b>",
              `<b>Type:</b> ${escapeHtml(projectType) || "N/A"}`,
              "",
            ];

            if (additionalMessage) {
              lines.push("📝 <b>ADDITIONAL DETAILS</b>", escapeHtml(additionalMessage), "");
            }

            // Traffic source (first-touch attribution) — so sales sees where the
            // lead actually came from instead of guessing "direct".
            if (firstTouch && typeof firstTouch === "object") {
              const src = firstTouch.ft_source || firstTouch.ft_referrer || "direct / unknown";
              const srcLines = [
                "🎯 <b>TRAFFIC SOURCE</b>",
                `<b>Source:</b> ${escapeHtml(src)}`,
                ...(firstTouch.ft_medium ? [`<b>Medium:</b> ${escapeHtml(firstTouch.ft_medium)}`] : []),
                ...(firstTouch.ft_campaign ? [`<b>Campaign:</b> ${escapeHtml(firstTouch.ft_campaign)}`] : []),
                ...(firstTouch.ft_landing ? [`<b>Landing:</b> ${escapeHtml(firstTouch.ft_landing)}`] : []),
                "",
              ];
              lines.push(...srcLines);
            }

            lines.push("─".repeat(30), `Sent from: wevolv3.com/contact.html`);

            return lines.join("\n");
          }

          // Formato antigo (fallback)
          return [
            "🚀 <b>New message from Wevolv3!</b>",
            "",
            `<b>Name:</b> ${escapeHtml(name) || "N/A"}`,
            `<b>Email:</b> ${escapeHtml(email) || "N/A"}`,
            ...(phone ? [`<b>Phone:</b> ${escapeHtml(phone)}`] : []),
            ...(telegram ? [`<b>Telegram:</b> ${escapeHtml(telegram)}`] : []),
            "",
            `<b>Message:</b>`,
            escapeHtml(message) || "",
          ].join("\n");
        })();

    console.log('[sendTelegram] Sending to Telegram API');
    
    // Determinar quais chat_ids usar (prioridade: chat_id do payload, depois env vars)
    const targetChatIds = chat_id ? [chat_id] : chatIds;
    
    // Enviar para todos os chat_ids especificados
    const sendPromises = targetChatIds.map(async (targetChatId) => {
      try {
        // Converter para string e garantir que é um número válido
        const chatIdStr = String(targetChatId).trim();
        const chatIdNum = chatIdStr.includes('-') ? chatIdStr : chatIdStr; // Manter como string para IDs negativos
        
        console.log('[sendTelegram] Attempting to send', { 
          chatId: chatIdNum, 
          type: typeof chatIdNum,
          length: chatIdNum.length
        });

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            chat_id: chatIdNum, // Usar como string para suportar IDs negativos
            text: finalText,
            parse_mode: "HTML" // HTML e mais robusto que Markdown: nao quebra com _ * [ ] ` digitados pelo usuario
          }),
        });

        const responseData = await tgRes.json();
        
        console.log('[sendTelegram] Telegram API response', { 
          chatId: chatIdNum, 
          status: tgRes.status, 
          ok: tgRes.ok,
          response: responseData
        });

        if (!tgRes.ok) {
          console.error('[sendTelegram] Telegram API error for chat', chatIdNum, responseData);
          return { chatId: chatIdNum, success: false, error: JSON.stringify(responseData) };
        }

        console.log('[sendTelegram] Successfully sent to chat', chatIdNum);
        return { chatId: chatIdNum, success: true };
      } catch (err) {
        console.error('[sendTelegram] Error sending to chat', targetChatId, err);
        return { chatId: targetChatId, success: false, error: String(err) };
      }
    });

    // Aguardar todos os envios
    const results = await Promise.all(sendPromises);
    
    // Verificar se pelo menos um envio foi bem-sucedido
    const successCount = results.filter(r => r.success).length;
    const failedResults = results.filter(r => !r.success);

    if (successCount === 0) {
      // Nenhum envio foi bem-sucedido
      console.error('[sendTelegram] All sends failed', failedResults);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Telegram API error - all sends failed", 
          details: failedResults 
        }),
      };
    }

    // Pelo menos um envio foi bem-sucedido
    if (failedResults.length > 0) {
      console.warn('[sendTelegram] Some sends failed', failedResults);
    }

    console.log('[sendTelegram] Success!', { 
      total: results.length, 
      successful: successCount, 
      failed: failedResults.length 
    });
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: true, 
        sentTo: successCount,
        total: results.length,
        failed: failedResults.length > 0 ? failedResults : undefined
      }),
    };
  } catch (err) {
    console.error('[sendTelegram] Unexpected error', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Unexpected error", details: String(err), message: err.message, stack: err.stack }),
    };
  }
};

