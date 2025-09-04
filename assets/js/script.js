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

      $("#modal-container").find("#instructions")?.hide();
      $("#modal-container").find("#initialModal").hide();
      $("#modal-container").find("#instagram-form").show(); // undo hide if not skip before
      $("#modal-container").append(html);

      // HANDLE CPF VISIBILITY
      if (
        $('input[name="payment_method"][value="paghiper_pix"]').is(":checked")
      ) {
        $("#upgram-cpf").removeClass("d-none");
      }
      $('input[name="payment_method"]').change(function () {
        if ($(this).val() === "paghiper_pix" && $(this).is(":checked")) {
          $("#upgram-cpf").removeClass("d-none");
        } else {
          $("#upgram-cpf").addClass("d-none");
        }
      });
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

            // HANDLE CPF VISIBILITY
            if (
              $('input[name="payment_method"][value="paghiper_pix"]').is(
                ":checked"
              )
            ) {
              $("#upgram-cpf").removeClass("d-none");
            }
            $('input[name="payment_method"]').change(function () {
              if ($(this).val() === "paghiper_pix" && $(this).is(":checked")) {
                $("#upgram-cpf").removeClass("d-none");
              } else {
                $("#upgram-cpf").addClass("d-none");
              }
            });
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
      $("#seguidoresText").html(
        item.name +
          `<span class="purple"> ${Number(item.price).toLocaleString([], {
            style: "currency",
            currency: "BRL",
          })}</span>`
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
            // Atualiza o valor total no frontend
            document.getElementById("totalValue").innerText =
              "R$" + response.data.discounted_total;
            // Exibe a mensagem de sucesso
            document.getElementById("couponMessage").innerHTML =
              "Cupom aplicado com sucesso, seu desconto foi de " +
              `<span>- R$ ${response.data.discount_amount}</span>`;
          } else {
            // Exibe a mensagem de erro
            document.getElementById("couponMessage").innerText =
              response.data.message;
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
