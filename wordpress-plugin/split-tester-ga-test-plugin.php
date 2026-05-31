<?php
/**
 * Plugin Name: Split Tester GA Test Plugin
 * Description: Local test plugin for the split tester client package.
 * Version: 0.1.0
 * Author: Copilot
 */

if (!defined('ABSPATH')) {
    exit;
}

function split_tester_ga_test_register_shortcode() {
    add_shortcode('split_tester_demo', 'split_tester_ga_test_shortcode');
}
add_action('init', 'split_tester_ga_test_register_shortcode');

function split_tester_ga_test_enqueue_assets() {
    wp_register_script(
        'split-tester-ga-test-frontend',
        plugin_dir_url(__FILE__) . 'build/frontend.js',
        array(),
        '0.1.0',
        true
    );

    wp_enqueue_script('split-tester-ga-test-frontend');

    wp_localize_script('split-tester-ga-test-frontend', 'SplitTesterGaTest', array(
        'userTier' => isset($_GET['tier']) ? sanitize_text_field(wp_unslash($_GET['tier'])) : 'free',
        'pathname' => wp_parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'
    ));
}
add_action('wp_enqueue_scripts', 'split_tester_ga_test_enqueue_assets');

function split_tester_ga_test_shortcode($atts = array()) {
    $atts = shortcode_atts(
        array(
            'title' => 'Split Tester Demo'
        ),
        $atts,
        'split_tester_demo'
    );

    return sprintf(
        '<div class="split-tester-ga-test"><h3>%s</h3><div id="split-tester-ga-test-root"></div></div>',
        esc_html($atts['title'])
    );
}
