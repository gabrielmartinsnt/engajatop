(function($){
  function simplifyPaymentModal(modal){
    try {
      $(modal).find('#upgram-payment-method').remove();
      
      $(modal).find('button').each(function(){
        const $btn = $(this);
        const text = $btn.text().trim();
        if (text.includes('Realizar pagamento') || text.includes('Finalizar pagamento')) {
          $btn.text('última etapa >');
          
          $btn.off('click').on('click', function(e){
            e.preventDefault();
            const checkoutUrl = window.wc_checkout_params?.checkout_url || '/checkout/';
            window.location.href = checkoutUrl;
          });
        }
      });
      
      $(modal).find('#upgram-cpf').remove();
      
      const noteHtml = '<div class="pre-checkout-note" style="text-align: center; color: #666; font-size: 14px; margin: 16px 0;">Esta é uma etapa de preparação. Clique em "última etapa >" para continuar.</div>';
      $(modal).find('.modal-body').append(noteHtml);
      
    } catch(e){ 
      console.warn('simplifyPaymentModal error', e); 
    }
  }
  
  function getPaymentModal(root){
    return $(root).find('#paymentModal')[0] || $(root).find('.modal.show')[0] || root;
  }
  
  function onPaymentModalReady(root){
    try {
      const modal = getPaymentModal(root);
      if (!modal) return;
      
      if ($(modal).find('#paymentModal').length || $(modal).attr('id') === 'paymentModal') {
        requestAnimationFrame(() => {
          simplifyPaymentModal(modal);
        });
      }
    } catch(e){ 
      console.warn('pre-checkout onPaymentModalReady error', e); 
    }
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
          });
        }
      });
      mo.observe(el, { childList: true, subtree: true });
    } catch(e){ 
      console.warn('pre-checkout watchModal error', e); 
    }
  }
  
  $(watchModal);
  window.upgramInitPreCheckoutModal = onPaymentModalReady;

})(jQuery);
