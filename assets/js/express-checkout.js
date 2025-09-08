(function($){
  function ensureExpressSection(modal){
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
      $(modal).find('#upgram-express-checkout').hide();
      const existingBtn = $(modal).find('button:contains("Realizar pagamento")');
      if (existingBtn.length) {
        existingBtn[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        existingBtn.focus({ preventScroll: true });
      }
    });
  }
  
  function hideUnavailableMethods(modal){
    const keywords = [/apple\s*pay/i, /google\s*pay/i, /amazon\s*pay/i];
    $(modal).find('input[type="radio"][name*="payment"], input[type="radio"][id*="payment"]').each(function(){
      const $input = $(this);
      const id = $input.attr('id');
      let $label = id ? $(modal).find(`label[for="${id}"]`) : $input.closest('label');
      const txt = ($label.text() || '').trim();
      if (keywords.some(rx => rx.test(txt))) {
        const $paymentOption = $input.closest('.payment-method, .form-check');
        if ($paymentOption.length && $paymentOption.find('input[type="radio"]').length === 1) {
          $paymentOption.hide(); // Hide instead of remove to avoid breaking references
        }
      }
    });
  }
  
  function getPaymentModal(root){
    return $(root).find('#paymentModal')[0] || $(root).find('.modal.show')[0] || root;
  }
  
  function onPaymentModalReady(root){
    const modal = getPaymentModal(root);
    if (!modal) return;
    
    if ($(modal).find('#paymentModal').length || $(modal).attr('id') === 'paymentModal') {
      ensureExpressSection(modal);
      setTimeout(() => hideUnavailableMethods(modal), 100);
    }
  }
  
  function watchModal(){
    const el = document.getElementById('modal-container');
    if (!el) return;
    
    onPaymentModalReady(el);
    
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const hasModal = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (
              node.id === 'paymentModal' || 
              node.querySelector && node.querySelector('#paymentModal')
            )
          );
          if (hasModal) {
            setTimeout(() => onPaymentModalReady(el), 50);
          }
        }
      });
    });
    mo.observe(el, { childList: true, subtree: true });
  }
  
  $(watchModal);
  window.upgramInitExpressInModal = onPaymentModalReady;

})(jQuery);
