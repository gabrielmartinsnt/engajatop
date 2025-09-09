const flowCache = new Map();

jQuery(document).ready(function ($) {
  $("body").append(
    '<div class="modal fade upgram-root" id="modal-container" tabindex="-1" aria-hidden="true"></div>'
  );
  $("body").append(
    `
    <div id="upgram-toast-container" class="position-fixed top-0 end-0 p-3" style="z-index: 999999; display: none;">
      <div id="errorToast" class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex align-items-center justify-content-between">
              <div class="toast-body"></div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
      </div>
      <div id="successToast" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex align-items-center justify-content-between">
              <div class="toast-body"></div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
      </div>
    </div>
    `
  );

  const currencyBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  
  function toNumber(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  
  function computePriceMeta(item) {
    const regular = toNumber(item?.regular_price ?? item?.regularPrice ?? item?.regular ?? item?.price);
    const sale = item?.sale_price ?? item?.salePrice;
    const hasSale = sale != null && toNumber(sale) > 0 && toNumber(sale) < regular;
    const current = hasSale ? toNumber(sale) : regular;
    const pct = hasSale && regular > 0 ? Math.round((1 - current / regular) * 100) : 0;
    return { regular, current, discountPct: pct };
  }
  
  function cleanName(name) {
    return String(name || '').replace(/\s*[-–—]+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }
  
  function sanitizeDashesIn(containerEl) {
    if (!containerEl) return;
    const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null, false);
    const dashSeq = /\s*[-–—]{2,}\s*/g;
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = node.nodeValue;
      let cleaned = original
        .replace(dashSeq, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/(\s)[-–—](?=\s)/g, "$1");
      if (cleaned !== original) node.nodeValue = cleaned.trim();
    }
  }
  
  function fixValorTotalSeparators(root) {
    try {
      const $root = jQuery(root || document);
      $root.find('*:contains("Valor total")').each(function(){
        const el = this;
        const prev = el.previousSibling;
        if (prev && prev.nodeType === 3) {
          prev.nodeValue = prev.nodeValue.replace(/\s*[-–—]\s*$/, ' ');
        }
        if (el.firstChild && el.firstChild.nodeType === 3) {
          el.firstChild.nodeValue = el.firstChild.nodeValue.replace(/^[-–—]\s*/, '');
        }
      });
    } catch(e){ console.warn('fixValorTotalSeparators error', e); }
  }

  function setupModalSanitizer() {
    const el = document.getElementById("modal-container");
    if (!el) return;
    sanitizeDashesIn(el);
    fixValorTotalSeparators(el);
    const observer = new MutationObserver(() => {
      sanitizeDashesIn(el);
      fixValorTotalSeparators(el);
      adjustPaymentModalUI(el);
    });
    observer.observe(el, { childList: true, subtree: true });
  }

  function adjustPaymentModalUI(root) {
    const $root = jQuery(root || document);
    const $modal = $root.find('#paymentModal').length ? $root.find('#paymentModal') : $root.find('.modal.show');
    if (!$modal.length || $modal.data('upgramAdjusted')) return;

    $modal.find('#upgram-payment-method, .wc_payment_methods, .payment_methods').hide();
    $modal.find('input[name="payment_method"]')
      .prop('checked', false)
      .off('.upgramCpf');
    $modal.find('input[name="payment_method"]').closest('.form-check, .payment-method, li, div, section').hide();

    $modal.find('#upgram-cpf').addClass('d-none').hide();

    setTimeout(() => { $modal.find('#upgram-cpf').addClass('d-none').hide(); }, 0);

    const selected = (window.flowCache?.get && flowCache.get('selectedPrice')) || window._upgramSelectedPrice;
    const el = $modal.find('#totalValue')[0];
    if (el) {
      if (window._upgramCoupon?.applied && typeof window._upgramCoupon.discountedTotal !== 'undefined') {
        el.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(window._upgramCoupon.discountedTotal);
      } else if (selected != null) {
        el.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selected);
      }
    }

    let $cta = $modal.find('button:contains("Realizar pagamento")').first();
    if (!$cta.length) $cta = $modal.find('button.btn, button').last();

    if ($cta.length) {
      $cta
        .attr('id', 'continue-button')
        .text('Última Etapa')
        .addClass('btn-continue btn-gradient')
        .css({ color: '#fff', fontWeight: '700' });
      $cta.off('click.upgramLastStep').on('click.upgramLastStep', function(e){
        try {
          e.preventDefault();
          e.stopImmediatePropagation();
          const email = jQuery('.upgram-input input[name="email"]').val() || '';
          const phone = jQuery('.upgram-input input[name="phone"]').val() || '';
          localStorage.setItem('upgram_contact', JSON.stringify({ email, phone, ts: Date.now() }));
          ensureCartThenCheckout('https://engajatop.com/finalizar-compra/');
        } catch(err){ 
          window.location.href = 'https://engajatop.com/finalizar-compra/'; 
        }
      });
    }

    $modal.data('upgramAdjusted', true);
  }
  
  function formatPackageDropdown() {
    jQuery('#seguidoresMenu .dropdown-item').each(function () {
      const $a = jQuery(this);
      const item = $a.data('item') || {};
      const { current, discountPct } = computePriceMeta(item);
      const name = cleanName(item.name);
      const priceHtml = `<span class="opt-price price-accent">${currencyBRL.format(current)}</span>` +
                        (discountPct > 0 ? ` <span class="discount-percent">-${discountPct}%</span>` : '');
      $a.html(`<span class="opt-name">${name}</span>${priceHtml}`);
    });
  }
  

  jQuery(function () {
    formatPackageDropdown();
    setupModalSanitizer();
  });

  const licenseKeyPromise = checkLicenseKey();

  function ajax(data) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: ajax_object.ajax_url,
        type: "POST",
        dataType: "json",
        data: {
          ...data,
          security: ajax_object.security,
        },
        success: function (json) {
          if (json.success) {
            resolve(json.data);
          } else {
            reject(json.data);
            displayErrorToast(json.data.message);
          }
        },
        error: function (_, _textStatus, errorThrown) {
          console.error("AJAX ERROR: ", _, _textStatus, errorThrown);
          reject(errorThrown);
          displayErrorToast(errorThrown.message);
        },
      });
    });
  }

  function ensureCartThenCheckout(nextUrl) {
    try {
      let data = {};
      try {
        const fd = window.flowCache?.get && flowCache.get('startFormData');
        if (fd) data = Object.fromEntries(fd.entries ? fd.entries() : fd);
      } catch(e){}

      const pid = jQuery('#productId').val() || jQuery('[name="product_id"]').val() || jQuery('[name="productId"]').val();
      const vid = jQuery('#variationId').val() || jQuery('[name="variation_id"]').val() || jQuery('[name="variationId"]').val();
      if (pid) { data.product_id = pid; data.productId = pid; }
      if (vid) { data.variation_id = vid; data.variationId = vid; }

      data.action = 'submit_to_cart';
      data.security = (window.ajax_object && ajax_object.security) || data.security;

      jQuery.ajax({
        url: ajax_object.ajax_url,
        type: 'POST',
        dataType: 'json',
        data,
        complete: function() {
          window.location.href = nextUrl || 'https://engajatop.com/finalizar-compra/';
        },
        error: function() {
          window.location.href = nextUrl || 'https://engajatop.com/finalizar-compra/';
        },
        success: function() { }
      });
    } catch(e) {
      window.location.href = nextUrl || 'https://engajatop.com/finalizar-compra/';
    }
  }

  $(document).on("click", "a", function (e) {
    const anchor = e.currentTarget;
    const source = anchor.href ? new URL(anchor.href).searchParams : null;
    if (!source) return;

    const variationId = source.get("variation_id");
    if (!variationId) return;

    e.preventDefault();

    requestAnimationFrame(async () => {
      const state = await licenseKeyPromise;
      const isValid = state.data?.valid;
      if (!isValid) {
        alert("Licença inválida ou expirada!");
        return;
      }

      const { html } = await ajax({
        action: "load_initial_modal",
        variation_id: variationId,
      });
      $("#modal-container").html(html).modal("show");
      sanitizeDashesIn(document.getElementById("modal-container"));
      fixValorTotalSeparators(document.getElementById("modal-container"));
      adjustPaymentModalUI(document.getElementById("modal-container"));
    });
  });

  $(document).on("submit", "#instagram-form", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    flowCache.set("startFormData", formData);
    console.log(
      "submitted",
      Array.from(formData),
      Object.fromEntries(formData)
    );
    if (formData.get("skip") === "false") {
      $("#modal-container").find("#instagram-form").hide();
      $("#modal-container").find("#instructions").show();
      $("#modal-container").find('input[name="skip"]').val("true");
      return;
    }

    const data = Object.fromEntries(formData.entries());

    $("[id^='continue-button-icon']").hide();
    $("[id^='continue-button-spinner']").show();

    try {
      const { html } = await ajax({
        action: "submit_to_cart",
        ...data,
      });

      $("#modal-container").html(html).modal("show");
      sanitizeDashesIn(document.getElementById("modal-container"));
      fixValorTotalSeparators(document.getElementById("modal-container"));
      adjustPaymentModalUI(document.getElementById("modal-container"));
    } finally {
      $("[id^='continue-button-icon']").show();
      $("[id^='continue-button-spinner']").hide();
    }
  });

  let loading = false;
  // bind load more listener in case it's curtidas
  $(document).on("click", "#load-more-posts", function () {
    if (loading) return;

    const data = Object.fromEntries(flowCache.get("startFormData"));

    const el = $(this);
    const originalContent = el.html();

    loading = true;
    el.html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
    );

    $.ajax({
      url: ajax_object.ajax_url,
      type: "POST",
      dataType: "json",
      data: {
        action: "load_more_posts",
        security: ajax_object.security,
        product_id: el.data("product"),
        end_cursor: el.data("cursor"),
        username: el.data("username") || data.username.toString(),
      },
      success: function (response) {
        loading = false;
        if (response.success) {
          $("#load-more-posts-target").replaceWith(response.data.html);
        } else {
          displayErrorToast(response.data.message);
        }
      },
      error: function (xhr, status, error) {
        loading = false;
        el.html(originalContent);
        alert("Erro ao processar a solicitação: " + error);
      },
    });
  });

  $(document).on("click", "#finish-action", function (e) {
    e.preventDefault();

    const isCurtidas = $(this).data("service-type") == "curtidas";
    const isVisualizacoes = $(this).data("service-type") == "visualizacoes";
    const shouldSaveSelectedPosts = isCurtidas || isVisualizacoes;

    const startLoading = () => {
      $(this).attr("disabled", "true");
      $(this).append(
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
      );
    };
    const endLoading = () => {
      $(this).removeAttr("disabled");
      $(this).find(".spinner-border").remove();
    };

    if (shouldSaveSelectedPosts) {
      const postsIds = Array.from($("[name='post']"), (it) => it.value);
      if (!postsIds.length) {
        return alert("Selecione pelo menos 1 post!");
      }

      startLoading();
      $.ajax({
        url: ajax_object.ajax_url,
        type: "POST",
        dataType: "json",
        data: {
          action: "save_selected_posts",
          security: ajax_object.security,
          product_id: $(this).data("product-id"),
          variation_id: $(this).data("variation-id"),
          posts_ids: postsIds,
        },
        success: function (json) {
          if (json.success) {
            $("#modal-container").find("#selectPostsModal")?.remove();
            $("#modal-container").append(json.data.html);
            sanitizeDashesIn(document.getElementById("modal-container"));
            fixValorTotalSeparators(document.getElementById("modal-container"));
            adjustPaymentModalUI(document.getElementById("modal-container"));

            // HANDLE CPF VISIBILITY (disabled in pre-checkout flow)
            if ($('#paymentModal').length && $('#paymentModal').is(':visible')) {
              $('#upgram-cpf').addClass('d-none').hide();
            } else {
              if ($('input[name="payment_method"][value="paghiper_pix"]').is(":checked")) {
                $("#upgram-cpf").removeClass("d-none");
              }
              $('input[name="payment_method"]').off('.upgramCpf').on('change.upgramCpf', function () {
                if ($(this).val() === "paghiper_pix" && $(this).is(":checked")) {
                  $("#upgram-cpf").removeClass("d-none");
                } else {
                  $("#upgram-cpf").addClass("d-none");
                }
              });
            }
          } else {
            displayErrorToast(json.data.message);
          }
          // processPayment('pix', endLoading);
        },
        error: function (xhr, status, error) {
          endLoading();
          alert("Erro ao processar a solicitação: " + error);
        },
      });
    }
    // senão, vai direto pro qrcode
    else {
      startLoading();
      processPayment(endLoading);
    }
  });

  $(".upgram-content-trigger").on("click", function () {
    const contentId = $(this).data("tab");
    $(".upgram-product-section").attr("data-state", "inactive");
    $(`#${contentId}`).attr("data-state", "active");

    $(".upgram-product-description-button").attr("data-state", "inactive");
    $(this).attr("data-state", "active");
  });

  $(".upgram-link-trigger").on("click", function () {
    const href = $(this).data("href");
    window.location.href = href;
  });

  $("#seguidoresMenu")
    .find("a")
    .click(function (e) {
      e.preventDefault();
      const item = $(this).data("item");
      const { current, discountPct } = computePriceMeta(item);
      const name = cleanName(item.name);

      window._upgramSelectedPrice = current;
      try { if (window.flowCache?.set) flowCache.set("selectedPrice", current); } catch(e){}

      $("#seguidoresText").html(
        `${name} <span class="price-accent"> ${currencyBRL.format(current)}</span>` +
        (discountPct > 0 ? ` <span class="discount-percent">-${discountPct}%</span>` : '')
      );
      $("#productId").val(item.product_id);
      $("#variationId").val(item.variation_id);

      // update description
      const container = $("#upgram-variation-description");
      const templateHtml = $("#upgram-variation-description-template").html();
      container.empty();
      const lines = item.description?.split("\n") ?? [];
      $.each(lines, function (_, line) {
        line = $.trim(line);
        if (!line) return;
        const element = $(templateHtml).clone();
        element.find("span").text(line);
        container.append(element);
      });
    });

  async function checkLicenseKey() {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: ajax_object.ajax_url,
        type: "POST",
        dataType: "json",
        data: {
          action: "check_license_key",
          security: ajax_object.security,
        },
        success: (data) => resolve(data),
        error: (_, t, e) => reject(e),
      });
    });
  }

  function processPayment(onError) {
    $.ajax({
      url: ajax_object.ajax_url,
      type: "POST",
      dataType: "json",
      data: {
        action: "process_payment",
        security: ajax_object.security,
        payment_method: $("#upgram-payment-method input:checked").val(),
        cpf: $("#upgram-cpf input").val(),
        email: $('.upgram-input input[name="email"]').val(),
        phone: $('.upgram-input input[name="phone"]').val(),
        create_account: $("#upgram-create-account input:checked").val(),
      },
      success: function (json) {
        if (json.success) {
          if (json.data.html) {
            $("#modal-container").html(json.data.html);
            sanitizeDashesIn(document.getElementById("modal-container"));
            fixValorTotalSeparators(document.getElementById("modal-container"));
            adjustPaymentModalUI(document.getElementById("modal-container"));
          } else {
            window.location.href = json.data.redirect_url;
          }
        } else {
          onError(json.data);
          displayErrorToast(json.data.message);
        }
      },
      error: function (xhr, status, error) {
        if (onError) onError(error);
        alert("Erro ao processar a solicitação: " + error);
      },
    });
  }

  $(document).on("click", "#instructions-back", function () {
    $("#modal-container").find('input[name="skip"]').val("false");
    $("#modal-container").find("#instructions").hide();
    $("#modal-container").find("#instagram-form").show();
  });

  $(document).on("click", "#back-to-start", function () {
    $("#modal-container").find("#paymentModal")?.remove();
    $("#modal-container").find("#selectPostsModal")?.remove();

    $("#modal-container").find("#initialModal").show();
  });

  $(document).on("click", "#upgram-coupon-button", function () {
    const showed = $("#couponForm").length;
    console.log("showed", showed);
    if (showed) return;

    const html = $("#template-coupon").html();
    $(this).after(html);

    $("#couponForm").on("submit", function (event) {
      event.preventDefault();
      const couponCode = $("#couponInput").val();

      if (couponCode.trim() === "") {
        alert("Por favor, insira um código de cupom.");
        return;
      }

      $.ajax({
        url: ajax_object.ajax_url,
        type: "POST",
        dataType: "json",
        data: {
          action: "validate_coupon",
          security: ajax_object.security,
          coupon_code: couponCode,
        },
        success: function (response) {
          if (response.success) {
            $("#upgram-coupon-placeholder").text(couponCode.toUpperCase());

            const discounted = toNumber(response.data.discounted_total);
            const discountAmount = toNumber(response.data.discount_amount);
            window._upgramCoupon = { applied: true, discountedTotal: discounted, discountAmount };

            const el = document.getElementById("totalValue");
            if (el && !Number.isNaN(discounted)) {
              el.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discounted);
            }

            document.getElementById("couponMessage").innerHTML =
              "Cupom aplicado com sucesso, seu desconto foi de " +
              `<span>- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}</span>`;
          } else {
            document.getElementById("couponMessage").innerText = response.data.message;
          }
        },
        error: function (xhr, status, error) {
          alert("Erro ao processar a solicitação: " + error);
        },
      });
    });
  });

  function displayErrorToast(message) {
    $("#errorToast .toast-body").text(message);
    $("#upgram-toast-container").show();

    const toastElement = new bootstrap.Toast($("#errorToast")[0]);
    toastElement.show();

    $("#errorToast").on("hidden.bs.toast", function () {
      $("#upgram-toast-container").hide();
    });
  }
  function displaySuccessToast(message) {
    $("#successToast .toast-body").text(message);
    $("#upgram-toast-container").show();

    const toastElement = new bootstrap.Toast($("#successToast")[0]);
    toastElement.show();

    $("#successToast").on("hidden.bs.toast", function () {
      $("#upgram-toast-container").hide();
    });
  }

  window.resendOrderItem = async function resendOrderItem(
    orderId,
    itemId,
    onStart,
    onFinish
  ) {
    onStart();
    try {
      const { html } = await ajax({
        action: "resend_order_item",
        order_id: orderId,
        item_id: itemId,
      });
      $(`#order-${orderId}`).replaceWith(html);
      displaySuccessToast("Reenviado!");
    } finally {
      onFinish();
    }
  };
});

