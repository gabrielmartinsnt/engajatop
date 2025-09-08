(function($){
  function ensureExpressSection(modal){
    if ($(modal).find('#upgram-express-checkout').length) return;
    const expressHtml = `
      <div id="upgram-express-checkout" class="upgram-express">
        <div class="express-title">Finalização Rápida</div>
        <div class="express-subtitle">Apple Pay, Google Pay, Amazon Pay...</div>
        <div class="express-providers">
          <div id="express-stripe" class="express-slot"></div>
          <div id="express-paypal" class="express-slot"></div>
        </div>
        <div class="express-divider"><span>ou</span></div>
        <div class="standard-checkout-section">
          <div class="standard-title">Outros Meios de Pagamentos</div>
          <div class="standard-subtitle">(Pix / Cartão de Crédito)</div>
          <button type="button" class="btn btn-primary standard-checkout-btn">Prosseguir com finalização</button>
        </div>
      </div>`;
    const body = $(modal).find('.modal-body')[0] || modal;
    $(body).prepend(expressHtml);
    
    $(modal).find('.standard-checkout-btn').on('click', function(){
      $(modal).find('#upgram-express-checkout').hide();
      const existingBtn = $(modal).find('button:contains("Realizar pagamento")');
      if (existingBtn.length) {
        existingBtn[0].scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  
  function getPaymentModal(root){
    return $(root).find('#paymentModal')[0] || $(root).find('.modal.show')[0] || root;
  }
  
  function onPaymentModalReady(root){
    const modal = getPaymentModal(root);
    if (!modal) return;
    ensureExpressSection(modal);
    mountProviders(modal);
  }
  
  function mountProviders(modal){
    console.log('Express checkout UI mounted - providers to be implemented');
  }
  
  function watchModal(){
    const el = document.getElementById('modal-container');
    if (!el) return;
    onPaymentModalReady(el);
    const mo = new MutationObserver(() => onPaymentModalReady(el));
    mo.observe(el, { childList: true, subtree: true });
  }
  
  $(watchModal);
  window.upgramInitExpressInModal = onPaymentModalReady;

})(jQuery);
