    const messages = document.querySelector('#messages');
    const welcomeMarkup = document.querySelector('#welcome').outerHTML;
    const form = document.querySelector('#form');
    const input = document.querySelector('#message');
    const sendButton = document.querySelector('#send');
    const sessionLabel = document.querySelector('#session-id');
    let sessionId = null;
    let busy = false;

    async function request(path, options = {}) {
      const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join('; ') : data.detail;
        throw new Error(detail || `Erro HTTP ${response.status}`);
      }
      return data;
    }

    async function newSession() {
      busy = true;
      sendButton.disabled = true;
      sessionLabel.textContent = 'Criando sessão…';
      try {
        const data = await request('/api/sessions', { method: 'POST', body: JSON.stringify({ channel: document.querySelector('#channel').value }) });
        sessionId = data.session_id;
        sessionLabel.textContent = sessionId;
        messages.innerHTML = welcomeMarkup;
        document.querySelector('#profile').innerHTML = '<p class="empty">As informações extraídas aparecem aqui.</p>';
        document.querySelector('#benefits').innerHTML = '<p class="empty">Envie uma mensagem para iniciar a análise.</p>';
        wireSuggestions();
      } catch (error) {
        sessionLabel.textContent = 'Falha ao criar sessão';
        addBubble(`Não foi possível iniciar uma sessão. ${error.message}`, 'assistant error');
      } finally {
        busy = false;
        sendButton.disabled = false;
        input.focus();
      }
    }

    function addBubble(content, role) {
      document.querySelector('#welcome')?.remove();
      const bubble = document.createElement('div');
      bubble.className = `bubble ${role}`;
      bubble.textContent = content;
      messages.append(bubble);
      messages.scrollTop = messages.scrollHeight;
      return bubble;
    }

    const labels = { idade:'Idade', renda_individual:'Renda individual', renda_familiar:'Renda familiar', quantidade_pessoas_familia:'Pessoas na família', renda_per_capita:'Renda por pessoa', cadunico:'Cadastro Único', possui_deficiencia:'Pessoa com deficiência', situacao_profissional:'Situação profissional', possui_filhos:'Tem filhos', quantidade_filhos:'Quantidade de filhos', cidade:'Cidade', estado:'Estado' };
    const statusLabels = { COMPATIVEL:'Compatível', POSSIVEL:'Possível', INCOMPATIVEL:'Incompatível', INFORMACOES_INSUFICIENTES:'Dados insuficientes' };
    function formatValue(key, value) {
      if (value === null || value === undefined || value === '') return 'Não informado';
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      if (key.startsWith('renda_')) return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(value);
      return String(value);
    }

    function renderProfile(profile) {
      const container = document.querySelector('#profile');
      container.replaceChildren();
      Object.entries(labels).forEach(([key, label]) => {
        const row = document.createElement('div'); row.className = 'field';
        const name = document.createElement('span'); name.textContent = label;
        const value = document.createElement('span'); value.textContent = formatValue(key, profile[key]);
        row.append(name, value); container.append(row);
      });
    }

    function renderBenefits(analyses) {
      const container = document.querySelector('#benefits');
      container.replaceChildren();
      if (!analyses.length) { const p = document.createElement('p'); p.className='empty'; p.textContent='Nenhum benefício retornado.'; container.append(p); return; }
      analyses.forEach(item => {
        const card = document.createElement('article'); card.className='benefit';
        const top = document.createElement('div'); top.className='benefit-top';
        const name = document.createElement('span'); name.className='benefit-name'; name.textContent=item.beneficio + (item.ficticio ? ' · Exemplo' : '');
        const status = document.createElement('span'); status.className='status'; status.textContent=statusLabels[item.status] || item.status;
        if (item.status === 'COMPATIVEL') status.classList.add('compat');
        if (item.status === 'POSSIVEL' || item.status === 'INFORMACOES_INSUFICIENTES') status.classList.add('possible');
        if (item.status === 'INCOMPATIVEL') status.classList.add('incompat');
        top.append(name, status); card.append(top);
        const notes = [...(item.criterios_pendentes || []), ...(item.perguntas || [])].filter(Boolean);
        if (notes.length) { const detail=document.createElement('small'); detail.textContent=notes.join(' · '); card.append(detail); }
        container.append(card);
      });
    }

    async function submitMessage(text) {
      if (!text.trim() || busy) return;
      if (!sessionId) await newSession();
      if (!sessionId) return;
      addBubble(text.trim(), 'user');
      input.value = ''; resizeInput(); busy = true; sendButton.disabled = true;
      const pending = addBubble('Analisando…', 'assistant');
      try {
        const data = await request('/api/chat', { method:'POST', body:JSON.stringify({ session_id:sessionId, channel:document.querySelector('#channel').value, message:text.trim() }) });
        pending.textContent = data.message;
        renderProfile(data.profile);
        renderBenefits(data.analyses || data.possible_benefits || []);
      } catch (error) {
        pending.classList.add('error'); pending.textContent = `Não foi possível enviar a mensagem. ${error.message}`;
      } finally { busy = false; sendButton.disabled = false; input.focus(); }
    }

    function resizeInput() { input.style.height='auto'; input.style.height=`${Math.min(input.scrollHeight,140)}px`; }
    function wireSuggestions() { document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => submitMessage(button.textContent))); }
    form.addEventListener('submit', event => { event.preventDefault(); submitMessage(input.value); });
    input.addEventListener('input', resizeInput);
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
    document.querySelector('#new-chat').addEventListener('click', newSession);
    document.querySelector('#channel').addEventListener('change', newSession);
    wireSuggestions();
    newSession();
