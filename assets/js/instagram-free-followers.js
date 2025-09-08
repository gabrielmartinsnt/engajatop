jQuery(document).ready(function ($) {
  function freeFollowersGetProfile(form) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: ajax_object.ajax_url,
        method: "POST",
        data: {
          action: "free_followers_get_profile",
          ...Object.fromEntries(form),
        },
        success: function (html) {
          $("#modal-container").html(html).modal("show");
          if (window.sanitizeDashesIn) sanitizeDashesIn(document.getElementById("modal-container"));
          resolve();
        },
        error: function (response) {
          const error = new Error(JSON.parse(response.responseText).message);
          reject(error);
        },
      });
    });
  }
  function freeFollowersConfirm(username) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: ajax_object.ajax_url,
        method: "POST",
        data: {
          action: "free_followers_confirm",
          username: username,
        },
        success: function (html) {
          $("#modal-container").html(html).modal("show");
          if (window.sanitizeDashesIn) sanitizeDashesIn(document.getElementById("modal-container"));
          resolve();
        },
        error: function (response) {
          const error = new Error(JSON.parse(response.responseText).message);
          reject(error);
        },
      });
    });
  }

  $("#freeFollowersForm").on("submit", function (e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const $button = $(this).find('button[type="submit"]');
    const $spinner = $button.find(".spinner-border");
    $button.prop("disabled", true);
    $spinner.show();

    freeFollowersGetProfile(form)
      .catch((error) => alert(error.message))
      .finally(() => {
        $button.prop("disabled", false);
        $spinner.hide();
      });
  });
  $(document).on("submit", "#freeFollowersConfirmForm", function (e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const $button = $(this).find('button[type="submit"]');
    const $spinner = $button.find(".spinner-border");
    $button.prop("disabled", true);
    $spinner.show();

    freeFollowersConfirm(form.get("username"))
      .catch((error) => alert(error.message))
      .finally(() => {
        $button.prop("disabled", false);
        $spinner.hide();
      });
  });
});
