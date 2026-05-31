# Split Tester GA Test Plugin

Tiny local WordPress plugin for testing `@pattonwebz/split-tester-client`.

## Install

1. Copy this folder into `wp-content/plugins/`.
2. Run:

```bash
npm install
npm run build
```

## Use

Activate the plugin and place this shortcode on a page:

```text
[split_tester_demo title="Split Tester Demo"]
```

The plugin also auto-enqueues its front-end bundle so you can test on any page.
