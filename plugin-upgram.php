<?php

/**
 * Plugin Name: Checkout WooCommerce Personalizado - SmmLoja
 * Description: Plugin Checkout WooCommerce Personalizado - SmmLoja para comprar seguidores no Instagram e outros produtos digitais.
 * Version: 1.26.0
 * Requires Plugins: woocommerce, customer-reviews-woocommerce
 */


if (!defined('ABSPATH')) {
    exit; // Sair se acessado diretamente
}

define('UPGRAM_PATH', plugin_dir_path(__FILE__));
define('UPGRAM_URL', plugin_dir_url(__FILE__));
define('UPGRAM_VERSION', '1.26.0');
define('INSTAGRAM_API_URL', 'https://social-api4.p.rapidapi.com');
define('TIKTOK_API_URL', 'https://tiktok-video-downloader-api.p.rapidapi.com');


require_once UPGRAM_PATH . 'admin/settings-page.php';
require_once UPGRAM_PATH . 'includes/actions.php';
require_once UPGRAM_PATH . 'includes/instagram.php';
require_once UPGRAM_PATH . 'includes/woocommerce.php';
require_once UPGRAM_PATH . 'includes/downloader.php';
require_once UPGRAM_PATH . 'includes/free-followers.php';
require_once UPGRAM_PATH . 'includes/free-views.php';
require_once UPGRAM_PATH . 'includes/free-likes.php';
require_once UPGRAM_PATH . 'includes/express-checkout.php';
require_once UPGRAM_PATH . 'public/shortcodes.php';

function upgram_scripts()
{
    wp_enqueue_style('google-fonts-manrope', 'https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap', false);
    wp_enqueue_style('google-fonts-montserrat', 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap', false);
    wp_enqueue_style('upgram-style', plugins_url('assets/css/style.css', __FILE__), array(), UPGRAM_VERSION);
    wp_enqueue_style('upgram-orders-style', plugins_url('assets/css/orders.style.css', __FILE__), array(), UPGRAM_VERSION);
    wp_enqueue_style('bootstrap-icons', 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css');
    wp_enqueue_style('bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css', array(), '5.0.2');
    wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js', array('jquery'), '5.0.2', ['strategy' => 'defer']);
    wp_enqueue_script('upgram-script', plugins_url('assets/js/script.js', __FILE__), array('jquery'), UPGRAM_VERSION, ['strategy' => 'defer', 'in_footer' => true]);
    wp_enqueue_script(
        'upgram-express-checkout',
        plugins_url('assets/js/express-checkout.js', __FILE__),
        array('jquery', 'upgram-script'),
        UPGRAM_VERSION,
        ['strategy' => 'defer', 'in_footer' => true]
    );
    wp_localize_script(
        'upgram-script',
        'ajax_object',
        ['ajax_url' => admin_url('admin-ajax.php'), 'security' => wp_create_nonce('upgram_nonce')]
    );
    wp_enqueue_script(
        'alpine-js',
        'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
        [],
        null,
        ['strategy' => 'defer']
    );

    // $image_url = plugins_url('/assets/images/arrow.svg', __FILE__);
    // $custom_css = "
    //         .upgram-input textarea::-webkit-resizer {
    //             background-image: url('{$image_url}');
    //         }
    //     ";
    // wp_add_inline_style('upgram-style', $custom_css);
}
add_action('wp_enqueue_scripts', 'upgram_scripts');

function upgram_admin_scripts()
{
    wp_enqueue_script(
        'alpine-js',
        'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
        [],
        null,
        true
    );
}
add_action('admin_enqueue_scripts', 'upgram_admin_scripts');

add_action('init', 'start_session', 1);
function start_session()
{
    if (!session_id()) {
        session_start();
    }
}
