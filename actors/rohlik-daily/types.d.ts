import type { ProxyConfiguration } from "apify";

export interface CloudflareUnblockerOptions {
  proxyConfiguration: ProxyConfiguration;
  unblockUrl: string;
}