function verifyPayment(orderId, intervalId) {
  const $ = jQuery;
  $.ajax({
    url: ajax_object.ajax_url,
    type: "POST",
    dataType: "json",
    data: {
      action: "verify_payment",
      security: ajax_object.security,
      order_id: orderId,
    },
    success: function (response) {
      if (response.success) {
        const isPaid = response.data.is_paid;
        if (isPaid) {
          clearInterval(intervalId);
          loadSuccessModal(orderId);
        }
      } else {
        alert("Erro ao processar o pagamento: " + response.data.message);
      }
    },
    error: function (xhr, status, error) {
      alert("Erro ao processar a solicitação: " + error);
    },
  });
}

function loadSuccessModal(orderId) {
  const $ = jQuery;
  $.ajax({
    url: ajax_object.ajax_url,
    type: "POST",
    dataType: "json",
    data: {
      action: "load_success_modal",
      security: ajax_object.security,
      order_id: orderId,
    },
    success: function (response) {
      if (response.success) {
        $("#modal-container").html(response.data.html).modal("show");
        sanitizeDashesIn(document.getElementById("modal-container"));
        fixValorTotalSeparators(document.getElementById("modal-container"));
        adjustPaymentModalUI(document.getElementById("modal-container"));
      }
    },
  });
}

function copiarPix(qrCode) {
  navigator.clipboard.writeText(qrCode).then(() => alert("Pix copiado!"));
}

const masks = {
  cpf(input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = value;
  },
};

(function(){
  try {
    const path = (location.pathname || '');
    if (!/finalizar-compra|checkout/i.test(path)) return;
    const raw = localStorage.getItem('upgram_contact');
    if (!raw) return;
    const { email, phone, ts } = JSON.parse(raw) || {};
    if (email) jQuery('#billing_email, [name="billing_email"]').val(email).trigger('change');
    if (phone) jQuery('#billing_phone, [name="billing_phone"]').val(phone).trigger('change');
    if (ts && Date.now() - ts > 5*60*1000) localStorage.removeItem('upgram_contact');
  } catch(e){}
})();
