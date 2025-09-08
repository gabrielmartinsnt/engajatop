(function($){
  function ensureExpressSection(modal){
    try {
      if ($(modal).find('#upgram-express-checkout').length) return;
      const expressHtml = `
        <div id="upgram-express-checkout" class="upgram-express">
          <div class="express-title">Finalização Rápida</div>
          <div class="express-subtitle">Apple Pay, Google Pay, Amazon Pay...</div>
          <div class="express-divider"><span>ou</span></div>
          <div class="standard-checkout-section">
            <div class="standard-title">Outros Meios de Pagamentos</div>
            <div class="standard-subtitle">(Pix / Cartão de Crédito)</div>
            <button type="button" class="btn btn-primary standard-checkout-btn">Prosseguir com finalização</button>
            <div class="standard-note">Você também pode finalizar pelo checkout padrão com Pix / Cartão — funciona normalmente.</div>
          </div>
        </div>`;
      const body = $(modal).find('.modal-body')[0] || modal;
      $(body).prepend(expressHtml);
      
      $(modal).find('.standard-checkout-btn').on('click', function(){
        try {
          $(modal).find('#upgram-express-checkout').hide();
          const existingBtn = $(modal).find('button:contains("Realizar pagamento")');
          if (existingBtn.length) {
            existingBtn[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            existingBtn.trigger('focus');
          } else {
            const pm = $(modal).find('#upgram-payment-method');
            if (pm.length) pm[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch(e){ console.warn('standard-checkout-btn error', e); }
      });
    } catch(e){ console.warn('ensureExpressSection error', e); }
  }
  
  function hideUnavailableMethods(modal){
    try {
      const scope = $(modal).find('#upgram-payment-method')[0] || modal;
      const keywords = [/apple\s*pay/i, /google\s*pay/i, /amazon\s*pay/i];

      $(scope).find('input[type="radio"]').each(function(){
        const $input = $(this);
        const id = $input.attr('id');
        const $label = id ? $(scope).find(`label[for="${id}"]`) : $input.closest('label');
        const text = ($label.text() || '').trim();
        if (keywords.some(rx => rx.test(text))) {
          const $wrap = $input.closest('.form-check, .payment-method, li');
          if ($wrap.length) {
            $wrap.css('display','none');
          } else {
            $input.css('display','none');
          }
          if ($input.is(':checked')) $input.prop('checked', false);
        }
      });
    } catch (e) { console.warn('hideUnavailableMethods error', e); }
  }
  
  function getPaymentModal(root){
    return $(root).find('#paymentModal')[0] || $(root).find('.modal.show')[0] || root;
  }
  
  function onPaymentModalReady(root){
    try {
      const modal = getPaymentModal(root);
      if (!modal) return;
      
      if ($(modal).find('#paymentModal').length || $(modal).attr('id') === 'paymentModal') {
        ensureExpressSection(modal);
        requestAnimationFrame(() => hideUnavailableMethods(modal));
      }
    } catch(e){ console.warn('express onPaymentModalReady error', e); }
  }
  
  function watchModal(){
    try {
      const el = document.getElementById('modal-container');
      if (!el) return;

      onPaymentModalReady(el);

      const mo = new MutationObserver((mutations) => {
        let shouldProcess = false;
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1 && (node.id === 'paymentModal' || (node.querySelector && node.querySelector('#paymentModal')))) {
                shouldProcess = true;
                break;
              }
            }
          }
          if (shouldProcess) break;
        }
        if (shouldProcess) {
          requestAnimationFrame(() => {
            onPaymentModalReady(el);
            mo.disconnect();
          });
        }
      });
      mo.observe(el, { childList: true, subtree: true });
    } catch(e){ console.warn('watchModal error', e); }
  }
  
  $(watchModal);
  window.upgramInitExpressInModal = onPaymentModalReady;

})(jQuery);
