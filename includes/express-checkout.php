<?php
if (!defined('ABSPATH')) exit;

add_action('wp_ajax_upgram_express_stripe', 'upgram_express_stripe');
add_action('wp_ajax_nopriv_upgram_express_stripe', 'upgram_express_stripe');

function upgram_express_stripe() {
  check_ajax_referer('upgram_nonce', 'security');
  
  try {
    $product_id = absint($_POST['product_id'] ?? 0);
    $variation_id = absint($_POST['variation_id'] ?? 0);
    $email = sanitize_email($_POST['email'] ?? '');
    $phone = sanitize_text_field($_POST['phone'] ?? '');
    $cpf = sanitize_text_field($_POST['cpf'] ?? '');
    $payment_method_id = sanitize_text_field($_POST['payment_method_id'] ?? '');
    
    $order = wc_create_order();
    
    if ($variation_id) {
      $order->add_product(wc_get_product($variation_id), 1);
    } elseif ($product_id) {
      $order->add_product(wc_get_product($product_id), 1);
    }
    
    if ($email) $order->set_billing_email($email);
    if ($phone) $order->set_billing_phone($phone);
    if ($cpf) $order->update_meta_data('_billing_cpf', $cpf);
    
    $order->calculate_totals();
    $order->save();
    
    $gateways = WC()->payment_gateways()->get_available_payment_gateways();
    $stripe = $gateways['stripe'] ?? $gateways['woocommerce_payments'] ?? null;
    
    if (!$stripe) {
      wp_send_json_error(['message' => 'Gateway Stripe/WooPayments indisponível.']);
    }
    
    $order->set_payment_method($stripe->id);
    $order->save();
    
    $result = $stripe->process_payment($order->get_id());
    
    if (!empty($result['result']) && 'success' === $result['result']) {
      wp_send_json_success([
        'redirect_url' => $result['redirect'] ?? '',
        'client_secret' => $result['client_secret'] ?? '',
        'order_id' => $order->get_id()
      ]);
    }
    
    wp_send_json_error(['message' => 'Não foi possível iniciar o pagamento.']);
    
  } catch (\Throwable $e) {
    wp_send_json_error(['message' => $e->getMessage()]);
  }
}

add_action('wp_ajax_upgram_express_paypal_create', 'upgram_express_paypal_create');
add_action('wp_ajax_nopriv_upgram_express_paypal_create', 'upgram_express_paypal_create');

function upgram_express_paypal_create(){
  check_ajax_referer('upgram_nonce', 'security');
  
  try {
    $product_id = absint($_POST['product_id'] ?? 0);
    $variation_id = absint($_POST['variation_id'] ?? 0);
    $email = sanitize_email($_POST['email'] ?? '');
    $phone = sanitize_text_field($_POST['phone'] ?? '');
    
    $order = wc_create_order();
    
    if ($variation_id) {
      $order->add_product(wc_get_product($variation_id), 1);
    } elseif ($product_id) {
      $order->add_product(wc_get_product($product_id), 1);
    }
    
    if ($email) $order->set_billing_email($email);
    if ($phone) $order->set_billing_phone($phone);
    
    $order->calculate_totals();
    $order->save();
    
    $gateways = WC()->payment_gateways()->get_available_payment_gateways();
    $paypal = $gateways['ppcp-gateway'] ?? $gateways['paypal'] ?? null;
    
    if (!$paypal) {
      wp_send_json_error(['message'=>'Gateway PayPal indisponível.']);
    }
    
    $order->set_payment_method($paypal->id);
    $order->save();
    
    $result = $paypal->process_payment($order->get_id());
    
    if (!empty($result['result']) && 'success' === $result['result']) {
      wp_send_json_success([
        'order_id' => $result['paypal_order_id'] ?? $order->get_id(), 
        'redirect_url' => $result['redirect'] ?? ''
      ]);
    }
    
    wp_send_json_error(['message'=>'Falha ao iniciar PayPal.']);
    
  } catch (\Throwable $e) { 
    wp_send_json_error(['message'=>$e->getMessage()]); 
  }
}

add_action('wp_ajax_upgram_express_paypal_capture', 'upgram_express_paypal_capture');
add_action('wp_ajax_nopriv_upgram_express_paypal_capture', 'upgram_express_paypal_capture');

function upgram_express_paypal_capture(){
  check_ajax_referer('upgram_nonce', 'security');
  
  try {
    $paypal_order_id = sanitize_text_field($_POST['order_id'] ?? '');
    
    wp_send_json_success([
      'redirect_url' => wc_get_endpoint_url('order-received', '', wc_get_page_permalink('checkout'))
    ]);
    
  } catch (\Throwable $e) { 
    wp_send_json_error(['message'=>$e->getMessage()]); 
  }
}
