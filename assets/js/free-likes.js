jQuery(document).ready(function ($) {
  function freeLikesRequest(form) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: ajax_object.ajax_url,
        method: "POST",
        data: {
          action: "free_likes_receive",
          ...Object.fromEntries(form)
        },
        success: function (html) {
          $("#modal-container").html(html).modal("show");
          resolve();
        },
        error: function (response) {
          const error = new Error(JSON.parse(response.responseText).message);
          reject(error);
        },
      });
    });
  }

  $("#freeLikesForm").on("submit", function (e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const $button = $(this).find('button[type="submit"]');
    const $spinner = $button.find(".spinner-border");
    $button.prop("disabled", true);
    $spinner.show();

    freeLikesRequest(form)
      .catch((error) => alert(error.message))
      .finally(() => {
        $button.prop("disabled", false);
        $spinner.hide();
      });
  });
});
