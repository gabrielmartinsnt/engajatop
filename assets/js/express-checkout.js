(function($){
  function ensureExpressSection(modal){
    if ($(modal).find('#upgram-express-checkout').length) return;
    const expressHtml = `
      <div id="upgram-express-checkout" class="upgram-express">
        <div class="express-title">Pague rapidamente</div>
        <div class="express-providers">
          <div id="express-stripe" class="express-slot"></div>
          <div id="express-paypal" class="express-slot"></div>
        </div>
        <div class="express-divider"><span>ou</span></div>
      </div>`;
    const body = $(modal).find('.modal-body')[0] || modal;
    $(body).prepend(expressHtml);
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
    try { mountStripePaymentRequest(modal); } catch(e){ console.warn('Stripe PRB mount failed', e); }
    try { mountPayPalButtons(modal); } catch(e){ console.warn('PayPal mount failed', e); }
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

  function mountStripePaymentRequest(modal){
    const pubKey = window?.wc_stripe_params?.key || window?.wcpaySettings?.publishableKey;
    if (!pubKey || typeof window.Stripe !== 'function') return;
    
    const totalText = (document.getElementById('totalValue')?.innerText || '').replace(/[^\d,.-]/g,'').replace('.', '').replace(',', '.');
    const amount = Math.round((parseFloat(totalText || '0') || 0) * 100);
    if (!amount) return;
    
    const stripe = window.Stripe(pubKey);
    const pr = stripe.paymentRequest({
      country: 'BR',
      currency: 'brl',
      total: { label: 'Total', amount },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    });
    
    pr.canMakePayment().then(function(result){
      if (!result) return;
      const elements = stripe.elements();
      const prButton = elements.create('paymentRequestButton', {
        paymentRequest: pr,
        style: { paymentRequestButton: { theme: 'dark', height: '44px' } }
      });
      const target = document.getElementById('express-stripe');
      if (!target) return;
      prButton.mount(target);
    });
    
    pr.on('paymentmethod', async function(ev){
      try {
        const productId = jQuery('#productId').val();
        const variationId = jQuery('#variationId').val();
        const email = jQuery('.upgram-input input[name="email"]').val();
        const phone = jQuery('.upgram-input input[name="phone"]').val();
        const cpf = jQuery('#upgram-cpf input').val();
        
        const form = new FormData();
        form.append('action', 'upgram_express_stripe');
        form.append('security', ajax_object.security);
        form.append('payment_method_id', ev.paymentMethod.id);
        if (productId) form.append('product_id', productId);
        if (variationId) form.append('variation_id', variationId);
        if (email) form.append('email', email);
        if (phone) form.append('phone', phone);
        if (cpf) form.append('cpf', cpf);
        
        const resp = await fetch(ajax_object.ajax_url, { method:'POST', body: form });
        const json = await resp.json();
        
        if (!json.success) {
          ev.complete('fail');
          if (window.displayErrorToast) displayErrorToast(json.data?.message || 'Falha no pagamento.');
          return;
        }
        
        if (json.data.client_secret) {
          const { error } = await stripe.confirmCardPayment(json.data.client_secret, { payment_method: ev.paymentMethod.id }, { handleActions: true });
          if (error) {
            ev.complete('fail');
            if (window.displayErrorToast) displayErrorToast(error.message || 'Erro ao confirmar pagamento.');
            return;
          }
        }
        
        ev.complete('success');
        if (json.data.redirect_url) { window.location.href = json.data.redirect_url; }
        else if (json.data.html) { jQuery("#modal-container").html(json.data.html).modal("show"); }
      } catch (e) {
        ev.complete('fail');
        if (window.displayErrorToast) displayErrorToast('Erro ao processar pagamento.');
        console.error(e);
      }
    });
  }

  function mountPayPalButtons(modal){
    if (!window.paypal || typeof window.paypal.Buttons !== 'function') return;
    const target = document.getElementById('express-paypal');
    if (!target) return;
    
    const buttons = window.paypal.Buttons({
      createOrder: function(data, actions){
        return fetch(ajax_object.ajax_url, {
          method: 'POST',
          headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
          body: new URLSearchParams({
            action: 'upgram_express_paypal_create',
            security: ajax_object.security,
            product_id: jQuery('#productId').val() || '',
            variation_id: jQuery('#variationId').val() || '',
            email: jQuery('.upgram-input input[name="email"]').val() || '',
            phone: jQuery('.upgram-input input[name="phone"]').val() || '',
          })
        }).then(r => r.json()).then(json => {
          if (!json.success) throw new Error(json.data?.message || 'Falha ao criar pedido');
          return json.data.order_id;
        });
      },
      onApprove: function(data, actions){
        return fetch(ajax_object.ajax_url, {
          method: 'POST',
          headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
          body: new URLSearchParams({
            action: 'upgram_express_paypal_capture',
            security: ajax_object.security,
            order_id: data.orderID
          })
        }).then(r => r.json()).then(json => {
          if (!json.success) throw new Error(json.data?.message || 'Falha ao capturar pagamento');
          if (json.data.redirect_url) window.location.href = json.data.redirect_url;
          else if (json.data.html) jQuery("#modal-container").html(json.data.html).modal("show");
        }).catch(e => {
          if (window.displayErrorToast) displayErrorToast(e.message || 'Erro PayPal');
        });
      }
    });
    buttons.render(target);
  }
})(jQuery);
